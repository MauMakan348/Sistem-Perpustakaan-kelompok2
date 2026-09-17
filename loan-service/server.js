// =========================================================
// LOAN SERVICE
// Tanggung jawab: login mahasiswa, mencatat peminjaman,
// menegakkan aturan bisnis (maks 3 buku aktif, masa pinjam 7 hari),
// dan BERKOMUNIKASI ke Book Service via HTTP API untuk
// cek/ubah status ketersediaan buku.
//
// Ditulis hanya dengan modul bawaan Node.js (http, fs) supaya
// bisa langsung dijalankan dengan `node server.js` tanpa
// perlu `npm install`.
// =========================================================

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4002;
const DB_FILE = path.join(__dirname, "loans.json");

// URL Book Service (antar-service berkomunikasi lewat API ini)
const BOOK_SERVICE_HOST = process.env.BOOK_SERVICE_HOST || "localhost";
const BOOK_SERVICE_PORT = process.env.BOOK_SERVICE_PORT || 4001;

const MAX_ACTIVE_LOANS = 3;
const LOAN_PERIOD_DAYS = 7;

function readLoans() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function writeLoans(loans) {
  fs.writeFileSync(DB_FILE, JSON.stringify(loans, null, 2));
}

function isActive(loan) {
  return new Date() <= new Date(loan.dueDate);
}

function getActiveLoansForUser(username) {
  return readLoans().filter(l => l.username === username && isActive(l));
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

// ---------------------------------------------------------
// Helper: memanggil Book Service (komunikasi antar-service)
// ---------------------------------------------------------
function callBookService(method, pathName, bodyObj) {
  return new Promise((resolve, reject) => {
    const payload = bodyObj ? JSON.stringify(bodyObj) : null;

    const options = {
      hostname: BOOK_SERVICE_HOST,
      port: BOOK_SERVICE_PORT,
      path: pathName,
      method,
      headers: { "Content-Type": "application/json" },
    };

    const req = http.request(options, res => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => {
        let parsed = {};
        try {
          parsed = data ? JSON.parse(data) : {};
        } catch {
          /* ignore parse error, keep empty object */
        }
        resolve({ statusCode: res.statusCode, body: parsed });
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const segments = url.pathname.split("/").filter(Boolean);

  if (req.method === "OPTIONS") {
    return sendJSON(res, 204, {});
  }

  // ---------------------------------------------------
  // POST /login  { username }
  // ---------------------------------------------------
  if (req.method === "POST" && segments.length === 1 && segments[0] === "login") {
    let body;
    try {
      body = await readBody(req);
    } catch {
      return sendJSON(res, 400, { error: "Body JSON tidak valid." });
    }

    if (!body.username || !body.username.trim()) {
      return sendJSON(res, 400, { error: "Nama mahasiswa harus diisi." });
    }
    return sendJSON(res, 200, { username: body.username.trim() });
  }

  // ---------------------------------------------------
  // GET /loans/:username -> daftar peminjaman aktif mahasiswa
  // ---------------------------------------------------
  if (req.method === "GET" && segments.length === 2 && segments[0] === "loans") {
    const activeLoans = getActiveLoansForUser(decodeURIComponent(segments[1]));
    return sendJSON(res, 200, activeLoans);
  }

  // ---------------------------------------------------
  // POST /loans  { username, bookId }
  // Alur fitur utama yang melibatkan 2 service:
  //   1. Cek limit 3 buku (data sendiri)
  //   2. Tanya Book Service: buku ini tersedia? (panggilan antar-service)
  //   3. Kalau boleh, catat peminjaman
  //   4. Suruh Book Service ubah status jadi "dipinjam" (panggilan antar-service)
  // ---------------------------------------------------
  if (req.method === "POST" && segments.length === 1 && segments[0] === "loans") {
    let body;
    try {
      body = await readBody(req);
    } catch {
      return sendJSON(res, 400, { error: "Body JSON tidak valid." });
    }

    const { username, bookId } = body;
    if (!username || !bookId) {
      return sendJSON(res, 400, { error: "username dan bookId wajib diisi." });
    }

    // 1. Cek batas maksimal 3 buku aktif
    const activeLoans = getActiveLoansForUser(username);
    if (activeLoans.length >= MAX_ACTIVE_LOANS) {
      return sendJSON(res, 409, {
        error: `Peminjaman ditolak. Anda sudah memiliki ${MAX_ACTIVE_LOANS} buku aktif.`,
      });
    }

    // 2. Tanya Book Service apakah buku tersedia
    let bookResponse;
    try {
      bookResponse = await callBookService("GET", `/books/${bookId}`);
    } catch {
      return sendJSON(res, 502, { error: "Book Service tidak dapat dihubungi." });
    }

    if (bookResponse.statusCode === 404) {
      return sendJSON(res, 404, { error: "Buku tidak ditemukan." });
    }
    const book = bookResponse.body;

    if (book.status !== "tersedia") {
      return sendJSON(res, 409, {
        error: "Peminjaman ditolak. Buku sedang dipinjam mahasiswa lain.",
      });
    }

    // 3. Catat peminjaman baru
    const borrowDate = new Date();
    const dueDate = new Date(borrowDate);
    dueDate.setDate(dueDate.getDate() + LOAN_PERIOD_DAYS);

    const newLoan = {
      id: Date.now(),
      username,
      bookId: Number(bookId),
      bookTitle: book.title,
      borrowDate: borrowDate.toISOString(),
      dueDate: dueDate.toISOString(),
    };

    const loans = readLoans();
    loans.push(newLoan);
    writeLoans(loans);

    // 4. Update status buku jadi "dipinjam" di Book Service
    try {
      const updateResponse = await callBookService("PATCH", `/books/${bookId}/status`, {
        status: "dipinjam",
      });
      if (updateResponse.statusCode !== 200) {
        throw new Error("Update status gagal");
      }
    } catch {
      // Rollback pencatatan peminjaman jika Book Service gagal diupdate,
      // supaya data kedua service tetap konsisten.
      writeLoans(loans.filter(l => l.id !== newLoan.id));
      return sendJSON(res, 502, { error: "Gagal memperbarui status buku di Book Service." });
    }

    return sendJSON(res, 201, { message: "Buku berhasil dipinjam.", loan: newLoan });
  }

  sendJSON(res, 404, { error: "Endpoint tidak ditemukan." });
});

server.listen(PORT, () => {
  console.log(`[Loan Service] berjalan di http://localhost:${PORT}`);
  console.log(`[Loan Service] terhubung ke Book Service di http://${BOOK_SERVICE_HOST}:${BOOK_SERVICE_PORT}`);
});
