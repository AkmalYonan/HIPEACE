const { SlashCommandBuilder, ChannelType } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("forward")
    .setDescription("Memforward pesan dari channel manapun ke channel lain")
    .addChannelOption((opt) =>
      opt
        .setName("channel_asal")
        .setDescription("Channel tempat pesan berada")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("message_id")
        .setDescription("ID pesan yang ingin diforward")
        .setRequired(true),
    )
    .addChannelOption((opt) =>
      opt
        .setName("channel_tujuan")
        .setDescription("Channel tujuan")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    ),

  async execute(interaction) {
    const fs = require("node:fs");
    const path = require("node:path");

    const configPath = path.join(__dirname, "../../logConfig.json");
    const logConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

    const sourceChannel = interaction.options.getChannel("channel_asal");
    const messageId = interaction.options.getString("message_id");
    const targetChannel = interaction.options.getChannel("channel_tujuan");

    const guild = interaction.guild;
    const user = interaction.user;

    // siapkan log text dari awal
    const baseLog =
      `Guild: ${guild.name} (${guild.id})\n` +
      `User: ${user.tag} (${user.id})\n` +
      `From: #${sourceChannel.name} → To: #${targetChannel.name}\n` +
      `MessageID: ${messageId}`;

    try {
      // ambil pesan dari channel asal
      const sourceMessage = await sourceChannel.messages.fetch(messageId);

      await targetChannel.send({
        content: sourceMessage.content || null,
        embeds: sourceMessage.embeds,
        files: [...sourceMessage.attachments.values()],
      });

      const logText = `[FORWARD SUCCESS]\n${baseLog}`;

      // ✅ CONSOLE LOG
      console.log(logText.replace(/\n/g, " | "));

      // ✅ LOG KE CHANNEL ADMIN (JIKA ADA)
      if (logConfig.logChannelId) {
        try {
          const logChannel = await guild.channels.fetch(logConfig.logChannelId);
          if (logChannel?.isTextBased()) {
            await logChannel.send({ content: "```" + logText + "```" });
          }
        } catch {
          console.warn("[LOG WARNING] Gagal mengirim log ke channel log.");
        }
      }

      // ⚠️ WARNING JIKA BELUM SET LOG
      let replyText = "✅ Pesan berhasil diforward oleh bot.";
      if (!logConfig.logChannelId) {
        replyText +=
          "\n⚠️ Log channel belum diset. Gunakan `/setlog` untuk mengaktifkan logging.";
      }

      await interaction.reply({
        content: replyText,
        ephemeral: true,
      });
    } catch (err) {
      const logText = `[FORWARD FAILED]\n${baseLog}`;

      // ❌ CONSOLE LOG
      console.error(logText.replace(/\n/g, " | "));
      console.error(err);

      // ❌ LOG KE CHANNEL ADMIN (JIKA ADA)
      if (logConfig.logChannelId) {
        try {
          const logChannel = await guild.channels.fetch(logConfig.logChannelId);
          if (logChannel?.isTextBased()) {
            await logChannel.send({ content: "```" + logText + "```" });
          }
        } catch {
          console.warn("[LOG WARNING] Gagal mengirim log ke channel log.");
        }
      }

      await interaction.reply({
        content:
          "❌ Gagal memforward pesan.\nPastikan Message ID benar dan bot punya akses ke channel asal.",
        ephemeral: true,
      });
    }
  },
};
