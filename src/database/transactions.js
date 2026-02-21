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

async function getPaidUsers() {
  const [rows] = await db.execute(
    "SELECT DISTINCT user_id FROM transactions WHERE status = 'PAID'",
  );
  return rows.map((row) => row.user_id);
}

async function getSalesStats() {
  const [rows] = await db.execute(`
    SELECT 
      COUNT(*) as total_transactions,
      SUM(amount) as total_revenue,
      SUM(CASE WHEN DATE(created_at) = CURDATE() THEN amount ELSE 0 END) as revenue_today,
      SUM(CASE WHEN YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1) THEN amount ELSE 0 END) as revenue_this_week
    FROM transactions 
    WHERE status = 'PAID'
  `);

  return {
    totalTransactions: rows[0].total_transactions || 0,
    totalRevenue: rows[0].total_revenue || 0,
    revenueToday: rows[0].revenue_today || 0,
    revenueThisWeek: rows[0].revenue_this_week || 0,
  };
}

module.exports = {
  getTransactionByRef,
  createTransaction,
  updateTransactionStatus,
  getPaidUsers,
  getSalesStats,
};
