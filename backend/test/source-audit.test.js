const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));

test('npm start menjalankan backend utama, bukan runner tiga service', () => {
  assert.equal(pkg.scripts.start, 'node backend/server.js');
});
test('backend utama memiliki route auth, buku, peminjaman, pengembalian, dan health', () => {
  for (const route of ['/api/register', '/api/login', '/api/books', '/api/loans', '/health']) {
    assert.ok(source.includes(route), `Route ${route} tidak ditemukan`);
  }
  assert.ok(source.includes('returnMatch = pathname.match(') && source.includes('\\/return$'));
});
test('backend memakai database yang ada dan tidak mengirim HTTP ke service lama', () => {
  assert.match(source, /DB_NAME/);
  assert.doesNotMatch(source, /BOOK_DB_NAME|LOAN_DB_NAME/);
  assert.match(source, /if \(\/\^\\\/api\\\/books\\\/\\d\+\\\/status\$\/\.test\(pathname\) && req\.method === 'PATCH'\)/);
  assert.doesNotMatch(source, /pathname === '\/api\/books' && req\.method === 'PATCH'/);
  assert.match(source, /mysql\.createPool/);
  assert.doesNotMatch(source, /BOOK_SERVICE_PORT|LOAN_SERVICE_PORT|http\.request\(/);
});
test('business rule tiga buku aktif dan jatuh tempo tujuh hari tertulis di backend', () => {
  assert.match(source, /MAX_ACTIVE_LOANS = 3/);
  assert.match(source, /LOAN_PERIOD_DAYS = 7/);
  assert.match(source, /status = 'active'/);
  assert.match(source, /status = 'returned'/);
});
test('secret tidak ditulis ke log dan password disimpan sebagai hash', () => {
  assert.match(source, /bcrypt\.hash/);
  assert.match(source, /password_hash/);
  assert.doesNotMatch(source, /console\.log\([^\n]*(JWT_SECRET|API_KEY|DB_PASSWORD)/);
});
