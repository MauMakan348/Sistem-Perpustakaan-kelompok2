require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool, checkDatabaseConnection } = require("./db");

async function migrate() {
  const loansFile = path.join(__dirname, "loans.json");
  const loans = JSON.parse(fs.readFileSync(loansFile, "utf8"));

  await checkDatabaseConnection();
  await pool.query(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

  for (const loan of loans) {
    await pool.query(
      `INSERT INTO loans (id, username, book_id, book_title, borrow_date, due_date)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         username = VALUES(username),
         book_id = VALUES(book_id),
         book_title = VALUES(book_title),
         borrow_date = VALUES(borrow_date),
         due_date = VALUES(due_date)`,
      [
        loan.id,
        loan.username,
        loan.bookId,
        loan.bookTitle,
        new Date(loan.borrowDate),
        new Date(loan.dueDate),
      ]
    );
  }

  console.log(`[Loan Service] ${loans.length} data peminjaman berhasil dimigrasikan.`);
}

migrate()
  .catch(error => {
    console.error("[Loan Service] migrasi gagal:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
