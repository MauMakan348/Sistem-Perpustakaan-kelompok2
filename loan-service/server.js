// =========================================================
// LOAN SERVICE
// Tanggung jawab: login mahasiswa, mencatat peminjaman,
// menegakkan aturan bisnis, dan berkomunikasi ke Book Service
// via HTTP API. Persistence: MySQL loan_db milik Loan Service.
// =========================================================

require("dotenv").config();
const http = require("http");
const { pool, checkDatabaseConnection } = require("./db");

const PORT = process.env.PORT || 4002;

const BOOK_SERVICE_HOST = process.env.BOOK_SERVICE_HOST || "localhost";
const BOOK_SERVICE_PORT = process.env.BOOK_SERVICE_PORT || 4001;

const MAX_ACTIVE_LOANS = 3;
const LOAN_PERIOD_DAYS = 7;

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

    const request = http.request(options, response => {
      let data = "";
      response.on("data", chunk => (data += chunk));
      response.on("end", () => {
        let parsed = {};
        try {
          parsed = data ? JSON.parse(data) : {};
        } catch {
          parsed = {};
        }
        resolve({ statusCode: response.statusCode, body: parsed });
      });
    });

    request.setTimeout(5000, () => {
      request.destroy(new Error("Book Service timeout"));
    });
    request.on("error", reject);
    if (payload) request.write(payload);
    request.end();
  });
}

async function getActiveLoansForUser(username) {
  const [rows] = await pool.execute(
    `SELECT id, username, book_id AS bookId, book_title AS bookTitle,
            borrow_date AS borrowDate, due_date AS dueDate
     FROM loans
     WHERE username = ? AND due_date >= UTC_TIMESTAMP()
     ORDER BY borrow_date DESC`,
    [username]
  );
  return rows;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const segments = url.pathname.split("/").filter(Boolean);

  if (req.method === "OPTIONS") {
    return sendJSON(res, 204, {});
  }

  try {
    // POST /login { username }
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

    // GET /loans/:username -> daftar peminjaman aktif mahasiswa
    if (req.method === "GET" && segments.length === 2 && segments[0] === "loans") {
      const username = decodeURIComponent(segments[1]);
      const activeLoans = await getActiveLoansForUser(username);
      return sendJSON(res, 200, activeLoans);
    }

    // POST /loans { username, bookId }
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

      const numericBookId = Number(bookId);
      if (!Number.isInteger(numericBookId)) {
        return sendJSON(res, 400, { error: "bookId tidak valid." });
      }

      // 1. Cek batas maksimal 3 buku aktif dari database Loan Service sendiri.
      const activeLoans = await getActiveLoansForUser(username);
      if (activeLoans.length >= MAX_ACTIVE_LOANS) {
        return sendJSON(res, 409, {
          error: `Peminjaman ditolak. Anda sudah memiliki ${MAX_ACTIVE_LOANS} buku aktif.`,
        });
      }

      // 2. Tanya Book Service melalui API.
      let bookResponse;
      try {
        bookResponse = await callBookService("GET", `/books/${numericBookId}`);
      } catch {
        return sendJSON(res, 502, { error: "Book Service tidak dapat dihubungi." });
      }

      if (bookResponse.statusCode === 404) {
        return sendJSON(res, 404, { error: "Buku tidak ditemukan." });
      }
      if (bookResponse.statusCode !== 200) {
        return sendJSON(res, 502, { error: "Book Service mengembalikan error." });
      }

      const book = bookResponse.body;
      if (book.status !== "tersedia") {
        return sendJSON(res, 409, {
          error: "Peminjaman ditolak. Buku sedang dipinjam mahasiswa lain.",
        });
      }

      // 3. Simpan transaksi pada database Loan Service.
      const borrowDate = new Date();
      const dueDate = new Date(borrowDate);
      dueDate.setDate(dueDate.getDate() + LOAN_PERIOD_DAYS);

      const newLoan = {
        id: Date.now(),
        username: username.trim(),
        bookId: numericBookId,
        bookTitle: book.title,
        borrowDate: borrowDate.toISOString(),
        dueDate: dueDate.toISOString(),
      };

      await pool.execute(
        `INSERT INTO loans
         (id, username, book_id, book_title, borrow_date, due_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          newLoan.id,
          newLoan.username,
          newLoan.bookId,
          newLoan.bookTitle,
          new Date(newLoan.borrowDate),
          new Date(newLoan.dueDate),
        ]
      );

      // 4. Minta Book Service mengubah status buku melalui API.
      try {
        const updateResponse = await callBookService(
          "PATCH",
          `/books/${numericBookId}/status`,
          { status: "dipinjam" }
        );
        if (updateResponse.statusCode !== 200) {
          throw new Error("Update status gagal");
        }
      } catch {
        // Rollback transaksi Loan Service jika Book Service gagal diperbarui.
        await pool.execute("DELETE FROM loans WHERE id = ?", [newLoan.id]);
        return sendJSON(res, 502, {
          error: "Gagal memperbarui status buku di Book Service.",
        });
      }

      return sendJSON(res, 201, {
        message: "Buku berhasil dipinjam.",
        loan: newLoan,
      });
    }

    return sendJSON(res, 404, { error: "Endpoint tidak ditemukan." });
  } catch (error) {
    console.error("[Loan Service] database/request error:", error.message);
    return sendJSON(res, 500, { error: "Terjadi kesalahan pada Loan Service." });
  }
});

async function startServer() {
  try {
    await checkDatabaseConnection();
    server.listen(PORT, () => {
      console.log(`[Loan Service] berjalan di http://localhost:${PORT}`);
      console.log(
        `[Loan Service] terhubung ke Book Service di http://${BOOK_SERVICE_HOST}:${BOOK_SERVICE_PORT}`
      );
    });
  } catch {
    console.error("[Loan Service] server tidak dijalankan karena MySQL tidak tersedia.");
    process.exit(1);
  }
}

startServer();
