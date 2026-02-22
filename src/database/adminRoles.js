const db = require("./db");

/**
 * Upsert an admin role for a guild.
 * @param {string} guildId
 * @param {string} typeaccount - e.g. 'moderator', 'admin'
 * @param {string} rolesId     - Discord role ID
 */
async function setAdminRole(guildId, typeaccount, rolesId) {
  await db.execute(
    `INSERT INTO admin_roles (guild_id, typeaccount, roles_id)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       roles_id   = VALUES(roles_id),
       updated_at = CURRENT_TIMESTAMP`,
    [guildId, typeaccount, rolesId],
  );
}

/**
 * Get an admin role by typeaccount.
 * @param {string} guildId
 * @param {string} typeaccount
 * @returns {object|null}
 */
async function getAdminRole(guildId, typeaccount) {
  const [rows] = await db.execute(
    `SELECT * FROM admin_roles WHERE guild_id = ? AND typeaccount = ? LIMIT 1`,
    [guildId, typeaccount],
  );
  return rows[0] || null;
}

/**
 * List all admin roles for a guild.
 * @param {string} guildId
 * @returns {Array}
 */
async function listAdminRoles(guildId) {
  const [rows] = await db.execute(
    `SELECT * FROM admin_roles WHERE guild_id = ? ORDER BY typeaccount ASC`,
    [guildId],
  );
  return rows;
}

/**
 * Delete an admin role by typeaccount.
 * @param {string} guildId
 * @param {string} typeaccount
 */
async function deleteAdminRole(guildId, typeaccount) {
  await db.execute(
    `DELETE FROM admin_roles WHERE guild_id = ? AND typeaccount = ?`,
    [guildId, typeaccount],
  );
}

module.exports = {
  setAdminRole,
  getAdminRole,
  listAdminRoles,
  deleteAdminRole,
};
