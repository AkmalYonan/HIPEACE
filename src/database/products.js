const db = require("./db");

// ─────────────────────────────────────────────
// READ (existing, unchanged)
// ─────────────────────────────────────────────

async function getActiveProducts() {
  const [rows] = await db.query(
    `SELECT p.*, c.name AS category_name, c.delivery_type
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.active = 1
     ORDER BY p.id ASC`,
  );
  return rows;
}

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────

/**
 * @param {{ name: string, price: number, stock: number, category_id?: number, description?: string }} data
 */
async function createProduct({
  name,
  price,
  stock,
  category_id = null,
  description = null,
}) {
  const [result] = await db.execute(
    `INSERT INTO products (name, price, stock, category_id, description, active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [name, price, stock, category_id, description],
  );
  return result.insertId;
}

// ─────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────

async function getProductById(id) {
  const [rows] = await db.execute(
    `SELECT p.*, c.name AS category_name, c.delivery_type
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function getAllProducts() {
  const [rows] = await db.execute(
    `SELECT p.*, c.name AS category_name, c.delivery_type
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     ORDER BY p.id ASC`,
  );
  return rows;
}

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────

/**
 * @param {number} id
 * @param {{ name?: string, price?: number, stock?: number, category_id?: number, description?: string, active?: number }} data
 */
async function updateProduct(
  id,
  { name, price, stock, category_id, description, active },
) {
  const fields = [];
  const values = [];

  if (name !== undefined) {
    fields.push("name = ?");
    values.push(name);
  }
  if (price !== undefined) {
    fields.push("price = ?");
    values.push(price);
  }
  if (stock !== undefined) {
    fields.push("stock = ?");
    values.push(stock);
  }
  if (category_id !== undefined) {
    fields.push("category_id = ?");
    values.push(category_id);
  }
  if (description !== undefined) {
    fields.push("description = ?");
    values.push(description);
  }
  if (active !== undefined) {
    fields.push("active = ?");
    values.push(active);
  }

  if (fields.length === 0) return;

  values.push(id);
  await db.execute(
    `UPDATE products SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

async function deleteProduct(id) {
  await db.execute(`DELETE FROM products WHERE id = ?`, [id]);
}

// ─────────────────────────────────────────────
// STOCK
// ─────────────────────────────────────────────

async function updateStock(productId, delta) {
  const [result] = await db.execute(
    `UPDATE products SET stock = stock + ? WHERE id = ?`,
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
  createProduct,
  getProductById,
  getAllProducts,
  updateProduct,
  deleteProduct,
  updateStock,
};
