const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const { getTransactionByRef } = require("../../database/transactions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("checktrx")
    .setDescription("Cek status transaksi berdasarkan Merchant Reference ID")
    .addStringOption((option) =>
      option
        .setName("merchant_ref")
        .setDescription("Merchant Reference ID (contoh: discord_1_123456789)")
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const merchantRef = interaction.options.getString("merchant_ref");

    try {
      const trx = await getTransactionByRef(merchantRef);

      if (!trx) {
        return interaction.editReply({
          content: `❌ Transaksi dengan referensi \`${merchantRef}\` tidak ditemukan.`,
        });
      }

      // Determine color based on status
      let embedColor = 0x95a5a6; // Grey default
      let statusIcon = "📌";
      if (trx.status === "PAID") {
        embedColor = 0x2ecc71; // Green
        statusIcon = "✅";
      } else if (trx.status === "UNPAID") {
        embedColor = 0xf1c40f; // Yellow
        statusIcon = "⏳";
      } else if (
        trx.status.toUpperCase() === "EXPIRED" ||
        trx.status.toUpperCase() === "FAILED"
      ) {
        embedColor = 0xe74c3c; // Red
        statusIcon = "⛔";
      }

      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`🔍 Info Transaksi: ${statusIcon} ${trx.status}`)
        .addFields(
          {
            name: "🧾 Merchant Ref",
            value: `\`${trx.merchant_ref}\``,
            inline: false,
          },
          {
            name: "👤 User",
            value: `<@${trx.user_id}> (\`${trx.user_id}\`)`,
            inline: true,
          },
          {
            name: "📦 Product ID",
            value: `${trx.product_id} | **${trx.product_name}**`,
            inline: true,
          },
          {
            name: "💰 Amount",
            value: `Rp ${Number(trx.amount).toLocaleString("id-ID")}`,
            inline: true,
          },
          {
            name: "📅 Dibuat Pada",
            value: trx.created_at
              ? `<t:${Math.floor(new Date(trx.created_at).getTime() / 1000)}:F>`
              : "Tidak diketahui",
            inline: false,
          },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("[CHECKTRX CMD ERROR]", error);
      await interaction.editReply({
        content:
          "❌ Terjadi kesalahan saat mengambil data transaksi dari database.",
      });
    }
  },
};
