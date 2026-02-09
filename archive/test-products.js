const { getActiveProducts } = require("../database/products");

(async () => {
  try {
    const products = await getActiveProducts();
    console.log("PRODUCTS:", products);
  } catch (err) {
    console.error("ERROR GET PRODUCTS:", err);
  }
})();
