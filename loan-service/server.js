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

const PORT = Number(process.env.PORT || 4002);
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
     WHERE username = ? AND due_date >= UTC_TIMESTAMP()
     ORDER BY borrow_date DESC`,
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
        "SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1",
        [username]
      );
      if (rows.length === 0 || !(await verifyPassword(body.password, rows[0].password_hash))) {
        return sendJSON(res, 401, { error: "Username atau password salah." });
      }

      const user = { id: rows[0].id, username: rows[0].username };
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
      const activeLoans = await getActiveLoansForUser(authenticatedUser.username);
      return sendJSON(res, 200, activeLoans);
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
        id: Date.now(),
        username: authenticatedUser.username,
        bookId: numericBookId,
        bookTitle: book.title,
        borrowDate: borrowDate.toISOString(),
        dueDate: dueDate.toISOString(),
      };

      await pool.execute(
        `INSERT INTO loans (id, username, book_id, book_title, borrow_date, due_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newLoan.id, newLoan.username, newLoan.bookId, newLoan.bookTitle,
          new Date(newLoan.borrowDate), new Date(newLoan.dueDate)]
      );

      try {
        const updateResponse = await callBookService(
          "PATCH", `/books/${numericBookId}/status`, { status: "dipinjam" }
        );
        if (updateResponse.statusCode !== 200) throw new Error("Update status gagal");
      } catch {
        await pool.execute("DELETE FROM loans WHERE id = ?", [newLoan.id]);
        return sendJSON(res, 502, { error: "Gagal memperbarui status buku di Book Service." });
      }

      return sendJSON(res, 201, { message: "Buku berhasil dipinjam.", loan: newLoan });
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
