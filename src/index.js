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
const { getActiveProducts } = require("./database/products");
const { createQrisTransaction } = require("./utils/tripay");
const {
  createTransaction,
  getTransactionByRef,
} = require("./database/transactions");
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
    // Slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command)
        return console.error(
          `No command matching ${interaction.commandName} found.`,
        );
      await command.execute(interaction);
    }

    // Button interaction (Buy Now)
    else if (
      interaction.isButton() &&
      interaction.customId.startsWith("buy_")
    ) {
      await interaction.deferReply({ ephemeral: true });
      const products = await getActiveProducts();

      if (!products?.length) {
        const embed = new EmbedBuilder()
          .setColor(0x95a5a6) // abu-abu
          .setTitle("📦 Produk Belum Tersedia")
          .setDescription(
            "Saat ini **belum ada produk** yang tersedia untuk dibeli.\n\n" +
              "Silakan hubungi **staff** untuk informasi jadwal atau pembaruan produk.",
          )
          .setFooter({
            text: "Terima kasih atas pengertiannya 🙏",
          })
          .setTimestamp();

        return await interaction.editReply({
          embeds: [embed],
        });
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

      await interaction.editReply({
        content: "🛒 **Silakan pilih produk:**",
        components: [row],
      });
    }

    // String select menu interaction (Product select)
    else if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "select_product"
    ) {
      const productId = interaction.values[0];
      const products = await getActiveProducts();
      const product = products.find((p) => String(p.id) === String(productId));

      if (!product || product.stock <= 0) {
        const embed = new EmbedBuilder()
          .setColor(0xe74c3c) // merah
          .setTitle("❌ Produk Tidak Tersedia")
          .setDescription(
            "Produk yang kamu pilih **tidak tersedia** atau **stok telah habis**.\n\n" +
              "Silakan hubungi **staff** untuk informasi lebih lanjut.",
          )
          .setFooter({
            text: "Jika kamu yakin ini kesalahan, segera hubungi staff",
          })
          .setTimestamp();

        return interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });
      }

      // ⏳ WAJIB: kasih sinyal ke Discord dulu
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
            `💰 Harga: Rp ${Number(product.price).toLocaleString("id-ID")}\n` +
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

        // Kalau sudah defer, pakai editReply
        await interaction.editReply({
          content: "❌ Terjadi kesalahan saat membuat QRIS.",
          components: [],
        });
      }
    }

    // Button interaction (Check Pembayaran)
    else if (
      interaction.isButton() &&
      interaction.customId.startsWith("check_payment_")
    ) {
      await interaction.deferReply({ ephemeral: true });

      const merchantRef = interaction.customId.replace("check_payment_", "");

      const trx = await getTransactionByRef(merchantRef);

      if (!trx) {
        return interaction.editReply({
          content: "❌ Transaksi tidak ditemukan.",
        });
      }

      if (trx.status === "UNPAID") {
        const unpaidEmbed = new EmbedBuilder()
          .setColor(0xf1c40f) // kuning
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
          .setColor(0x2ecc71) // hijau
          .setTitle("✅ Pembayaran Berhasil")
          .setDescription(
            "Pembayaran kamu telah **berhasil kami terima** 🎉\n\n" +
              "Silakan cek **DM dari bot** untuk informasi lanjutan.",
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
          .setFooter({
            text: "Terima kasih telah bertransaksi 🙏",
          })
          .setTimestamp();

        return interaction.editReply({ embeds: [paidEmbed] });
      }

      // fallback (jaga-jaga)
      return interaction.editReply({
        content: "⚠️ Status transaksi tidak dikenali.",
      });
    }
  } catch (err) {
    console.error("[INTERACTION_ERROR]", err);
    if (!interaction.replied) {
      await interaction.reply({
        content: "❌ Terjadi kesalahan.",
        ephemeral: true,
      });
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
