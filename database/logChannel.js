const pool = require("./db"); // mysql2 pool kamu

async function setLogChannel(guildId, channelId) {
  await pool.query(
    `INSERT INTO bot_settings (guild_id, log_channel_id)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE log_channel_id = VALUES(log_channel_id)`,
    [guildId, channelId],
  );
}

async function getLogChannel(guildId) {
  const [rows] = await pool.query(
    `SELECT log_channel_id FROM bot_settings WHERE guild_id = ? LIMIT 1`,
    [guildId],
  );
  return rows.length ? rows[0].log_channel_id : null;
}

module.exports = {
  setLogChannel,
  getLogChannel,
};
