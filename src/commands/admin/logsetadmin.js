const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const {
  setAdminRole,
  listAdminRoles,
  deleteAdminRole,
} = require("../../database/adminRoles");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("logsetadmin")
    .setDescription(
      "Kelola daftar role admin yang akan di-mention saat ada log",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt
        .setName("typeset")
        .setDescription("Aksi: set / delete / list")
        .setRequired(true)
        .addChoices(
          { name: "set", value: "set" },
          { name: "delete", value: "delete" },
          { name: "list", value: "list" },
        ),
    )
    .addStringOption((opt) =>
      opt
        .setName("typeaccount")
        .setDescription("Nama tipe akun, e.g. moderator, admin, owner")
        .setRequired(false),
    )
    .addStringOption((opt) =>
      opt
        .setName("roles_id")
        .setDescription("ID role Discord (wajib untuk set)")
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const typeset = interaction.options.getString("typeset");
    const typeaccount = interaction.options.getString("typeaccount");
    const rolesId = interaction.options.getString("roles_id");
    const guildId = interaction.guildId;

    // ── SET ─────────────────────────────────────────────────────
    if (typeset === "set") {
      if (!typeaccount || !rolesId) {
        return interaction.editReply({
          content:
            "❌ Untuk `set`, kamu harus mengisi `typeaccount` dan `roles_id`.",
        });
      }

      // Validate role exists
      const role = await interaction.guild.roles
        .fetch(rolesId)
        .catch(() => null);
      if (!role) {
        return interaction.editReply({
          content: `❌ Role dengan ID \`${rolesId}\` tidak ditemukan di server ini.`,
        });
      }

      await setAdminRole(guildId, typeaccount, rolesId);

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("✅ Admin Role Berhasil Diset")
        .addFields(
          {
            name: "👤 Type Account",
            value: `\`${typeaccount}\``,
            inline: true,
          },
          { name: "🏷️ Role", value: `<@&${rolesId}>`, inline: true },
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── DELETE ───────────────────────────────────────────────────
    if (typeset === "delete") {
      if (!typeaccount) {
        return interaction.editReply({
          content: "❌ Untuk `delete`, kamu harus mengisi `typeaccount`.",
        });
      }

      await deleteAdminRole(guildId, typeaccount);

      return interaction.editReply({
        content: `🗑️ Admin role untuk tipe \`${typeaccount}\` telah dihapus.`,
      });
    }

    // ── LIST ─────────────────────────────────────────────────────
    if (typeset === "list") {
      const roles = await listAdminRoles(guildId);

      if (!roles.length) {
        return interaction.editReply({
          content: "📭 Belum ada admin role yang dikonfigurasi.",
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle("📋 Daftar Admin Role")
        .setDescription(
          roles
            .map((r) => `**\`${r.typeaccount}\`** → <@&${r.roles_id}>`)
            .join("\n"),
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
