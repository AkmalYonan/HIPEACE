const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const {
  createProduct,
  getProductById,
  getAllProducts,
  updateProduct,
  deleteProduct,
  updateStock,
} = require("../../database/products");
const { getActiveCategories } = require("../../database/categories");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("product")
    .setDescription("Kelola produk toko")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // ─── ADD ───
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Tambah produk baru")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Nama produk").setRequired(true),
        )
        .addNumberOption((opt) =>
          opt.setName("price").setDescription("Harga (Rp)").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt.setName("stock").setDescription("Stok awal").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("category_id")
            .setDescription("ID kategori")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("description")
            .setDescription("Deskripsi produk (opsional)")
            .setRequired(false),
        ),
    )

    // ─── EDIT ───
    .addSubcommand((sub) =>
      sub
        .setName("edit")
        .setDescription("Edit produk yang ada")
        .addIntegerOption((opt) =>
          opt.setName("id").setDescription("ID produk").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Nama baru").setRequired(false),
        )
        .addNumberOption((opt) =>
          opt
            .setName("price")
            .setDescription("Harga baru (Rp)")
            .setRequired(false),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("stock")
            .setDescription("Stok baru (set langsung)")
            .setRequired(false),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("category_id")
            .setDescription("ID kategori baru")
            .setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName("description")
            .setDescription("Deskripsi baru")
            .setRequired(false),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("active")
            .setDescription("Status aktif (1=aktif, 0=nonaktif)")
            .setRequired(false)
            .addChoices(
              { name: "1 — Aktif", value: 1 },
              { name: "0 — Nonaktif", value: 0 },
            ),
        ),
    )

    // ─── DELETE ───
    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Hapus produk")
        .addIntegerOption((opt) =>
          opt.setName("id").setDescription("ID produk").setRequired(true),
        ),
    )

    // ─── LIST ───
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("Lihat semua produk"),
    )

    // ─── STOCK ───
    .addSubcommand((sub) =>
      sub
        .setName("stock")
        .setDescription(
          "Tambah/kurangi stok produk (gunakan angka negatif untuk kurangi)",
        )
        .addIntegerOption((opt) =>
          opt.setName("id").setDescription("ID produk").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("delta")
            .setDescription("Jumlah yang ditambah/dikurangi (e.g. +5 atau -3)")
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();

    // ─────────────────────────────────────────────────────────────
    // ADD
    // ─────────────────────────────────────────────────────────────
    if (sub === "add") {
      const name = interaction.options.getString("name");
      const price = interaction.options.getNumber("price");
      const stock = interaction.options.getInteger("stock");
      const category_id = interaction.options.getInteger("category_id");
      const description = interaction.options.getString("description") || null;

      const newId = await createProduct({
        name,
        price,
        stock,
        category_id,
        description,
      });

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("✅ Produk Berhasil Ditambahkan")
        .addFields(
          { name: "🆔 ID", value: `\`${newId}\``, inline: true },
          { name: "📦 Nama", value: name, inline: true },
          {
            name: "💰 Harga",
            value: `Rp ${Number(price).toLocaleString("id-ID")}`,
            inline: true,
          },
          { name: "📊 Stok", value: `${stock}`, inline: true },
          {
            name: "📂 Kategori",
            value: `ID: \`${category_id}\``,
            inline: true,
          },
          {
            name: "📝 Deskripsi",
            value: description || "_tidak ada_",
            inline: false,
          },
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────────────────────────
    // EDIT
    // ─────────────────────────────────────────────────────────────
    if (sub === "edit") {
      const id = interaction.options.getInteger("id");
      const name = interaction.options.getString("name");
      const price = interaction.options.getNumber("price");
      const stock = interaction.options.getInteger("stock");
      const category_id = interaction.options.getInteger("category_id");
      const description = interaction.options.getString("description");
      const active = interaction.options.getInteger("active");

      const existing = await getProductById(id);
      if (!existing) {
        return interaction.editReply({
          content: `❌ Produk dengan ID \`${id}\` tidak ditemukan.`,
        });
      }

      const payload = {};
      if (name !== null) payload.name = name;
      if (price !== null) payload.price = price;
      if (stock !== null) payload.stock = stock;
      if (category_id !== null) payload.category_id = category_id;
      if (description !== null) payload.description = description;
      if (active !== null) payload.active = active;

      await updateProduct(id, payload);

      return interaction.editReply({
        content: `✅ Produk **${existing.name}** (ID: \`${id}\`) berhasil diperbarui.`,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────────────────────
    if (sub === "delete") {
      const id = interaction.options.getInteger("id");

      const existing = await getProductById(id);
      if (!existing) {
        return interaction.editReply({
          content: `❌ Produk dengan ID \`${id}\` tidak ditemukan.`,
        });
      }

      await deleteProduct(id);

      return interaction.editReply({
        content: `🗑️ Produk **${existing.name}** (ID: \`${id}\`) berhasil dihapus.`,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // LIST
    // ─────────────────────────────────────────────────────────────
    if (sub === "list") {
      const products = await getAllProducts();

      if (!products.length) {
        return interaction.editReply({
          content: "📭 Belum ada produk yang tersedia.",
        });
      }

      const DELIVERY_ICONS = {
        auto_role: "🎭",
        ingame_link: "🔗",
        voucher: "🎟️",
        raw_text: "📄",
      };

      const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle("🛒 Daftar Produk")
        .setDescription(
          products
            .map((p) => {
              const statusIcon = p.active ? "🟢" : "🔴";
              const delivIcon = p.delivery_type
                ? DELIVERY_ICONS[p.delivery_type] || "📦"
                : "📦";
              const catLabel = p.category_name
                ? `${delivIcon} ${p.category_name}`
                : "_Tanpa kategori_";
              return (
                `**[${p.id}] ${p.name}** ${statusIcon}\n` +
                `└ 💰 Rp ${Number(p.price).toLocaleString("id-ID")} | 📊 Stok: ${p.stock} | ${catLabel}`
              );
            })
            .join("\n\n"),
        )
        .setFooter({ text: `Total: ${products.length} produk` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ─────────────────────────────────────────────────────────────
    // STOCK
    // ─────────────────────────────────────────────────────────────
    if (sub === "stock") {
      const id = interaction.options.getInteger("id");
      const delta = interaction.options.getInteger("delta");

      const existing = await getProductById(id);
      if (!existing) {
        return interaction.editReply({
          content: `❌ Produk dengan ID \`${id}\` tidak ditemukan.`,
        });
      }

      await updateStock(id, delta);

      const newStock = existing.stock + delta;
      const sign = delta >= 0 ? "+" : "";

      const embed = new EmbedBuilder()
        .setColor(delta >= 0 ? 0x2ecc71 : 0xe74c3c)
        .setTitle("📊 Stok Berhasil Diperbarui")
        .addFields(
          { name: "📦 Produk", value: existing.name, inline: true },
          { name: "📈 Perubahan", value: `${sign}${delta}`, inline: true },
          { name: "🧮 Stok Baru", value: `${newStock}`, inline: true },
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
