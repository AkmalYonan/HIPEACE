const db = require("./db");

async function isMessageBound(messageId, channelId) {
  const [rows] = await db.query(
    `SELECT id FROM shop_messages 
     WHERE message_id = ? AND channel_id = ? AND active = 'yes'
     LIMIT 1`,
    [messageId, channelId],
  );
  return rows.length > 0;
}

async function bindShopMessage({ messageId, channelId, userId }) {
  await db.query(
    `INSERT INTO shop_messages (channel_id, message_id, user_id, active)
     VALUES (?, ?, ?, 'Y')`,
    [messageId, channelId, userId],
  );
}

module.exports = {
  isMessageBound,
  bindShopMessage,
};
