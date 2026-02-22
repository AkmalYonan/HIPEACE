const db = require("./db");

/**
 * Upsert a log channel setting for a given type.
 * @param {string} guildId
 * @param {string} type       - e.g. 'log_paid', 'log_unpaid', 'announcement'
 * @param {string} channelId
 * @param {string|null} adminType - role group to mention, e.g. 'moderator'
 */
async function setLogChannel(guildId, type, channelId, adminType = null) {
  await db.execute(
    `INSERT INTO bot_settings (guild_id, type, channel_id, admin_type)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       channel_id = VALUES(channel_id),
       admin_type = VALUES(admin_type),
       updated_at = CURRENT_TIMESTAMP`,
    [guildId, type, channelId, adminType],
  );
}

/**
 * Get a single log channel setting by type.
 * @param {string} guildId
 * @param {string} type
 * @returns {object|null}
 */
async function getLogChannel(guildId, type) {
  const [rows] = await db.execute(
    `SELECT * FROM bot_settings WHERE guild_id = ? AND type = ? LIMIT 1`,
    [guildId, type],
  );
  return rows[0] || null;
}

/**
 * Delete a log channel setting by type.
 * @param {string} guildId
 * @param {string} type
 */
async function deleteLogChannel(guildId, type) {
  await db.execute(`DELETE FROM bot_settings WHERE guild_id = ? AND type = ?`, [
    guildId,
    type,
  ]);
}

/**
 * List all log channel settings for a guild.
 * @param {string} guildId
 * @returns {Array}
 */
async function listLogChannels(guildId) {
  const [rows] = await db.execute(
    `SELECT * FROM bot_settings WHERE guild_id = ? ORDER BY type ASC`,
    [guildId],
  );
  return rows;
}

module.exports = {
  setLogChannel,
  getLogChannel,
  deleteLogChannel,
  listLogChannels,
};
