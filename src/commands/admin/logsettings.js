const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const {
  setLogChannel,
  deleteLogChannel,
  listLogChannels,
} = require("../../database/botSettings");

const LOG_TYPES = ["announcement", "log_paid", "log_unpaid"];
const TYPESET_CHOICES = [
  { name: "set   — Tambah/update log channel", value: "set" },
  { name: "delete — Hapus setting log channel", value: "delete" },
  { name: "list   — Lihat semua setting log", value: "list" },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("logsettings")
    .setDescription("Kelola konfigurasi log channel untuk bot")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // typeset
    .addStringOption((opt) =>
      opt
        .setName("typeset")
        .setDescription("Aksi: set / delete / list")
        .setRequired(true)
        .addChoices(...TYPESET_CHOICES),
    )
    // type (log category)
    .addStringOption((opt) =>
      opt
        .setName("type")
        .setDescription("Jenis log (wajib untuk set & delete)")
        .setRequired(false)
        .addChoices(
          { name: "announcement", value: "announcement" },
          { name: "log_paid    — notif transaksi PAID", value: "log_paid" },
          { name: "log_unpaid  — notif transaksi UNPAID", value: "log_unpaid" },
        ),
    )
    // channel_id
    .addStringOption((opt) =>
      opt
        .setName("channel_id")
        .setDescription("ID channel Discord (wajib untuk set)")
        .setRequired(false),
    )
    // admin_type
    .addStringOption((opt) =>
      opt
        .setName("admin_type")
        .setDescription(
          "Tipe admin yang akan di-mention (opsional, e.g. moderator)",
        )
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const typeset = interaction.options.getString("typeset");
    const type = interaction.options.getString("type");
    const channelId = interaction.options.getString("channel_id");
    const adminType = interaction.options.getString("admin_type") || null;
    const guildId = interaction.guildId;

    // ── SET ─────────────────────────────────────────────────────
    if (typeset === "set") {
      if (!type || !channelId) {
        return interaction.editReply({
          content:
            "❌ Untuk `set`, kamu harus mengisi `type` dan `channel_id`.",
        });
      }

      // Validate channel_id is a real channel
      const channel = await interaction.guild.channels
        .fetch(channelId)
        .catch(() => null);
      if (!channel) {
        return interaction.editReply({
          content: `❌ Channel dengan ID \`${channelId}\` tidak ditemukan di server ini.`,
        });
      }

      await setLogChannel(guildId, type, channelId, adminType);

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("✅ Log Channel Berhasil Diset")
        .addFields(
          { name: "📂 Tipe Log", value: `\`${type}\``, inline: true },
          { name: "📣 Channel", value: `<#${channelId}>`, inline: true },
          {
            name: "👥 Admin Mention",
            value: adminType ? `\`${adminType}\`` : "_Tidak diset_",
            inline: true,
          },
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── DELETE ───────────────────────────────────────────────────
    if (typeset === "delete") {
      if (!type) {
        return interaction.editReply({
          content: "❌ Untuk `delete`, kamu harus mengisi `type`.",
        });
      }

      await deleteLogChannel(guildId, type);

      return interaction.editReply({
        content: `🗑️ Konfigurasi log untuk tipe \`${type}\` telah dihapus.`,
      });
    }

    // ── LIST ─────────────────────────────────────────────────────
    if (typeset === "list") {
      const settings = await listLogChannels(guildId);

      if (!settings.length) {
        return interaction.editReply({
          content: "📭 Belum ada konfigurasi log channel yang diset.",
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("📋 Daftar Konfigurasi Log Channel")
        .setDescription(
          settings
            .map(
              (s) =>
                `**\`${s.type}\`** → <#${s.channel_id}>${
                  s.admin_type ? ` | mention: \`${s.admin_type}\`` : ""
                }`,
            )
            .join("\n"),
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
