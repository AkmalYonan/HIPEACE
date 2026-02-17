const db = require("./db");

async function getActiveProducts() {
  const [rows] = await db.query(`SELECT * FROM products WHERE active = 1`);
  return rows;
}

async function updateStock(productId, delta) {
  const [result] = await db.execute(
    `
    UPDATE products
    SET stock = stock + ?
    WHERE id = ?
    `,
    [delta, productId],
  );

  console.log("📦 UPDATE STOCK:", {
    productId,
    delta,
    affectedRows: result.affectedRows,
  });

  if (result.affectedRows === 0) {
    throw new Error("Stock tidak terupdate (produk tidak ditemukan)");
  }
}

module.exports = {
  getActiveProducts,
  updateStock,
};
