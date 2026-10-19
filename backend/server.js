'use strict';

// Single-process backend for UTS. Existing MySQL schemas/databases are preserved:
// books use BOOK_DB_NAME (default book_db); users/loans use LOAN_DB_NAME (default loan_db).
require('dotenv').config({ path: process.env.ENV_FILE || require('path').resolve(__dirname, '..', '.env') });
const http = require('http');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const PORT = Number(process.env.PORT || process.env.BACKEND_PORT || process.env.GATEWAY_PORT || 4000);
const API_KEY = process.env.API_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_ISSUER = 'perpustakaan-loan-service';
const MAX_ACTIVE_LOANS = 3;
const LOAN_PERIOD_DAYS = 7;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,32}$/;
const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend');

const commonDb = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
  dateStrings: false,
};
const bookPool = mysql.createPool({ ...commonDb, database: process.env.BOOK_DB_NAME || 'book_db' });
const loanPool = mysql.createPool({ ...commonDb, database: process.env.LOAN_DB_NAME || 'loan_db' });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
};
function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (Buffer.byteLength(data) > 1024 * 1024) reject(Object.assign(new Error('BODY_TOO_LARGE'), { status: 413 }));
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        const parsed = JSON.parse(data);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('INVALID_JSON');
        resolve(parsed);
      } catch { reject(Object.assign(new Error('INVALID_JSON'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}
function getUser(req) {
  const match = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  if (!match || !JWT_SECRET) return null;
  try {
    const payload = jwt.verify(match[1], JWT_SECRET, { issuer: JWT_ISSUER });
    if (!payload.sub || !payload.username) return null;
    return { id: String(payload.sub), username: payload.username, role: payload.role || 'user' };
  } catch { return null; }
}
function requireApiKey(req) { return Boolean(API_KEY) && req.headers['x-api-key'] === API_KEY; }
function requireUser(req, res) {
  const user = getUser(req);
  if (!user) sendJson(res, 401, { error: 'Token autentikasi tidak ada, tidak valid, atau kedaluwarsa.' });
  return user;
}
function serveFrontend(req, res, pathname) {
  if (!['GET', 'HEAD'].includes(req.method)) return false;
  const allowed = {
    '/': ['index.html', 'text/html; charset=utf-8'],
    '/index.html': ['index.html', 'text/html; charset=utf-8'],
    '/style.css': ['style.css', 'text/css; charset=utf-8'],
    '/script.js': ['script.js', 'application/javascript; charset=utf-8'],
  };
  const item = allowed[pathname];
  if (!item) return false;
  fs.readFile(path.join(FRONTEND_DIR, item[0]), (err, content) => {
    if (err) return sendJson(res, 500, { error: 'File frontend gagal dibaca.' });
    res.writeHead(200, { 'Content-Type': item[1], 'Cache-Control': 'no-cache', ...corsHeaders });
    res.end(req.method === 'HEAD' ? undefined : content);
  });
  return true;
}
async function getBook(bookId) {
  const [rows] = await bookPool.execute('SELECT id, title, author, status FROM books WHERE id = ?', [bookId]);
  return rows[0] || null;
}
async function setBookStatus(bookId, newStatus, expectedStatus) {
  const [result] = await bookPool.execute('UPDATE books SET status = ? WHERE id = ? AND status = ?', [newStatus, bookId, expectedStatus]);
  return result.affectedRows === 1;
}
async function getActiveLoans(username) {
  const [rows] = await loanPool.execute(
    `SELECT id, username, book_id AS bookId, book_title AS bookTitle, borrow_date AS borrowDate, due_date AS dueDate
     FROM loans WHERE username = ? AND status = 'active' ORDER BY borrow_date DESC`, [username]);
  return rows;
}
async function getUserLoans(username) {
  const [rows] = await loanPool.execute(
    `SELECT id, username, book_id AS bookId, book_title AS bookTitle, borrow_date AS borrowDate,
     due_date AS dueDate, status, returned_at AS returnedAt FROM loans WHERE username = ? ORDER BY borrow_date DESC`, [username]);
  return rows;
}

const server = http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, `http://localhost:${PORT}`); }
  catch { return sendJson(res, 400, { error: 'URL request tidak valid.' }); }
  const pathname = url.pathname;
  if (req.method === 'OPTIONS') { res.writeHead(204, corsHeaders); return res.end(); }
  if (serveFrontend(req, res, pathname)) return;
  if (req.method === 'GET' && pathname === '/health') return sendJson(res, 200, { service: 'Sistem Perpustakaan Backend', status: 'ok' });
  if (req.method === 'GET' && pathname === '/') return sendJson(res, 200, {
    service: 'Sistem Perpustakaan Backend', status: 'ok',
    endpoints: { register: 'POST /api/register', login: 'POST /api/login', books: 'GET /api/books', loans: 'POST /api/loans' },
  });

  try {
    // Auth routes
    if (pathname === '/api/register' && req.method === 'POST') {
      const body = await readBody(req);
      if (typeof body.username !== 'string' || typeof body.password !== 'string') return sendJson(res, 400, { error: 'username dan password wajib diisi.' });
      const username = body.username.trim().toLowerCase();
      if (!USERNAME_PATTERN.test(username)) return sendJson(res, 400, { error: 'Username harus 3-32 karakter dan hanya boleh berisi huruf, angka, atau underscore.' });
      if (body.password.length < 8 || Buffer.byteLength(body.password, 'utf8') > 72) return sendJson(res, 400, { error: 'Password harus minimal 8 karakter dan maksimal 72 byte.' });
      const hash = await bcrypt.hash(body.password, 12);
      try {
        const [result] = await loanPool.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
        return sendJson(res, 201, { message: 'Registrasi berhasil.', user: { id: result.insertId, username } });
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return sendJson(res, 409, { error: 'Username sudah digunakan.' });
        throw error;
      }
    }
    if (pathname === '/api/login' && req.method === 'POST') {
      const body = await readBody(req);
      if (typeof body.username !== 'string' || typeof body.password !== 'string' || !body.username.trim() || !body.password) return sendJson(res, 400, { error: 'username dan password wajib diisi.' });
      const username = body.username.trim().toLowerCase();
      const [rows] = await loanPool.execute('SELECT id, username, password_hash, role FROM users WHERE username = ? LIMIT 1', [username]);
      if (!rows.length || !(await bcrypt.compare(body.password, rows[0].password_hash))) return sendJson(res, 401, { error: 'Username atau password salah.' });
      const user = { id: rows[0].id, username: rows[0].username, role: rows[0].role || 'user' };
      const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { subject: String(user.id), issuer: JWT_ISSUER, expiresIn: process.env.JWT_EXPIRES_IN || '2h' });
      return sendJson(res, 200, { message: 'Login berhasil.', token, tokenType: 'Bearer', expiresIn: process.env.JWT_EXPIRES_IN || '2h', user });
    }

    // Book catalogue: authenticated user or trusted API key may read.
    if ((pathname === '/api/books' || /^\/api\/books\/[^/]+$/.test(pathname)) && req.method === 'GET') {
      if (!getUser(req) && !requireApiKey(req)) return sendJson(res, 401, { error: 'API Key atau token pengguna yang valid diperlukan.' });
      if (pathname === '/api/books') {
        const [rows] = await bookPool.query('SELECT id, title, author, status FROM books ORDER BY id');
        return sendJson(res, 200, rows);
      }
      const id = Number(pathname.split('/')[3]);
      if (!Number.isSafeInteger(id) || id <= 0) return sendJson(res, 400, { error: 'ID buku tidak valid.' });
      const book = await getBook(id);
      return book ? sendJson(res, 200, book) : sendJson(res, 404, { error: 'Buku tidak ditemukan.' });
    }
    if (pathname === '/api/books' && req.method === 'POST') {
      const user = requireUser(req, res); if (!user) return;
      if (user.role !== 'admin') return sendJson(res, 403, { error: 'Hanya admin yang berwenang menambahkan buku.' });
      const body = await readBody(req);
      if (typeof body.title !== 'string' || !body.title.trim() || typeof body.author !== 'string' || !body.author.trim()) return sendJson(res, 400, { error: 'Judul dan penulis buku wajib diisi.' });
      const title = body.title.trim(), author = body.author.trim();
      if (title.length > 500 || author.length > 255) return sendJson(res, 400, { error: 'Judul maksimal 500 karakter dan penulis maksimal 255 karakter.' });
      const [result] = await bookPool.execute("INSERT INTO books (title, author, status) VALUES (?, ?, 'tersedia')", [title, author]);
      return sendJson(res, 201, { message: 'Buku berhasil ditambahkan.', book: await getBook(result.insertId) });
    }
    if (pathname === '/api/books' && req.method === 'PATCH' || /^\/api\/books\/\d+\/status$/.test(pathname) && req.method === 'PATCH') {
      if (!requireApiKey(req)) return sendJson(res, 401, { error: 'API Key Gateway yang valid diperlukan.' });
      const body = await readBody(req);
      if (!['tersedia', 'dipinjam'].includes(body.status)) return sendJson(res, 400, { error: 'Status tidak valid.' });
      const id = Number(pathname.split('/')[3]);
      if (!Number.isSafeInteger(id) || id <= 0) return sendJson(res, 400, { error: 'ID buku tidak valid.' });
      const expected = body.status === 'dipinjam' ? 'tersedia' : 'dipinjam';
      const changed = await setBookStatus(id, body.status, expected);
      const book = await getBook(id);
      if (!book) return sendJson(res, 404, { error: 'Buku tidak ditemukan.' });
      if (!changed) return sendJson(res, 409, { error: `Transisi status ditolak. Status buku saat ini: ${book.status}.`, book });
      return sendJson(res, 200, { message: 'Status buku diperbarui.', book });
    }

    // Loan history
    const user = getUser(req);
    if (pathname.startsWith('/api/loans')) {
      if (!user) return sendJson(res, 401, { error: 'Token autentikasi tidak ada, tidak valid, atau kedaluwarsa.' });
      if (req.method === 'GET' && /^\/api\/loans\/[^/]+$/.test(pathname)) {
        let requested; try { requested = decodeURIComponent(pathname.split('/')[3]).trim().toLowerCase(); } catch { return sendJson(res, 400, { error: 'Username tidak valid.' }); }
        if (requested !== user.username) return sendJson(res, 403, { error: 'Anda tidak berhak melihat peminjaman pengguna lain.' });
        return sendJson(res, 200, await getUserLoans(user.username));
      }
      if (req.method === 'POST' && pathname === '/api/loans') {
        const body = await readBody(req);
        if (body.bookId === undefined || body.bookId === null || body.bookId === '') return sendJson(res, 400, { error: 'bookId wajib diisi.' });
        if (body.username && String(body.username).trim().toLowerCase() !== user.username) return sendJson(res, 403, { error: 'Username request tidak sesuai dengan pengguna login.' });
        const bookId = Number(body.bookId);
        if (!Number.isSafeInteger(bookId) || bookId <= 0) return sendJson(res, 400, { error: 'bookId tidak valid.' });
        const active = await getActiveLoans(user.username);
        if (active.length >= MAX_ACTIVE_LOANS) return sendJson(res, 409, { error: `Peminjaman ditolak. Anda sudah memiliki ${MAX_ACTIVE_LOANS} buku aktif.` });
        const book = await getBook(bookId);
        if (!book) return sendJson(res, 404, { error: 'Buku tidak ditemukan.' });
        if (book.status !== 'tersedia') return sendJson(res, 409, { error: 'Peminjaman ditolak. Buku sedang dipinjam mahasiswa lain.' });
        const reserved = await setBookStatus(bookId, 'dipinjam', 'tersedia');
        if (!reserved) return sendJson(res, 409, { error: 'Peminjaman ditolak. Buku sudah tidak tersedia.' });
        const borrowDate = new Date(); const dueDate = new Date(borrowDate); dueDate.setUTCDate(dueDate.getUTCDate() + LOAN_PERIOD_DAYS);
        const loanId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
        try {
          await loanPool.execute("INSERT INTO loans (id, username, book_id, book_title, borrow_date, due_date, status) VALUES (?, ?, ?, ?, ?, ?, 'active')", [loanId, user.username, bookId, book.title, borrowDate, dueDate]);
        } catch (error) {
          await setBookStatus(bookId, 'tersedia', 'dipinjam');
          throw error;
        }
        return sendJson(res, 201, { message: 'Buku berhasil dipinjam.', loan: { id: loanId, username: user.username, bookId, bookTitle: book.title, borrowDate: borrowDate.toISOString(), dueDate: dueDate.toISOString(), status: 'active' } });
      }
      const returnMatch = pathname.match(/^\/api\/loans\/(\d+)\/return$/);
      if (req.method === 'POST' && returnMatch) {
        const loanId = Number(returnMatch[1]); if (!Number.isSafeInteger(loanId) || loanId <= 0) return sendJson(res, 400, { error: 'ID transaksi tidak valid.' });
        const conn = await loanPool.getConnection(); let bookId = null; let bookMadeAvailable = false;
        try {
          await conn.beginTransaction();
          const [rows] = await conn.execute('SELECT id, username, book_id AS bookId, book_title AS bookTitle, status FROM loans WHERE id = ? FOR UPDATE', [loanId]);
          if (!rows.length) { await conn.rollback(); return sendJson(res, 404, { error: 'Transaksi peminjaman tidak ditemukan.' }); }
          const loan = rows[0];
          if (loan.username !== user.username) { await conn.rollback(); return sendJson(res, 403, { error: 'Anda tidak berhak mengembalikan transaksi pengguna lain.' }); }
          if (loan.status === 'returned') { await conn.rollback(); return sendJson(res, 409, { error: 'Transaksi ini sudah dikembalikan.' }); }
          if (loan.status !== 'active') { await conn.rollback(); return sendJson(res, 409, { error: 'Status transaksi tidak memungkinkan pengembalian.' }); }
          bookId = Number(loan.bookId);
          const book = await getBook(bookId);
          if (!book) { await conn.rollback(); return sendJson(res, 409, { error: 'Data buku tidak ditemukan; transaksi belum diubah.' }); }
          if (book.status !== 'dipinjam') { await conn.rollback(); return sendJson(res, 409, { error: 'Status buku tidak sesuai dengan transaksi aktif; perlu pemeriksaan petugas.' }); }
          bookMadeAvailable = await setBookStatus(bookId, 'tersedia', 'dipinjam');
          if (!bookMadeAvailable) { await conn.rollback(); return sendJson(res, 409, { error: 'Status buku berubah bersamaan; silakan coba lagi.' }); }
          const [updated] = await conn.execute("UPDATE loans SET status = 'returned', returned_at = UTC_TIMESTAMP(3) WHERE id = ? AND status = 'active'", [loanId]);
          if (updated.affectedRows !== 1) throw new Error('Transaksi tidak lagi aktif saat pembaruan status.');
          const [returnedRows] = await conn.execute('SELECT returned_at AS returnedAt FROM loans WHERE id = ?', [loanId]);
          await conn.commit();
          return sendJson(res, 200, { message: 'Buku berhasil dikembalikan.', loan: { id: loan.id, username: loan.username, bookId: loan.bookId, bookTitle: loan.bookTitle, status: 'returned', returnedAt: returnedRows[0].returnedAt } });
        } catch (error) {
          try { await conn.rollback(); } catch {}
          if (bookMadeAvailable && bookId !== null) {
            try { await setBookStatus(bookId, 'dipinjam', 'tersedia'); }
            catch { console.error('[Backend] Kompensasi status buku gagal; perlu rekonsiliasi.'); }
          }
          throw error;
        } finally { conn.release(); }
      }
    }
    return sendJson(res, 404, { error: 'Endpoint tidak ditemukan.' });
  } catch (error) {
    if (error.status) return sendJson(res, error.status, { error: error.status === 413 ? 'Ukuran request terlalu besar.' : 'Body JSON tidak valid.' });
    console.error(`[Backend] request/database error (${error.code || 'INTERNAL_ERROR'})`);
    return sendJson(res, 500, { error: 'Terjadi kesalahan pada backend.' });
  }
});

async function start() {
  if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET, 'utf8') < 32) {
    console.error('JWT_SECRET belum diatur atau terlalu pendek (minimal 32 byte).'); process.exit(1);
  }
  if (!API_KEY) console.warn('[Backend] API_KEY belum diatur; endpoint yang membutuhkannya akan menolak request.');
  try {
    await bookPool.query('SELECT 1');
    await loanPool.query('SELECT 1');
    console.log('[Backend] Koneksi database buku dan transaksi berhasil.');
    server.listen(PORT, '0.0.0.0', () => console.log(`[Backend] Sistem Perpustakaan berjalan pada port ${PORT}`));
  } catch (error) {
    console.error(`[Backend] Database tidak tersedia (${error.code || 'DB_CONNECTION_ERROR'}). Server tidak dijalankan.`);
    process.exit(1);
  }
}
if (require.main === module) start();
module.exports = { server, getUser };
