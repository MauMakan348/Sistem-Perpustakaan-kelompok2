const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const backend = fs.readFileSync(path.join(root, 'backend/server.js'), 'utf8');
const contract = fs.readFileSync(path.join(root, 'docs/API-CONTRACT.md'), 'utf8');

test('peminjaman mengunci pengguna dan menghitung pinjaman aktif di transaksi', () => {
  assert.match(backend, /await conn\.beginTransaction\(\)/);
  assert.match(backend, /SELECT id, username FROM users WHERE id = \? AND username = \? FOR UPDATE/);
  assert.match(backend, /SELECT COUNT\(\*\) AS activeCount FROM loans WHERE username = \? AND status = 'active'/);
  assert.match(backend, /activeCount >= MAX_ACTIVE_LOANS/);
});

test('peminjaman hanya mereservasi buku dengan perubahan status bersyarat', () => {
  assert.match(backend, /UPDATE books SET status = 'dipinjam' WHERE id = \? AND status = 'tersedia'/);
  assert.match(backend, /Peminjaman ditolak\. Buku sedang dipinjam mahasiswa lain\./);
  assert.match(backend, /INSERT INTO loans \(username, book_id, book_title, borrow_date, due_date, status\)/);
});

test('tanggal jatuh tempo tujuh hari dihitung server-side dan transaksi disimpan', () => {
  assert.match(backend, /LOAN_PERIOD_DAYS = 7/);
  assert.match(backend, /LOAN_PERIOD_DAYS \* 24 \* 60 \* 60 \* 1000/);
  assert.match(backend, /await conn\.commit\(\)/);
  assert.match(backend, /const pool = mysql\.createPool/);
  assert.doesNotMatch(backend, /bookPool|loanPool/);
});

test('pengembalian mengunci transaksi dan memeriksa kepemilikan/status', () => {
  assert.match(backend, /SELECT id, username, book_id AS bookId, book_title AS bookTitle, status FROM loans WHERE id = \? FOR UPDATE/);
  assert.match(backend, /loan\.username !== user\.username/);
  assert.match(backend, /loan\.status === 'returned'/);
  assert.match(backend, /UPDATE loans SET status = 'returned', returned_at = UTC_TIMESTAMP\(3\) WHERE id = \? AND status = 'active'/);
  assert.match(backend, /UPDATE books SET status = 'tersedia' WHERE id = \? AND status = 'dipinjam'/);
});

test('kontrak API mencatat endpoint dan status business rule pinjam/kembali', () => {
  assert.match(contract, /### `POST \/api\/loans`/);
  assert.match(contract, /### `POST \/api\/loans\/:id\/return`/);
  assert.match(contract, /`409` — pengguna sudah memiliki 3 peminjaman aktif atau buku sudah tidak tersedia/);
  assert.match(contract, /`403` — transaksi milik pengguna lain/);
});
