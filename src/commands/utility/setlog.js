const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

const configPath = path.join(__dirname, "../../config/logConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setlog")
    .setDescription("Menentukan channel untuk log bot")
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Channel log admin")
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");

    let config = { logChannelId: null };
    try {
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      }
    } catch {
      config = { logChannelId: null };
    }

    config.logChannelId = channel.id;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));


    await interaction.reply({
      content: `✅ Channel log berhasil diset ke ${channel}`,
      ephemeral: true,
    });
  },
};
