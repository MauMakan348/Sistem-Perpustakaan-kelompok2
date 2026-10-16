require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool, checkDatabaseConnection } = require("./db");

async function migrate() {
  const loansFile = path.join(__dirname, "loans.json");
  const loans = JSON.parse(fs.readFileSync(loansFile, "utf8"));

  await checkDatabaseConnection();

  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  const statements = schema.split(/;\s*(?:\r?\n|$)/).map(statement => statement.trim()).filter(Boolean);
  const [userTableRows] = await pool.query(
    `SELECT COUNT(*) AS tableCount
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'users'`
  );
  const usersTableExists = Number(userTableRows[0].tableCount) > 0;

  for (const statement of statements) {
    if (usersTableExists && /^CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+users\b/i.test(statement)) {
      const [columns] = await pool.query("SHOW COLUMNS FROM users");
      const existingColumnNames = new Set(columns.map(column => column.Field));
      const requiredColumns = ["id", "username", "password_hash", "created_at"];
      const missingColumns = requiredColumns.filter(column => !existingColumnNames.has(column));
      if (missingColumns.length > 0) {
        throw new Error(`Tabel users sudah ada tetapi tidak kompatibel. Kolom yang belum ada: ${missingColumns.join(", ")}. Tidak ada tabel/data yang dihapus.`);
      }
      // Role ditambahkan secara non-destruktif. Akun lama tetap user; admin ditetapkan manual oleh operator.
      if (!existingColumnNames.has("role")) {
        await pool.query("ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user'");
      }
      const [indexes] = await pool.query("SHOW INDEX FROM users");
      const uniqueIndexes = indexes.filter(index => Number(index.Non_unique) === 0);
      const hasUniqueUsername = uniqueIndexes.some(index => {
        const columnsInIndex = uniqueIndexes.filter(candidate => candidate.Key_name === index.Key_name);
        return index.Column_name === "username" && Number(index.Seq_in_index) === 1 && columnsInIndex.length === 1;
      });
      if (!hasUniqueUsername) {
        throw new Error("Tabel users sudah ada tetapi username belum memiliki unique index. Tambahkan constraint unik secara terencana; migration tidak mengubah tabel yang sudah ada.");
      }
      console.log("[Loan Service] tabel users sudah ada dan kompatibel; tidak dibuat ulang.");
      continue;
    }
    await pool.query(statement);
  }

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
