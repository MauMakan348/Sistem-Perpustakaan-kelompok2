'use strict';

// Safe, non-destructive consolidation migration into one application database.
// Source databases are read only; no legacy database/table/row is dropped or altered.
require('dotenv').config({ path: process.env.ENV_FILE || require('path').resolve(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbName = process.env.DB_NAME || 'perpustakaan_db';
const legacyBookDb = process.env.LEGACY_BOOK_DB_NAME || 'book_db';
const legacyLoanDb = process.env.LEGACY_LOAN_DB_NAME || 'loan_db';
const common = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  timezone: 'Z',
  dateStrings: false,
};

function identifier(value) {
  if (!/^[A-Za-z0-9_]+$/.test(value)) throw new Error(`Nama database tidak valid: ${value}`);
  return `\`${value}\``;
}

async function tableExists(conn, database, table) {
  const [rows] = await conn.execute(
    'SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
    [database, table]
  );
  return Number(rows[0].n) > 0;
}

async function columnsFor(conn, database, table) {
  const [rows] = await conn.query(`SHOW COLUMNS FROM ${identifier(database)}.${identifier(table)}`);
  return new Set(rows.map(row => row.Field));
}

async function copyRows({ source, table, targetPool, sourceConn, selectSql, mapRow, insertSql, valuesFor }) {
  if (!await tableExists(sourceConn, source, table)) {
    console.log(`[Migration] Sumber ${source}.${table} tidak ada; dilewati.`);
    return { sourceFound: false, inserted: 0, skipped: 0 };
  }
  const [rows] = await sourceConn.query(selectSql);
  let inserted = 0;
  let skipped = 0;
  for (const raw of rows) {
    const row = mapRow(raw);
    const [result] = await targetPool.execute(insertSql, valuesFor(row));
    if (result.affectedRows === 1) inserted += 1;
    else skipped += 1;
  }
  console.log(`[Migration] ${source}.${table} -> ${dbName}.${table}: ${inserted} ditambahkan, ${skipped} dilewati (duplikat/konflik).`);
  return { sourceFound: true, inserted, skipped };
}

async function seedJsonIfEmpty(pool, table, filename, insertSql, valuesFor) {
  const [[count]] = await pool.query(`SELECT COUNT(*) AS n FROM ${identifier(table)}`);
  if (Number(count.n) > 0) {
    console.log(`[Migration] Seed ${filename} dilewati; tabel ${table} sudah berisi data.`);
    return;
  }
  const rows = JSON.parse(fs.readFileSync(path.join(__dirname, '..', filename), 'utf8'));
  for (const row of rows) await pool.execute(insertSql, valuesFor(row));
  console.log(`[Migration] ${rows.length} baris seed dari ${filename} dimasukkan ke ${table}.`);
}

async function migrate() {
  const admin = await mysql.createConnection(common);
  let targetPool;
  let sourceBookConn;
  let sourceLoanConn;
  try {
    await admin.query(`CREATE DATABASE IF NOT EXISTS ${identifier(dbName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    targetPool = mysql.createPool({ ...common, database: dbName, waitForConnections: true, connectionLimit: 5, queueLimit: 0 });
    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(32) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_users_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        status VARCHAR(20) NOT NULL,
        CONSTRAINT chk_books_status CHECK (status IN ('tersedia', 'dipinjam'))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await targetPool.query(`
      CREATE TABLE IF NOT EXISTS loans (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        book_id INT NOT NULL,
        book_title TEXT NOT NULL,
        borrow_date DATETIME(3) NOT NULL,
        due_date DATETIME(3) NOT NULL,
        status ENUM('active', 'returned') NOT NULL DEFAULT 'active',
        returned_at DATETIME(3) NULL,
        INDEX idx_loans_username (username),
        INDEX idx_loans_due_date (due_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    // CREATE TABLE IF NOT EXISTS does not alter an existing table. Ensure legacy
    // consolidated schemas use a database-generated ID before backend startup.
    await targetPool.query('ALTER TABLE loans MODIFY id BIGINT NOT NULL AUTO_INCREMENT');

    const databases = new Set((await admin.query('SHOW DATABASES'))[0].map(row => row.Database));
    if (databases.has(legacyBookDb) && legacyBookDb !== dbName) sourceBookConn = await mysql.createConnection({ ...common, database: legacyBookDb });
    if (databases.has(legacyLoanDb) && legacyLoanDb !== dbName) sourceLoanConn = await mysql.createConnection({ ...common, database: legacyLoanDb });

    let bookSourceFound = false;
    let userSourceFound = false;
    let loanSourceFound = false;
    if (sourceBookConn) {
      const result = await copyRows({
        source: legacyBookDb, table: 'books', sourceConn: sourceBookConn, targetPool,
        selectSql: 'SELECT id, title, author, status FROM books ORDER BY id',
        mapRow: row => row,
        insertSql: 'INSERT IGNORE INTO books (id, title, author, status) VALUES (?, ?, ?, ?)',
        valuesFor: row => [row.id, row.title, row.author, row.status],
      });
      bookSourceFound = result.sourceFound;
    }
    if (sourceLoanConn) {
      const userColumns = await tableExists(sourceLoanConn, legacyLoanDb, 'users') ? await columnsFor(sourceLoanConn, legacyLoanDb, 'users') : new Set();
      if (userColumns.size) {
        const roleExpr = userColumns.has('role') ? 'role' : "'user' AS role";
        const createdExpr = userColumns.has('created_at') ? 'created_at' : 'CURRENT_TIMESTAMP AS created_at';
        const result = await copyRows({
          source: legacyLoanDb, table: 'users', sourceConn: sourceLoanConn, targetPool,
          selectSql: `SELECT id, username, password_hash, ${roleExpr}, ${createdExpr} FROM users ORDER BY id`,
          mapRow: row => row,
          insertSql: 'INSERT IGNORE INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
          valuesFor: row => [row.id, row.username, row.password_hash, ['admin', 'user'].includes(row.role) ? row.role : 'user', row.created_at],
        });
        userSourceFound = result.sourceFound;
      }
      if (await tableExists(sourceLoanConn, legacyLoanDb, 'loans')) {
        const loanColumns = await columnsFor(sourceLoanConn, legacyLoanDb, 'loans');
        const statusExpr = loanColumns.has('status') ? 'status' : "'active' AS status";
        const returnedExpr = loanColumns.has('returned_at') ? 'returned_at' : 'NULL AS returned_at';
        const result = await copyRows({
          source: legacyLoanDb, table: 'loans', sourceConn: sourceLoanConn, targetPool,
          selectSql: `SELECT id, username, book_id, book_title, borrow_date, due_date, ${statusExpr}, ${returnedExpr} FROM loans ORDER BY id`,
          mapRow: row => row,
          insertSql: 'INSERT IGNORE INTO loans (id, username, book_id, book_title, borrow_date, due_date, status, returned_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          valuesFor: row => [row.id, row.username, row.book_id, row.book_title, row.borrow_date, row.due_date, row.status === 'returned' ? 'returned' : 'active', row.returned_at],
        });
        loanSourceFound = result.sourceFound;
      }
    }

    // Seed files are a fallback for fresh installs only; existing/imported rows are never overwritten.
    if (!bookSourceFound) await seedJsonIfEmpty(targetPool, 'books', 'book-service/books.json', 'INSERT IGNORE INTO books (id, title, author, status) VALUES (?, ?, ?, ?)', row => [row.id, row.title, row.author, row.status]);
    if (!loanSourceFound) await seedJsonIfEmpty(targetPool, 'loans', 'loan-service/loans.json', 'INSERT IGNORE INTO loans (id, username, book_id, book_title, borrow_date, due_date, status, returned_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', row => [row.id, row.username, row.bookId, row.bookTitle, new Date(row.borrowDate), new Date(row.dueDate), row.status === 'returned' ? 'returned' : 'active', row.returnedAt ? new Date(row.returnedAt) : null]);

    console.log(`[Migration] Selesai. Database aktif: ${dbName}. Database sumber lama tidak dihapus atau diubah.`);
    if (sourceLoanConn && !userSourceFound) console.log('[Migration] Tabel users tidak ditemukan pada database sumber; akun dibuat melalui endpoint registrasi.');
  } finally {
    if (sourceBookConn) await sourceBookConn.end();
    if (sourceLoanConn) await sourceLoanConn.end();
    if (targetPool) await targetPool.end();
    await admin.end();
  }
}

migrate().catch(error => {
  console.error(`[Migration] Gagal: ${error.message}`);
  process.exitCode = 1;
});
