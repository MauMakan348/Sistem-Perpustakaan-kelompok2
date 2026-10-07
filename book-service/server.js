// =========================================================
// BOOK SERVICE
// Tanggung jawab: menyimpan data buku & status ketersediaannya.
// Persistence: MySQL book_db milik Book Service.
// =========================================================

require("dotenv").config();
const http = require("http");
const { pool, checkDatabaseConnection } = require("./db");

const PORT = process.env.PORT || 4001;

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
  const segments = url.pathname.split("/").filter(Boolean);

  if (req.method === "OPTIONS") {
    return sendJSON(res, 204, {});
  }

  try {
    // GET /books -> daftar semua buku
    if (req.method === "GET" && segments.length === 1 && segments[0] === "books") {
      const [rows] = await pool.query(
        "SELECT id, title, author, status FROM books ORDER BY id"
      );
      return sendJSON(res, 200, rows);
    }

    // GET /books/:id -> detail satu buku
    if (req.method === "GET" && segments.length === 2 && segments[0] === "books") {
      const id = Number(segments[1]);
      if (!Number.isInteger(id)) {
        return sendJSON(res, 400, { error: "ID buku tidak valid." });
      }

      const [rows] = await pool.execute(
        "SELECT id, title, author, status FROM books WHERE id = ?",
        [id]
      );
      if (rows.length === 0) {
        return sendJSON(res, 404, { error: "Buku tidak ditemukan." });
      }
      return sendJSON(res, 200, rows[0]);
    }

    // PATCH /books/:id/status -> ubah status buku
    if (
      req.method === "PATCH" &&
      segments.length === 3 &&
      segments[0] === "books" &&
      segments[2] === "status"
    ) {
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
      if (!Number.isInteger(id)) {
        return sendJSON(res, 400, { error: "ID buku tidak valid." });
      }

      const [result] = await pool.execute(
        "UPDATE books SET status = ? WHERE id = ?",
        [body.status, id]
      );

      const [rows] = await pool.execute(
        "SELECT id, title, author, status FROM books WHERE id = ?",
        [id]
      );
      if (rows.length === 0) {
        return sendJSON(res, 404, { error: "Buku tidak ditemukan." });
      }
      return sendJSON(res, 200, {
        message: "Status buku diperbarui.",
        book: rows[0],
      });
    }

    return sendJSON(res, 404, { error: "Endpoint tidak ditemukan." });
  } catch (error) {
    console.error("[Book Service] database/request error:", error.message);
    return sendJSON(res, 500, { error: "Terjadi kesalahan pada Book Service." });
  }
});

async function startServer() {
  try {
    await checkDatabaseConnection();
    server.listen(PORT, () => {
      console.log(`[Book Service] berjalan di http://localhost:${PORT}`);
    });
  } catch {
    console.error("[Book Service] server tidak dijalankan karena MySQL tidak tersedia.");
    process.exit(1);
  }
}

startServer();
