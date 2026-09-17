// =========================================================
// BOOK SERVICE
// Tanggung jawab: menyimpan data buku & status ketersediaannya.
// Service ini TIDAK tahu apa-apa soal mahasiswa/peminjaman —
// itu tanggung jawab Loan Service.
//
// Ditulis hanya dengan modul bawaan Node.js (http, fs) supaya
// bisa langsung dijalankan dengan `node server.js` tanpa
// perlu `npm install`.
// =========================================================

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4001;
const DB_FILE = path.join(__dirname, "books.json");

function readBooks() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function writeBooks(books) {
  fs.writeFileSync(DB_FILE, JSON.stringify(books, null, 2));
}

function sendJSON(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => (data += chunk));
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const segments = url.pathname.split("/").filter(Boolean); // ["books", ":id", "status"]

  // Preflight CORS
  if (req.method === "OPTIONS") {
    return sendJSON(res, 204, {});
  }

  // ---------------------------------------------------
  // GET /books -> daftar semua buku
  // ---------------------------------------------------
  if (req.method === "GET" && segments.length === 1 && segments[0] === "books") {
    return sendJSON(res, 200, readBooks());
  }

  // ---------------------------------------------------
  // GET /books/:id -> detail satu buku
  // ---------------------------------------------------
  if (req.method === "GET" && segments.length === 2 && segments[0] === "books") {
    const id = Number(segments[1]);
    const book = readBooks().find(b => b.id === id);
    if (!book) return sendJSON(res, 404, { error: "Buku tidak ditemukan." });
    return sendJSON(res, 200, book);
  }

  // ---------------------------------------------------
  // PATCH /books/:id/status -> ubah status buku
  // Dipanggil oleh Loan Service saat buku dipinjam.
  // Body: { "status": "tersedia" | "dipinjam" }
  // ---------------------------------------------------
  if (req.method === "PATCH" && segments.length === 3 && segments[0] === "books" && segments[2] === "status") {
    let body;
    try {
      body = await readBody(req);
    } catch {
      return sendJSON(res, 400, { error: "Body JSON tidak valid." });
    }

    if (!["tersedia", "dipinjam"].includes(body.status)) {
      return sendJSON(res, 400, { error: "Status tidak valid." });
    }

    const id = Number(segments[1]);
    const books = readBooks();
    const book = books.find(b => b.id === id);
    if (!book) return sendJSON(res, 404, { error: "Buku tidak ditemukan." });

    book.status = body.status;
    writeBooks(books);
    return sendJSON(res, 200, { message: "Status buku diperbarui.", book });
  }

  sendJSON(res, 404, { error: "Endpoint tidak ditemukan." });
});

server.listen(PORT, () => {
  console.log(`[Book Service] berjalan di http://localhost:${PORT}`);
});
