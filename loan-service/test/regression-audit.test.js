const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const loanDir = path.join(__dirname, '..');
const bookDir = path.join(__dirname, '..', '..', 'book-service');
const loanMigration = fs.readFileSync(path.join(loanDir, 'migrate.js'), 'utf8');
const loanSchema = fs.readFileSync(path.join(loanDir, 'schema.sql'), 'utf8');
const loanServer = fs.readFileSync(path.join(loanDir, 'server.js'), 'utf8');
const bookServer = fs.readFileSync(path.join(bookDir, 'server.js'), 'utf8');

test('legacy loans table migration adds status and returned_at without dropping rows', () => {
  assert.match(loanMigration, /ALTER TABLE loans ADD COLUMN status ENUM\('active', 'returned'\) NOT NULL DEFAULT 'active'/);
  assert.match(loanMigration, /ALTER TABLE loans ADD COLUMN returned_at DATETIME\(3\) NULL/);
  assert.doesNotMatch(loanMigration, /DROP TABLE\s+loans/i);
  assert.match(loanSchema, /status ENUM\('active', 'returned'\)/);
  assert.match(loanSchema, /returned_at DATETIME\(3\) NULL/);
});

test('book status transition is conditional on current status to prevent double reservation', () => {
  assert.match(bookServer, /UPDATE books SET status = \? WHERE id = \? AND status = \?/);
  assert.match(bookServer, /result\.affectedRows !== 1/);
  assert.match(bookServer, /sendJSON\(res, 409/);
});

test('loan reservation happens before inserting transaction and compensates on insert failure', () => {
  const reserveIndex = loanServer.indexOf('reservation = await callBookService(');
  const insertIndex = loanServer.indexOf('INSERT INTO loans (id, username, book_id, book_title, borrow_date, due_date, status)');
  assert.notEqual(reserveIndex, -1);
  assert.notEqual(insertIndex, -1);
  assert.ok(reserveIndex < insertIndex, 'Book Service reservation must happen before loan insert');
  assert.match(loanServer, /kompensasi peminjaman gagal/);
});

test('loan history includes returned records and return is idempotently rejected', () => {
  assert.match(loanServer, /FROM loans WHERE username = \? ORDER BY borrow_date DESC/);
  assert.match(loanServer, /loan\.status === "returned"/);
  assert.match(loanServer, /Transaksi ini sudah dikembalikan/);
  assert.match(loanServer, /UPDATE loans SET status = 'returned', returned_at = UTC_TIMESTAMP\(3\)/);
});


test('book seed migration does not overwrite any existing row', () => {
  const bookMigration = fs.readFileSync(path.join(bookDir, 'migrate.js'), 'utf8');
  assert.match(bookMigration, /INSERT IGNORE INTO books/);
  assert.doesNotMatch(bookMigration, /ON DUPLICATE KEY UPDATE/i);
});
