const db = require("./db");

async function isMessageBound(messageId, channelId) {
  const [rows] = await db.query(
    `SELECT id FROM shop_messages 
     WHERE message_id = ? AND channel_id = ? AND (active = 'Y' OR active = 1 OR active = 'yes')
     LIMIT 1`,
    [messageId, channelId],
  );
  return rows.length > 0;
}

async function bindShopMessage({ messageId, channelId, userId }) {
  await db.query(
    `INSERT INTO shop_messages (channel_id, message_id, user_id, active)
     VALUES (?, ?, ?, 'Y')`,
    [channelId, messageId, userId],
  );
}

async function getAllActiveShopMessages() {
  const [rows] = await db.query(
    `SELECT * FROM shop_messages WHERE (active = 'Y' OR active = 1 OR active = 'yes')`,
  );
  return rows;
}

async function deleteShopMessage(messageId) {
  await db.query(
    `UPDATE shop_messages SET active = 'N' WHERE message_id = ?`,
    [messageId],
  );
}

module.exports = {
  isMessageBound,
  bindShopMessage,
  getAllActiveShopMessages,
  deleteShopMessage,
};
