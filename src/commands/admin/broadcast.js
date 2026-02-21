const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const { getPaidUsers } = require("../../database/transactions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("broadcast")
    .setDescription(
      "Kirim pesan DM ke semua user yang pernah membeli produk (Status PAID)",
    )
    .addStringOption((option) =>
      option
        .setName("pesan")
        .setDescription("Pesan yang ingin dibroadcast")
        .setRequired(true),
    )
    .addAttachmentOption((option) =>
      option
        .setName("gambar")
        .setDescription("Gambar opsional untuk diikutkan dalam broadcast"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Defer reply because broadcasting might take time
    await interaction.deferReply({ ephemeral: true });

    const messageText = interaction.options.getString("pesan");
    const attachment = interaction.options.getAttachment("gambar");

    try {
      const userIds = await getPaidUsers();

      if (!userIds || userIds.length === 0) {
        return interaction.editReply({
          content:
            "❌ Tidak ada user dengan transaksi berstatus PAID ditemukan.",
        });
      }

      let successCount = 0;
      let failureCount = 0;

      const embed = new EmbedBuilder()
        .setColor(0x3498db) // Blue
        .setTitle("📢 Pengumuman")
        .setDescription(messageText)
        .setTimestamp()
        .setFooter({
          text: interaction.guild ? interaction.guild.name : "Store Broadcast",
        });

      if (attachment) {
        embed.setImage(attachment.url);
      }

      // Acknowledge starting
      await interaction.editReply({
        content: `⏳ Memulai broadcast ke **${userIds.length}** user... Mohon tunggu.`,
      });

      // Send DMs loop
      for (const userId of userIds) {
        try {
          const user = await interaction.client.users.fetch(userId);
          if (user) {
            await user.send({ embeds: [embed] });
            successCount++;
          } else {
            failureCount++;
          }
        } catch (err) {
          // This usually fails if the user has DMs disabled or blocked the bot
          console.log(`Failed to DM user ${userId}:`, err.message);
          failureCount++;
        }
      }

      // Final Result
      const resultEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("✅ Broadcast Selesai")
        .addFields(
          { name: "Target Users", value: `${userIds.length}`, inline: true },
          { name: "✅ Sukses", value: `${successCount}`, inline: true },
          {
            name: "❌ Gagal (DM Ditutup)",
            value: `${failureCount}`,
            inline: true,
          },
        )
        .setTimestamp();

      await interaction.editReply({
        content: "",
        embeds: [resultEmbed],
      });
    } catch (error) {
      console.error("[BROADCAST ERROR]", error);
      await interaction.editReply({
        content:
          "❌ Terjadi kesalahan saat mencoba mengambil data atau mengirim broadcast.",
      });
    }
  },
};
