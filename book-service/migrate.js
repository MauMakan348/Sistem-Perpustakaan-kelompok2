require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool, checkDatabaseConnection } = require("./db");

async function migrate() {
  const booksFile = path.join(__dirname, "books.json");
  const books = JSON.parse(fs.readFileSync(booksFile, "utf8"));

  await checkDatabaseConnection();
  await pool.query(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

  for (const book of books) {
    await pool.query(
      `INSERT INTO books (id, title, author, status)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         author = VALUES(author),
         status = VALUES(status)`,
      [book.id, book.title, book.author, book.status]
    );
  }

  console.log(`[Book Service] ${books.length} data buku berhasil dimigrasikan.`);
}

migrate()
  .catch(error => {
    console.error("[Book Service] migrasi gagal:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
