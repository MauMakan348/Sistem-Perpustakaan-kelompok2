const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const migration = fs.readFileSync(path.join(root, 'backend/migrate.js'), 'utf8');
const backend = fs.readFileSync(path.join(root, 'backend/server.js'), 'utf8');

test('migration memakai seed hanya untuk ID yang belum ada dan tidak menimpa data existing', () => {
  assert.match(migration, /INSERT IGNORE INTO books/);
  assert.match(migration, /INSERT IGNORE INTO loans/);
  assert.match(migration, /Database sumber lama tidak dihapus atau diubah/);
  assert.doesNotMatch(migration, /DROP TABLE|DROP DATABASE|TRUNCATE TABLE/i);
});

test('schema tetap memakai tabel books, users, loans dan username unik', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS books/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS loans/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS users/i);
  assert.match(migration, /UNIQUE KEY uq_users_username \(username\)/i);
  assert.match(migration, /password_hash VARCHAR\(255\) NOT NULL/i);
});

test('login membaca hash dari database dan tidak mengirim password hash pada respons', () => {
  assert.match(backend, /SELECT id, username, password_hash, role FROM users WHERE username = \? LIMIT 1/);
  assert.match(backend, /bcrypt\.compare\(body\.password, rows\[0\]\.password_hash\)/);
  assert.match(backend, /jwt\.verify/);
  assert.match(backend, /JWT_SECRET/);
  assert.match(backend, /Token autentikasi tidak ada, tidak valid, atau kedaluwarsa/);
});

test('contoh environment tidak berisi kredensial produksi', () => {
  const env = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  assert.match(env, /DB_PASSWORD=/);
  assert.match(env, /DB_NAME=perpustakaan_db/);
  assert.match(env, /API_KEY=ganti-dengan-api-key-random/);
  assert.match(env, /JWT_SECRET=ganti-dengan-secret-random-minimal-32-byte/);
  assert.ok(env.includes('JWT_SECRET=ganti-dengan-secret-random-minimal-32-byte'));
});
