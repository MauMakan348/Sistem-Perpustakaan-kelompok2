const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || "book_db",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "aji1234",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "Z",
  dateStrings: false,
});

async function checkDatabaseConnection() {
  try {
    await pool.query("SELECT 1");
    console.log("[Book Service] koneksi MySQL berhasil.");
  } catch (error) {
    console.error("[Book Service] gagal terhubung ke MySQL:", error.message);
    throw error;
  }
}

module.exports = { pool, checkDatabaseConnection };
