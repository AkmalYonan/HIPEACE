// Required modules
const fs = require("node:fs");
const path = require("node:path");
const {
  Events,
  Collection,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { token } = require("./config/config.json");
const {
  getActiveProducts,
  getActiveProductsByCategory,
  getProductById,
} = require("./database/products");
const { createQrisTransaction } = require("./utils/tripay");
const {
  createTransaction,
  getTransactionByRef,
} = require("./database/transactions");
const { buildShopMessage } = require("./utils/shopEmbed");
const client = require("./core/client");
const { startWebhook } = require("./webhook");

// Load commands
client.commands = new Collection();
const commandFolders = fs.readdirSync(path.join(__dirname, "commands"));
commandFolders.forEach((folder) => {
  const commandFiles = fs
    .readdirSync(path.join(__dirname, "commands", folder))
    .filter((file) => file.endsWith(".js"));
  commandFiles.forEach((file) => {
    const command = require(path.join(__dirname, "commands", folder, file));
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.warn(
        `[WARNING] Command ${file} missing "data" or "execute" property.`,
      );
    }
  });
});

// Ready event
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Ready! Logged in as ${c.user.tag}`);
  startWebhook();
});

// Unified interactionCreate handler
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // ─── AUTOCOMPLETE ──────────────────────────────────────────
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (command && typeof command.autocomplete === "function") {
        await command.autocomplete(interaction);
      }
      return;
    }

    // ─── SLASH COMMANDS ────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        return console.error(
          `No command matching ${interaction.commandName} found.`,
        );
      }
      await command.execute(interaction);
      return;
    }

    // ─── BUTTON INTERACTIONS ───────────────────────────────────
    if (interaction.isButton()) {
      const customId = interaction.customId;

      // 🔄 SHOP PAGINATION & LIVE REFRESH (In-Place Update)
      if (
        customId.startsWith("shop_prev_") ||
        customId.startsWith("shop_next_") ||
        customId.startsWith("shop_refresh_")
      ) {
        const parts = customId.split("_");
        // parts: ['shop', 'prev'|'next'|'refresh', categoryId, currentPage]
        const action = parts[1];
        const categoryId = parseInt(parts[2], 10);
        let targetPage = parseInt(parts[3], 10) || 1;

        if (action === "prev") targetPage = Math.max(1, targetPage - 1);
        if (action === "next") targetPage = targetPage + 1;

        const shopData = await buildShopMessage(categoryId, targetPage);

        await interaction.update({
          embeds: shopData.embeds,
          components: shopData.components,
        });
        return;
      }

      // 🛒 BUY BUTTON FOR SPECIFIC CATEGORY
      if (customId.startsWith("buy_cat_")) {
        await interaction.deferReply({ ephemeral: true });

        const parts = customId.split("_");
        const categoryId = parseInt(parts[2], 10);

        const products = await getActiveProductsByCategory(categoryId);
        const availableProducts = products.filter((p) => p.stock > 0);

        if (!availableProducts.length) {
          const emptyEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("📦 Produk Belum Tersedia")
            .setDescription(
              "Maaf, saat ini **stok produk pada kategori ini sedang habis**.\n\n" +
                "Silakan hubungi staff atau coba cek kategori lainnya.",
            )
            .setFooter({ text: "Gunakan tombol Refresh untuk memeriksa ulang stok" })
            .setTimestamp();

          return await interaction.editReply({ embeds: [emptyEmbed] });
        }

        const options = availableProducts.map((p) => ({
          label: p.name,
          description: `Rp ${Number(p.price).toLocaleString("id-ID")} | Stok: ${p.stock}`,
          value: String(p.id),
        }));

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("select_product")
            .setPlaceholder("🛒 Pilih produk yang ingin dibeli")
            .addOptions(options),
        );

        return await interaction.editReply({
          content: "🛒 **Silakan pilih produk yang ingin Anda beli:**",
          components: [row],
        });
      }

      // 🛒 LEGACY BUY BUTTON (All Active Products)
      if (customId.startsWith("buy_")) {
        await interaction.deferReply({ ephemeral: true });
        const products = await getActiveProducts();

        if (!products?.length) {
          const embed = new EmbedBuilder()
            .setColor(0x95a5a6)
            .setTitle("📦 Produk Belum Tersedia")
            .setDescription(
              "Saat ini **belum ada produk** yang tersedia untuk dibeli.\n\n" +
                "Silakan hubungi **staff** untuk informasi jadwal atau pembaruan produk.",
            )
            .setFooter({ text: "Terima kasih atas pengertiannya 🙏" })
            .setTimestamp();

          return await interaction.editReply({ embeds: [embed] });
        }

        const options = products.map((p) => ({
          label: p.name,
          description:
            p.stock > 0
              ? `Rp ${Number(p.price).toLocaleString("id-ID")} | Stok: ${p.stock}`
              : "❌ Stok Habis",
          value: String(p.id),
          disabled: p.stock <= 0,
        }));

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("select_product")
            .setPlaceholder("🛒 Pilih produk")
            .addOptions(options),
        );

        return await interaction.editReply({
          content: "🛒 **Silakan pilih produk:**",
          components: [row],
        });
      }

      // 🔍 CHECK PEMBAYARAN BUTTON
      if (customId.startsWith("check_payment_")) {
        await interaction.deferReply({ ephemeral: true });

        const merchantRef = customId.replace("check_payment_", "");
        const trx = await getTransactionByRef(merchantRef);

        if (!trx) {
          return interaction.editReply({
            content: "❌ Transaksi tidak ditemukan di database.",
          });
        }

        if (trx.status === "UNPAID") {
          const unpaidEmbed = new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle("⏳ Pembayaran Belum Diterima")
            .setDescription(
              "Kami belum menerima pembayaran untuk transaksi ini.\n\n" +
                "Silakan selesaikan pembayaran terlebih dahulu menggunakan QRIS yang tersedia.",
            )
            .addFields(
              {
                name: "🧾 Reference",
                value: `\`${trx.merchant_ref}\``,
                inline: false,
              },
              {
                name: "💰 Total",
                value: `Rp ${Number(trx.amount).toLocaleString("id-ID")}`,
                inline: true,
              },
              {
                name: "📌 Status",
                value: "UNPAID",
                inline: true,
              },
            )
            .setFooter({
              text: "Setelah membayar, klik kembali tombol Check Pembayaran",
            })
            .setTimestamp();

          return interaction.editReply({ embeds: [unpaidEmbed] });
        }

        if (trx.status === "PAID") {
          const paidEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("✅ Pembayaran Berhasil")
            .setDescription(
              "Pembayaran kamu telah **berhasil kami terima** 🎉\n\n" +
                "Silakan cek **DM dari bot** untuk informasi lanjutan & pengiriman pesanan.",
            )
            .addFields(
              {
                name: "🧾 Reference",
                value: `\`${trx.merchant_ref}\``,
                inline: false,
              },
              {
                name: "💰 Total Dibayar",
                value: `Rp ${Number(trx.amount).toLocaleString("id-ID")}`,
                inline: true,
              },
              {
                name: "📌 Status",
                value: "PAID",
                inline: true,
              },
            )
            .setFooter({ text: "Terima kasih telah bertransaksi 🙏" })
            .setTimestamp();

          return interaction.editReply({ embeds: [paidEmbed] });
        }

        return interaction.editReply({
          content: `⚠️ Status transaksi saat ini: **${trx.status}**`,
        });
      }
    }

    // ─── STRING SELECT MENU INTERACTIONS ─────────────────────────
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "select_product") {
        const productId = interaction.values[0];
        const product = await getProductById(productId);

        if (!product || product.stock <= 0) {
          const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("❌ Produk Tidak Tersedia")
            .setDescription(
              "Produk yang kamu pilih **tidak tersedia** atau **stok telah habis**.\n\n" +
                "Silakan hubungi **staff** untuk informasi lebih lanjut.",
            )
            .setFooter({
              text: "Jika kamu yakin ini kesalahan, segera hubungi staff",
            })
            .setTimestamp();

          if (interaction.deferred || interaction.replied) {
            return await interaction.editReply({
              embeds: [embed],
              components: [],
            });
          }
          return await interaction.reply({
            embeds: [embed],
            ephemeral: true,
          });
        }

        await interaction.deferUpdate();

        try {
          const transaction = await createQrisTransaction(
            product,
            interaction.user.tag,
          );

          // SIMPAN TRANSAKSI AWAL (UNPAID)
          await createTransaction({
            user_id: interaction.user.id,
            product_id: product.id,
            merchant_ref: transaction.merchant_ref,
            amount: transaction.amount,
            status: "UNPAID",
          });

          const qrisImageUrl = transaction.qr_url;
          const paymentLink = transaction.checkout_url;
          const checkPaymentButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`check_payment_${transaction.merchant_ref}`)
              .setLabel("🔍 Check Pembayaran")
              .setStyle(ButtonStyle.Primary),
          );

          await interaction.editReply({
            content:
              `✅ **${product.name}** dipilih\n\n` +
              `💰 Harga: **Rp ${Number(product.price).toLocaleString("id-ID")}**\n` +
              `🔗 Link Pembayaran (Backup): ${paymentLink}\n\n` +
              `Silakan scan QRIS di bawah untuk membayar.\n` +
              `Setelah membayar, klik **Check Pembayaran** 👇`,
            components: [checkPaymentButton],
            files: [
              {
                attachment: qrisImageUrl,
                name: "qris.png",
              },
            ],
          });

          console.log(
            `[QRIS GENERATED] User: ${interaction.user.tag} | Product: ${product.name} | Ref: ${transaction.merchant_ref}`,
          );
        } catch (err) {
          console.error("[QRIS ERROR]", err);
          await interaction.editReply({
            content: "❌ Terjadi kesalahan saat membuat QRIS.",
            components: [],
          });
        }
      }
    }
  } catch (err) {
    console.error("[INTERACTION_ERROR]", err);
    const errorMsg = "❌ Terjadi kesalahan saat memproses permintaan.";
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: errorMsg, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: errorMsg, ephemeral: true }).catch(() => {});
    }
  }
});

// Global error handlers
process.on("unhandledRejection", (reason) =>
  console.error("[UNHANDLED REJECTION]", reason),
);
process.on("uncaughtException", (err) =>
  console.error("[UNCAUGHT EXCEPTION]", err),
);

// Login
client.login(token);
