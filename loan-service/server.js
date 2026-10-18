// =========================================================
// LOAN SERVICE
// Tanggung jawab: registrasi/login pengguna, autentikasi token,
// transaksi peminjaman, aturan bisnis, dan komunikasi ke Book
// Service melalui HTTP API. Persistence: MySQL loan_db.
// =========================================================

require("dotenv").config();
const http = require("http");
const { pool, checkDatabaseConnection } = require("./db");
const {
  hashPassword,
  verifyPassword,
  createAccessToken,
  getAuthenticatedUser,
} = require("./auth");

const PORT = Number(process.env.LOAN_PORT || process.env.PORT || 4002);
const BOOK_SERVICE_HOST = process.env.BOOK_SERVICE_HOST || "127.0.0.1";
const BOOK_SERVICE_PORT = Number(process.env.BOOK_SERVICE_PORT || 4001);
const JWT_SECRET = process.env.JWT_SECRET;

const MAX_ACTIVE_LOANS = 3;
const LOAN_PERIOD_DAYS = 7;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,32}$/;

if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET, "utf8") < 32) {
  console.error("JWT_SECRET belum diatur atau terlalu pendek. Gunakan secret random minimal 32 byte.");
  process.exit(1);
}

function sendJSON(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
      if (Buffer.byteLength(data) > 1024 * 1024) {
        reject(new Error("REQUEST_BODY_TOO_LARGE"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        const parsed = JSON.parse(data);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          return reject(new Error("INVALID_JSON_OBJECT"));
        }
        resolve(parsed);
      } catch (error) {
        reject(error);
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

    request.setTimeout(5000, () => request.destroy(new Error("Book Service timeout")));
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
     WHERE username = ? AND status = 'active'
     ORDER BY borrow_date DESC`,
    [username]
  );
  return rows;
}

async function getLoansForUser(username) {
  const [rows] = await pool.execute(
    `SELECT id, username, book_id AS bookId, book_title AS bookTitle,
            borrow_date AS borrowDate, due_date AS dueDate,
            status, returned_at AS returnedAt
     FROM loans WHERE username = ? ORDER BY borrow_date DESC`,
    [username]
  );
  return rows;
}

async function readJsonBodyOrRespond(req, res) {
  try {
    return await readBody(req);
  } catch (error) {
    sendJSON(res, 400, {
      error: error.message === "REQUEST_BODY_TOO_LARGE"
        ? "Ukuran request terlalu besar."
        : "Body JSON tidak valid.",
    });
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const segments = url.pathname.split("/").filter(Boolean);

  if (req.method === "OPTIONS") return sendJSON(res, 204, {});

  try {
    // POST /register { username, password }
    if (req.method === "POST" && segments.length === 1 && segments[0] === "register") {
      const body = await readJsonBodyOrRespond(req, res);
      if (!body) return;

      if (typeof body.username !== "string" || typeof body.password !== "string") {
        return sendJSON(res, 400, { error: "username dan password wajib diisi." });
      }

      const username = body.username.trim().toLowerCase();
      const password = body.password;
      if (!USERNAME_PATTERN.test(username)) {
        return sendJSON(res, 400, {
          error: "Username harus 3-32 karakter dan hanya boleh berisi huruf, angka, atau underscore.",
        });
      }
      if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
        return sendJSON(res, 400, { error: "Password harus minimal 8 karakter dan maksimal 72 byte." });
      }

      const passwordHash = await hashPassword(password);
      try {
        const [result] = await pool.execute(
          "INSERT INTO users (username, password_hash) VALUES (?, ?)",
          [username, passwordHash]
        );
        return sendJSON(res, 201, {
          message: "Registrasi berhasil.",
          user: { id: result.insertId, username },
        });
      } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
          return sendJSON(res, 409, { error: "Username sudah digunakan." });
        }
        throw error;
      }
    }

    // POST /login { username, password }
    if (req.method === "POST" && segments.length === 1 && segments[0] === "login") {
      const body = await readJsonBodyOrRespond(req, res);
      if (!body) return;
      if (typeof body.username !== "string" || typeof body.password !== "string" ||
          !body.username.trim() || !body.password) {
        return sendJSON(res, 400, { error: "username dan password wajib diisi." });
      }

      const username = body.username.trim().toLowerCase();
      const [rows] = await pool.execute(
        "SELECT id, username, password_hash, role FROM users WHERE username = ? LIMIT 1",
        [username]
      );
      if (rows.length === 0 || !(await verifyPassword(body.password, rows[0].password_hash))) {
        return sendJSON(res, 401, { error: "Username atau password salah." });
      }

      const user = { id: rows[0].id, username: rows[0].username, role: rows[0].role || "user" };
      const token = createAccessToken(user);
      return sendJSON(res, 200, {
        message: "Login berhasil.",
        token,
        tokenType: "Bearer",
        expiresIn: process.env.JWT_EXPIRES_IN || "2h",
        user,
      });
    }

    // Semua endpoint transaksi memerlukan token pengguna yang valid.
    const authenticatedUser = getAuthenticatedUser(req);
    if (!authenticatedUser) {
      return sendJSON(res, 401, { error: "Token autentikasi tidak ada, tidak valid, atau kedaluwarsa." });
    }

    // GET /loans/:username -> daftar peminjaman aktif milik pengguna login
    if (req.method === "GET" && segments.length === 2 && segments[0] === "loans") {
      let requestedUsername;
      try {
        requestedUsername = decodeURIComponent(segments[1]).trim().toLowerCase();
      } catch {
        return sendJSON(res, 400, { error: "Username tidak valid." });
      }
      if (requestedUsername !== authenticatedUser.username) {
        return sendJSON(res, 403, { error: "Anda tidak berhak melihat peminjaman pengguna lain." });
      }
      const loans = await getLoansForUser(authenticatedUser.username);
      return sendJSON(res, 200, loans);
    }

    // POST /loans/:id/return -> hanya pemilik transaksi dapat mengembalikan.
    // Row lock mencegah dua request mengembalikan transaksi yang sama bersamaan.
    if (req.method === "POST" && segments.length === 3 && segments[0] === "loans" && segments[2] === "return") {
      const loanId = segments[1];
      if (!/^\d+$/.test(loanId) || !Number.isSafeInteger(Number(loanId)) || Number(loanId) <= 0) {
        return sendJSON(res, 400, { error: "ID transaksi tidak valid." });
      }

      let connection;
      let bookMarkedAvailable = false;
      let bookIdToCompensate = null;
      try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const [rows] = await connection.execute(
          `SELECT id, username, book_id AS bookId, book_title AS bookTitle, status
           FROM loans WHERE id = ? FOR UPDATE`,
          [loanId]
        );
        if (rows.length === 0) {
          await connection.rollback();
          return sendJSON(res, 404, { error: "Transaksi peminjaman tidak ditemukan." });
        }
        const loan = rows[0];
        if (loan.username !== authenticatedUser.username) {
          await connection.rollback();
          return sendJSON(res, 403, { error: "Anda tidak berhak mengembalikan transaksi pengguna lain." });
        }
        if (loan.status === "returned") {
          await connection.rollback();
          return sendJSON(res, 409, { error: "Transaksi ini sudah dikembalikan." });
        }
        if (loan.status !== "active") {
          await connection.rollback();
          return sendJSON(res, 409, { error: "Status transaksi tidak memungkinkan pengembalian." });
        }

        bookIdToCompensate = Number(loan.bookId);
        let bookResponse;
        try {
          bookResponse = await callBookService("GET", `/books/${bookIdToCompensate}`);
        } catch {
          await connection.rollback();
          return sendJSON(res, 502, { error: "Book Service tidak dapat dihubungi; transaksi belum diubah." });
        }
        if (bookResponse.statusCode === 404) {
          await connection.rollback();
          return sendJSON(res, 502, { error: "Data buku tidak ditemukan di Book Service; transaksi belum diubah." });
        }
        if (bookResponse.statusCode !== 200) {
          await connection.rollback();
          return sendJSON(res, 502, { error: "Book Service mengembalikan error; transaksi belum diubah." });
        }
        if (bookResponse.body.status !== "dipinjam") {
          await connection.rollback();
          return sendJSON(res, 409, { error: "Status buku tidak sesuai dengan transaksi aktif; perlu pemeriksaan petugas." });
        }

        try {
          const updateBook = await callBookService(
            "PATCH", `/books/${bookIdToCompensate}/status`, { status: "tersedia" }
          );
          if (updateBook.statusCode !== 200) throw new Error("Book Service gagal mengubah status buku");
          bookMarkedAvailable = true;
        } catch {
          await connection.rollback();
          return sendJSON(res, 502, { error: "Book Service gagal memperbarui status buku; transaksi belum diubah." });
        }

        const [updateResult] = await connection.execute(
          `UPDATE loans SET status = 'returned', returned_at = UTC_TIMESTAMP(3)
           WHERE id = ? AND status = 'active'`,
          [loanId]
        );
        if (updateResult.affectedRows !== 1) {
          throw new Error("Transaksi tidak lagi aktif saat pembaruan status.");
        }
        const [returnedRows] = await connection.execute(
          "SELECT returned_at AS returnedAt FROM loans WHERE id = ?",
          [loanId]
        );
        await connection.commit();
        return sendJSON(res, 200, {
          message: "Buku berhasil dikembalikan.",
          loan: {
            id: loan.id,
            username: loan.username,
            bookId: loan.bookId,
            bookTitle: loan.bookTitle,
            status: "returned",
            returnedAt: returnedRows[0].returnedAt,
          },
        });
      } catch (error) {
        if (connection) {
          try { await connection.rollback(); } catch {}
        }
        // Kompensasi jika Book Service sudah mengubah status tetapi transaksi DB gagal.
        if (bookMarkedAvailable && bookIdToCompensate !== null) {
          try {
            const compensation = await callBookService(
              "PATCH", `/books/${bookIdToCompensate}/status`, { status: "dipinjam" }
            );
            if (compensation.statusCode !== 200) {
              console.error("[Loan Service] kompensasi status buku gagal; perlu rekonsiliasi manual.");
            }
          } catch {
            console.error("[Loan Service] Book Service tidak tersedia untuk kompensasi; perlu rekonsiliasi manual.");
          }
        }
        throw error;
      } finally {
        if (connection) connection.release();
      }
    }

    // POST /loans { bookId }; username berasal dari token, bukan body.
    if (req.method === "POST" && segments.length === 1 && segments[0] === "loans") {
      const body = await readJsonBodyOrRespond(req, res);
      if (!body) return;
      const { bookId } = body;
      if (bookId === undefined || bookId === null || bookId === "") {
        return sendJSON(res, 400, { error: "bookId wajib diisi." });
      }
      if (body.username && String(body.username).trim().toLowerCase() !== authenticatedUser.username) {
        return sendJSON(res, 403, { error: "Username request tidak sesuai dengan pengguna login." });
      }

      const numericBookId = Number(bookId);
      if (!Number.isSafeInteger(numericBookId) || numericBookId <= 0) {
        return sendJSON(res, 400, { error: "bookId tidak valid." });
      }

      const activeLoans = await getActiveLoansForUser(authenticatedUser.username);
      if (activeLoans.length >= MAX_ACTIVE_LOANS) {
        return sendJSON(res, 409, {
          error: `Peminjaman ditolak. Anda sudah memiliki ${MAX_ACTIVE_LOANS} buku aktif.`,
        });
      }

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
        return sendJSON(res, 409, { error: "Peminjaman ditolak. Buku sedang dipinjam mahasiswa lain." });
      }

      const borrowDate = new Date();
      const dueDate = new Date(borrowDate);
      dueDate.setDate(dueDate.getDate() + LOAN_PERIOD_DAYS);
      const newLoan = {
        id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
        username: authenticatedUser.username,
        bookId: numericBookId,
        bookTitle: book.title,
        borrowDate: borrowDate.toISOString(),
        dueDate: dueDate.toISOString(),
      };

      // Reservasi status lebih dulu secara atomik di Book Service. Jika dua request
      // berlomba, hanya satu PATCH tersedia -> dipinjam yang akan berhasil.
      let reservation;
      try {
        reservation = await callBookService(
          "PATCH", `/books/${numericBookId}/status`, { status: "dipinjam" }
        );
      } catch {
        // Respons bisa hilang setelah Book Service berhasil mengubah status.
        // Coba pulihkan status; jika tidak berhasil, catat agar dapat direkonsiliasi.
        try {
          const compensation = await callBookService(
            "PATCH", `/books/${numericBookId}/status`, { status: "tersedia" }
          );
          if (compensation.statusCode !== 200) {
            console.error("[Loan Service] status reservasi tidak dapat dipastikan; perlu rekonsiliasi manual.");
          }
        } catch {
          console.error("[Loan Service] Book Service tidak tersedia untuk kompensasi reservasi; perlu rekonsiliasi manual.");
        }
        return sendJSON(res, 502, { error: "Book Service tidak dapat dipastikan saat memesan buku." });
      }
      if (reservation.statusCode === 409) {
        return sendJSON(res, 409, { error: "Peminjaman ditolak. Buku sudah tidak tersedia." });
      }
      if (reservation.statusCode !== 200) {
        if (reservation.statusCode !== 404) {
          try {
            const compensation = await callBookService(
              "PATCH", `/books/${numericBookId}/status`, { status: "tersedia" }
            );
            if (compensation.statusCode !== 200) {
              console.error("[Loan Service] kompensasi status reservasi gagal; perlu rekonsiliasi manual.");
            }
          } catch {
            console.error("[Loan Service] kompensasi status reservasi tidak dapat dijalankan; perlu rekonsiliasi manual.");
          }
        }
        return sendJSON(res, reservation.statusCode === 404 ? 404 : 502,
          { error: "Book Service gagal memesan buku." });
      }

      try {
        await pool.execute(
          `INSERT INTO loans (id, username, book_id, book_title, borrow_date, due_date, status)
           VALUES (?, ?, ?, ?, ?, ?, 'active')`,
          [newLoan.id, newLoan.username, newLoan.bookId, newLoan.bookTitle,
            new Date(newLoan.borrowDate), new Date(newLoan.dueDate)]
        );
      } catch (error) {
        // Kompensasi bila penyimpanan transaksi gagal setelah status buku direservasi.
        try {
          const compensation = await callBookService(
            "PATCH", `/books/${numericBookId}/status`, { status: "tersedia" }
          );
          if (compensation.statusCode !== 200) {
            console.error("[Loan Service] kompensasi peminjaman gagal; perlu rekonsiliasi manual.");
          }
        } catch {
          console.error("[Loan Service] Book Service tidak tersedia untuk kompensasi peminjaman; perlu rekonsiliasi manual.");
        }
        throw error;
      }

      return sendJSON(res, 201, { message: "Buku berhasil dipinjam.", loan: { ...newLoan, status: "active" } });
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
    server.listen(PORT, "127.0.0.1", () => {
      console.log(`[Loan Service] berjalan di http://127.0.0.1:${PORT}`);
      console.log(`[Loan Service] terhubung ke Book Service di http://${BOOK_SERVICE_HOST}:${BOOK_SERVICE_PORT}`);
    });
  } catch {
    console.error("[Loan Service] server tidak dijalankan karena MySQL tidak tersedia.");
    process.exit(1);
  }
}

startServer();
