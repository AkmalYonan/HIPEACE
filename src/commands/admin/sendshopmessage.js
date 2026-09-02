const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");
const { getActiveCategories, getCategoryById } = require("../../database/categories");
const { bindShopMessage } = require("../../database/shopMessages");
const { buildShopMessage } = require("../../utils/shopEmbed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sendshopmessage")
    .setDescription("Kirim pesan etalase toko berdasarkan kategori ke channel tujuan")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName("tujuan_channel")
        .setDescription("Channel tujuan untuk etalase toko")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("categories")
        .setDescription("Pilih kategori produk (Nama Kategori)")
        .setAutocomplete(true)
        .setRequired(true),
    ),

  /**
   * Handle dynamic autocomplete for categories
   */
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    try {
      const categories = await getActiveCategories();
      const filtered = categories.filter((c) =>
        c.name.toLowerCase().includes(focusedValue),
      );

      await interaction.respond(
        filtered.slice(0, 25).map((c) => ({
          name: `${c.name} [ID: ${c.id}] (${c.delivery_type})`,
          value: c.id,
        })),
      );
    } catch (err) {
      console.error("[AUTOCOMPLETE ERROR]", err);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const targetChannel = interaction.options.getChannel("tujuan_channel");
    const categoryId = interaction.options.getInteger("categories");

    try {
      const category = await getCategoryById(categoryId);
      if (!category) {
        return interaction.editReply({
          content: `❌ Kategori dengan ID \`${categoryId}\` tidak ditemukan.`,
        });
      }

      const shopData = await buildShopMessage(categoryId, 1);

      // Send to target channel
      const sentMessage = await targetChannel.send({
        embeds: shopData.embeds,
        components: shopData.components,
      });

      // Bind message to database
      await bindShopMessage({
        messageId: sentMessage.id,
        channelId: targetChannel.id,
        userId: interaction.user.id,
      });

      console.log(
        `[SEND SHOP MESSAGE] Admin: ${interaction.user.tag} | Channel: #${targetChannel.name} (${targetChannel.id}) | Category: ${category.name} | MessageID: ${sentMessage.id}`,
      );

      const successEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("✅ Pesan Toko Berhasil Dikirim")
        .setDescription(
          `Etalase untuk kategori **${category.name}** berhasil dikirim ke <#${targetChannel.id}>.\n\n` +
            `🔗 **[Loncat ke Pesan](${sentMessage.url})**`,
        )
        .addFields(
          { name: "📂 Kategori", value: category.name, inline: true },
          { name: "📣 Channel", value: `<#${targetChannel.id}>`, inline: true },
          { name: "🆔 Message ID", value: `\`${sentMessage.id}\``, inline: true },
        )
        .setFooter({ text: "Pesan ini memiliki Live Refresh & Pagination interaktif" })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });
    } catch (err) {
      console.error("[SEND SHOP MESSAGE ERROR]", err);
      await interaction.editReply({
        content: `❌ Gagal mengirim pesan etalase toko: ${err.message}`,
      });
    }
  },
};
