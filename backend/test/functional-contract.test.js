'use strict';

// Source-contract tests only: these assert that the handlers enforce the intended
// rules. They do not start HTTP/MySQL and must not be presented as integration tests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const backend = fs.readFileSync(path.join(root, 'backend/server.js'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'backend/migrate.js'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'loan-service/schema.sql'), 'utf8');

test('login membandingkan password dengan hash dan menolak kredensial salah', () => {
  assert.match(backend, /bcrypt\.compare\(body\.password, rows\[0\]\.password_hash\)/);
  assert.match(backend, /Username atau password salah/);
  assert.match(backend, /jwt\.sign\(/);
});

test('daftar dan detail buku memvalidasi akses serta ID', () => {
  assert.match(backend, /pathname === '\/api\/books'/);
  assert.match(backend, /SELECT id, title, author, status FROM books ORDER BY id/);
  assert.match(backend, /ID buku tidak valid/);
  assert.match(backend, /Buku tidak ditemukan/);
});

test('peminjaman mengambil identitas dari token, bukan username klien', () => {
  assert.match(backend, /const user = getUser\(req\)/);
  assert.match(backend, /body\.username && String\(body\.username\).*user\.username/);
  assert.match(backend, /username: user\.username, bookId/);
});

test('peminjaman membatasi tiga transaksi aktif dan mengunci akun dalam transaksi', () => {
  assert.match(backend, /await conn\.beginTransaction\(\)/);
  assert.match(backend, /SELECT id, username FROM users WHERE id = \? AND username = \? FOR UPDATE/);
  assert.match(backend, /SELECT COUNT\(\*\) AS activeCount FROM loans WHERE username = \? AND status = 'active'/);
  assert.match(backend, /activeCount >= MAX_ACTIVE_LOANS/);
  assert.match(backend, /MAX_ACTIVE_LOANS = 3/);
});

test('peminjaman menolak buku tidak tersedia dan mengunci buku untuk konkurensi', () => {
  assert.match(backend, /SELECT id, title, author, status FROM books WHERE id = \? FOR UPDATE/);
  assert.match(backend, /UPDATE books SET status = 'dipinjam' WHERE id = \? AND status = 'tersedia'/);
  assert.match(backend, /Peminjaman ditolak\. Buku sedang dipinjam mahasiswa lain\./);
});

test('tenggat dihitung tujuh hari dan transaksi mendapat ID database', () => {
  assert.match(backend, /LOAN_PERIOD_DAYS = 7/);
  assert.match(backend, /LOAN_PERIOD_DAYS \* 24 \* 60 \* 60 \* 1000/);
  assert.match(backend, /INSERT INTO loans \(username, book_id, book_title, borrow_date, due_date, status\)/);
  assert.match(backend, /loanId = insertedLoan\.insertId/);
  assert.match(migration, /ALTER TABLE loans MODIFY id BIGINT NOT NULL AUTO_INCREMENT/);
  assert.match(schema, /id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY/);
});

test('riwayat hanya dapat diakses pemilik yang terautentikasi', () => {
  assert.match(backend, /requested !== user\.username/);
  assert.match(backend, /Anda tidak berhak melihat peminjaman pengguna lain/);
  assert.match(backend, /FROM loans WHERE username = \? ORDER BY borrow_date DESC/);
});

test('pengembalian memvalidasi ID, kepemilikan, dan status aktif', () => {
  assert.match(backend, /ID transaksi tidak valid/);
  assert.match(backend, /loan\.username !== user\.username/);
  assert.match(backend, /loan\.status === 'returned'/);
  assert.match(backend, /loan\.status !== 'active'/);
});

test('pengembalian mengubah buku dan transaksi dalam satu transaksi database', () => {
  assert.match(backend, /UPDATE books SET status = 'tersedia' WHERE id = \? AND status = 'dipinjam'/);
  assert.match(backend, /UPDATE loans SET status = 'returned', returned_at = UTC_TIMESTAMP\(3\) WHERE id = \? AND status = 'active'/);
  assert.match(backend, /await conn\.commit\(\)/);
  assert.match(backend, /await conn\.rollback\(\)/);
});

test('kegagalan peminjaman/pengembalian melakukan rollback dan koneksi dilepas', () => {
  assert.match(backend, /catch \(error\) \{\s*try \{ await conn\.rollback\(\); \} catch \{\}\s*throw error;/);
  assert.match(backend, /finally \{\s*conn\.release\(\);/);
  assert.match(backend, /finally \{ conn\.release\(\); \}/);
});
