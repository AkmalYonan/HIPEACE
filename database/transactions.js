const db = require("./db.js");

async function getTransactionByRef(merchantRef) {
  const [rows] = await db.execute(
    "SELECT * FROM transactions WHERE merchant_ref = ?",
    [merchantRef],
  );
  return rows[0] || null;
}

async function createTransaction({
  user_id,
  product_id,
  merchant_ref,
  amount,
  status,
}) {
  await db.execute(
    `INSERT INTO transactions (user_id, product_id, merchant_ref, amount, status)
     VALUES (?, ?, ?, ?, ?)`,
    [user_id, product_id, merchant_ref, amount, status],
  );
}

async function updateTransactionStatus(merchant_ref, status) {
  await db.execute(
    `UPDATE transactions SET status = ? WHERE merchant_ref = ?`,
    [status, merchant_ref],
  );
}

module.exports = {
  getTransactionByRef,
  createTransaction,
  updateTransactionStatus,
};
