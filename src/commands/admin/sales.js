const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const { getSalesStats } = require("../../database/transactions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sales")
    .setDescription(
      "Lihat laporan penjualan hari ini, minggu ini, dan total pendapatan.",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const stats = await getSalesStats();

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f) // Yellow/Gold
        .setTitle("📊 Dashboard Penjualan")
        .setDescription(
          "Berikut adalah ringkasan pendapatan dari transaksi yang **PAID**.",
        )
        .addFields(
          {
            name: "✅ Total Transaksi Sukses",
            value: `${stats.totalTransactions} transaksi`,
            inline: false,
          },
          {
            name: "💰 Pendapatan Hari Ini",
            value: `Rp ${Number(stats.revenueToday).toLocaleString("id-ID")}`,
            inline: true,
          },
          {
            name: "📅 Pendapatan Minggu Ini",
            value: `Rp ${Number(stats.revenueThisWeek).toLocaleString("id-ID")}`,
            inline: true,
          },
          {
            name: "🏆 Total Pendapatan",
            value: `Rp ${Number(stats.totalRevenue).toLocaleString("id-ID")}`,
            inline: false,
          },
        )
        .setTimestamp()
        .setFooter({ text: "Hipeace Store Dashboard" });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("[SALES CMD ERROR]", error);
      await interaction.editReply({
        content:
          "❌ Terjadi kesalahan saat mengambil data penjualan dari database.",
      });
    }
  },
};
