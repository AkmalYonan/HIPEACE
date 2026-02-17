const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const {
  isMessageBound,
  bindShopMessage,
} = require("../../database/shopMessages");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("binddbbuy")
    .setDescription("Bind message sebagai toko (Button Beli Sekarang)")
    .addStringOption((opt) =>
      opt
        .setName("message_id")
        .setDescription("ID message embed produk")
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const messageId = interaction.options.getString("message_id");
    const channel = interaction.channel;
    const user = interaction.user;

    try {
      // 🔍 pastikan message ada
      const message = await channel.messages.fetch(messageId);

      // 🔍 cek DB
      const exists = await isMessageBound(messageId, channel.id);

      if (exists) {
        return interaction.reply({
          content: "⚠️ Message ini sudah dibind sebagai toko.",
          ephemeral: true,
        });
      }

      // 💾 simpan ke DB
      await bindShopMessage({
        messageId,
        channelId: channel.id,
        userId: user.id,
      });

      // 🛒 tombol beli
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`buy_${messageId}`)
          .setLabel("Beli Sekarang")
          .setEmoji("🛒")
          .setStyle(ButtonStyle.Success),
      );

      await message.edit({ components: [row] });

      console.log(
        `[SHOP BIND DB] User: ${user.tag} | Channel: ${channel.id} | Message: ${messageId}`,
      );

      await interaction.reply({
        content: "✅ Button 🛒 **Beli Sekarang** berhasil dibind ke database.",
        ephemeral: true,
      });
    } catch (err) {
      console.error("[BIND DB BUY ERROR]", err);

      await interaction.reply({
        content:
          "❌ Gagal bind message.\nPastikan ID benar & command dijalankan di channel yang sama.",
        ephemeral: true,
      });
    }
  },
};
