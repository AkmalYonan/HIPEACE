const mysql = require("mysql2/promise");

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "", // default Laragon
      database: "testing_1",
      port: 3306,
    });

    console.log("✅ DB CONNECTED SUCCESSFULLY");

    const [rows] = await connection.query("SELECT 1");
    console.log("📦 TEST QUERY RESULT:", rows);

    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ DB CONNECTION FAILED");
    console.error(err);
    process.exit(1);
  }
})();
