const db = require("./db");

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────

/**
 * @param {{ name: string, description?: string, delivery_type?: string }} data
 */
async function createCategory({
  name,
  description = null,
  delivery_type = "raw_text",
}) {
  const [result] = await db.execute(
    `INSERT INTO categories (name, description, delivery_type) VALUES (?, ?, ?)`,
    [name, description, delivery_type],
  );
  return result.insertId;
}

// ─────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────

async function getCategoryById(id) {
  const [rows] = await db.execute(
    `SELECT * FROM categories WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function getAllCategories() {
  const [rows] = await db.execute(`SELECT * FROM categories ORDER BY id ASC`);
  return rows;
}

async function getActiveCategories() {
  const [rows] = await db.execute(
    `SELECT * FROM categories WHERE active = 1 ORDER BY id ASC`,
  );
  return rows;
}

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────

/**
 * @param {number} id
 * @param {{ name?: string, description?: string, delivery_type?: string, active?: number }} data
 */
async function updateCategory(
  id,
  { name, description, delivery_type, active },
) {
  const fields = [];
  const values = [];

  if (name !== undefined) {
    fields.push("name = ?");
    values.push(name);
  }
  if (description !== undefined) {
    fields.push("description = ?");
    values.push(description);
  }
  if (delivery_type !== undefined) {
    fields.push("delivery_type = ?");
    values.push(delivery_type);
  }
  if (active !== undefined) {
    fields.push("active = ?");
    values.push(active);
  }

  if (fields.length === 0) return;

  values.push(id);
  await db.execute(
    `UPDATE categories SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    values,
  );
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

async function deleteCategory(id) {
  await db.execute(`DELETE FROM categories WHERE id = ?`, [id]);
}

module.exports = {
  createCategory,
  getCategoryById,
  getAllCategories,
  getActiveCategories,
  updateCategory,
  deleteCategory,
};
