const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const {
  createCategory,
  getCategoryById,
  getAllCategories,
  updateCategory,
  deleteCategory,
} = require("../../database/categories");

const DELIVERY_TYPE_CHOICES = [
  { name: "auto_role   — Berikan role otomatis", value: "auto_role" },
  { name: "ingame_link — Link masuk dalam game", value: "ingame_link" },
  { name: "voucher     — Kode voucher", value: "voucher" },
  { name: "raw_text    — Teks mentah (default)", value: "raw_text" },
];

const DELIVERY_LABELS = {
  auto_role: "🎭 Auto Role",
  ingame_link: "🔗 Ingame Link",
  voucher: "🎟️ Voucher",
  raw_text: "📄 Raw Text",
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("category")
    .setDescription("Kelola kategori produk")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // ─── ADD ───
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Tambah kategori baru")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Nama kategori").setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("delivery_type")
            .setDescription("Tipe delivery untuk kategori ini")
            .setRequired(true)
            .addChoices(...DELIVERY_TYPE_CHOICES),
        )
        .addStringOption((opt) =>
          opt
            .setName("description")
            .setDescription("Deskripsi kategori (opsional)")
            .setRequired(false),
        ),
    )

    // ─── EDIT ───
    .addSubcommand((sub) =>
      sub
        .setName("edit")
        .setDescription("Edit kategori yang ada")
        .addIntegerOption((opt) =>
          opt.setName("id").setDescription("ID kategori").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Nama baru").setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName("delivery_type")
            .setDescription("Tipe delivery baru")
            .setRequired(false)
            .addChoices(...DELIVERY_TYPE_CHOICES),
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
            .setDescription("Status aktif (1 = aktif, 0 = nonaktif)")
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
        .setDescription("Hapus kategori")
        .addIntegerOption((opt) =>
          opt.setName("id").setDescription("ID kategori").setRequired(true),
        ),
    )

    // ─── LIST ───
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("Lihat semua kategori"),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();

    // ─────────────────────────────────────────────────────────────
    // ADD
    // ─────────────────────────────────────────────────────────────
    if (sub === "add") {
      const name = interaction.options.getString("name");
      const delivery_type = interaction.options.getString("delivery_type");
      const description = interaction.options.getString("description") || null;

      const newId = await createCategory({ name, description, delivery_type });

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("✅ Kategori Berhasil Ditambahkan")
        .addFields(
          { name: "🆔 ID", value: `\`${newId}\``, inline: true },
          { name: "📂 Nama", value: name, inline: true },
          {
            name: "🚚 Delivery",
            value: DELIVERY_LABELS[delivery_type] || delivery_type,
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
      const delivery_type = interaction.options.getString("delivery_type");
      const description = interaction.options.getString("description");
      const active = interaction.options.getInteger("active");

      const existing = await getCategoryById(id);
      if (!existing) {
        return interaction.editReply({
          content: `❌ Kategori dengan ID \`${id}\` tidak ditemukan.`,
        });
      }

      const updatePayload = {};
      if (name !== null) updatePayload.name = name;
      if (delivery_type !== null) updatePayload.delivery_type = delivery_type;
      if (description !== null) updatePayload.description = description;
      if (active !== null) updatePayload.active = active;

      await updateCategory(id, updatePayload);

      return interaction.editReply({
        content: `✅ Kategori \`${existing.name}\` (ID: \`${id}\`) berhasil diperbarui.`,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────────────────────
    if (sub === "delete") {
      const id = interaction.options.getInteger("id");

      const existing = await getCategoryById(id);
      if (!existing) {
        return interaction.editReply({
          content: `❌ Kategori dengan ID \`${id}\` tidak ditemukan.`,
        });
      }

      await deleteCategory(id);

      return interaction.editReply({
        content: `🗑️ Kategori **${existing.name}** (ID: \`${id}\`) berhasil dihapus.`,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // LIST
    // ─────────────────────────────────────────────────────────────
    if (sub === "list") {
      const categories = await getAllCategories();

      if (!categories.length) {
        return interaction.editReply({
          content: "📭 Belum ada kategori yang tersedia.",
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("📋 Daftar Kategori")
        .setDescription(
          categories
            .map((c) => {
              const statusIcon = c.active ? "🟢" : "🔴";
              return (
                `**[${c.id}] ${c.name}** ${statusIcon}\n` +
                `└ 🚚 ${DELIVERY_LABELS[c.delivery_type] || c.delivery_type}` +
                (c.description ? ` | 📝 ${c.description}` : "")
              );
            })
            .join("\n\n"),
        )
        .setFooter({ text: `Total: ${categories.length} kategori` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
