
const http = require("http");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

dotenv.config();

const PORT = Number(process.env.GATEWAY_PORT || process.env.PORT || 4000);
const BOOK_SERVICE_HOST = process.env.BOOK_SERVICE_HOST || "127.0.0.1";
const BOOK_SERVICE_PORT = Number(process.env.BOOK_SERVICE_PORT || 4001);
const LOAN_SERVICE_HOST = process.env.LOAN_SERVICE_HOST || "127.0.0.1";
const LOAN_SERVICE_PORT = Number(process.env.LOAN_SERVICE_PORT || 4002);
const API_KEY = process.env.API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

if (!API_KEY) {
  console.error("API_KEY belum diatur. Periksa file .env.");
  process.exit(1);
}

if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET, "utf8") < 32) {
  console.error("JWT_SECRET belum diatur atau terlalu pendek (minimal 32 byte).");
  process.exit(1);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...corsHeaders,
  });
  res.end(JSON.stringify(data));
}

function getTarget(pathname, search) {
  if (pathname === "/api/books" || pathname.startsWith("/api/books/")) {
    return {
      host: BOOK_SERVICE_HOST,
      port: BOOK_SERVICE_PORT,
      path: pathname.replace(/^\/api/, "") + search,
      serviceName: "Book Service",
    };
  }

  if (pathname === "/api/loans" || pathname.startsWith("/api/loans/")) {
    return {
      host: LOAN_SERVICE_HOST,
      port: LOAN_SERVICE_PORT,
      path: pathname.replace(/^\/api/, "") + search,
      serviceName: "Loan Service",
    };
  }

  if (pathname === "/api/login" || pathname === "/api/register") {
    return {
      host: LOAN_SERVICE_HOST,
      port: LOAN_SERVICE_PORT,
      path:
        (pathname === "/api/login" ? "/login" : "/register") + search,
      serviceName: "Loan Service",
    };
  }

  return null;
}

function getBearerPayload(req) {
  const match = (req.headers.authorization || "").match(/^Bearer\s+(.+)$/i);

  if (!match) return null;

  try {
    return jwt.verify(match[1], JWT_SECRET, {
      issuer: "perpustakaan-loan-service",
    });
  } catch {
    return null;
  }
}

function isPublicAuth(req, path) {
  return (
    req.method === "POST" &&
    (path === "/api/register" || path === "/api/login")
  );
}

function isUserOnlyRoute(req, path) {
  return (
    (req.method === "GET" && path.startsWith("/api/loans/")) ||
    (req.method === "POST" && path === "/api/loans") ||
    (req.method === "POST" && /^\/api\/loans\/\d+\/return$/.test(path))
  );
}

function isBookRead(req, path) {
  return (
    req.method === "GET" &&
    (path === "/api/books" || /^\/api\/books\/[^/]+$/.test(path))
  );
}

function isBookCreate(req, path) {
  return req.method === "POST" && path === "/api/books";
}

function isBookStatusPatch(req, path) {
  return req.method === "PATCH" && /^\/api\/books\/\d+\/status$/.test(path);
}

function forwardRequest(req, res, target, body) {
  const headers = {};

  for (const name of [
    "content-type",
    "accept",
    "authorization",
    "if-none-match",
    "if-modified-since",
  ]) {
    if (req.headers[name]) headers[name] = req.headers[name];
  }

  if (body.length > 0) {
    headers["content-length"] = String(body.length);
  }

  const proxyReq = http.request(
    {
      hostname: target.host,
      port: target.port,
      path: target.path,
      method: req.method,
      headers,
      timeout: 5000,
    },
    (proxyRes) => {
      const statusCode = proxyRes.statusCode || 502;
      const chunks = [];

      proxyRes.on("data", (chunk) => chunks.push(chunk));

      proxyRes.on("end", () => {
        const responseHeaders = { ...corsHeaders };

        if (statusCode < 500) {
          for (const name of [
            "content-type",
            "cache-control",
            "etag",
            "last-modified",
            "location",
          ]) {
            if (proxyRes.headers[name]) {
              responseHeaders[name] = proxyRes.headers[name];
            }
          }

          res.writeHead(statusCode, responseHeaders);
          res.end(Buffer.concat(chunks));
          return;
        }

        sendJson(res, statusCode, {
          error: `${target.serviceName} mengalami kesalahan.`,
        });
      });
    }
  );

  proxyReq.on("timeout", () => {
    const error = new Error("Upstream timeout");
    error.code = "UPSTREAM_TIMEOUT";
    proxyReq.destroy(error);
  });

  proxyReq.on("error", (error) => {
    console.error(
      `[Gateway] ${target.serviceName} upstream failure (${
        error.code || "NETWORK_ERROR"
      })`
    );

    if (!res.headersSent) {
      sendJson(res, error.code === "UPSTREAM_TIMEOUT" ? 504 : 502, {
        error: `${target.serviceName} tidak tersedia.`,
      });
    } else {
      res.end();
    }
  });

  if (body.length > 0) proxyReq.write(body);
  proxyReq.end();
}

function readAndForward(req, res, target) {
  const chunks = [];
  let size = 0;
  const maxBody = 1024 * 1024;

  req.on("data", (chunk) => {
    size += chunk.length;

    if (size > maxBody) {
      req.destroy();

      if (!res.headersSent) {
        sendJson(res, 413, { error: "Ukuran request terlalu besar." });
      }

      return;
    }

    chunks.push(chunk);
  });

  req.on("end", () => {
    if (!res.writableEnded) {
      forwardRequest(req, res, target, Buffer.concat(chunks));
    }
  });

  req.on("error", () => {
    if (!res.headersSent) {
      sendJson(res, 400, {
        error: "Request dari client tidak valid.",
      });
    }
  });
}

// Menyajikan frontend melalui API Gateway.
const FRONTEND_DIR = path.resolve(__dirname, "..", "frontend");

function serveFrontend(req, res, url) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return false;
  }

  const files = {
    "/": {
      name: "index.html",
      type: "text/html; charset=utf-8",
    },
    "/index.html": {
      name: "index.html",
      type: "text/html; charset=utf-8",
    },
    "/style.css": {
      name: "style.css",
      type: "text/css; charset=utf-8",
    },
    "/script.js": {
      name: "script.js",
      type: "application/javascript; charset=utf-8",
    },
  };

  const file = files[url.pathname];

  if (!file) return false;

  fs.readFile(path.join(FRONTEND_DIR, file.name), (err, content) => {
    if (err) {
      console.error("[Gateway] File frontend gagal dibaca:", file.name);

      res.writeHead(500, {
        "Content-Type": "application/json; charset=utf-8",
      });

      return res.end(
        JSON.stringify({ error: "File frontend gagal dibaca." })
      );
    }

    res.writeHead(200, {
      "Content-Type": file.type,
      "Cache-Control": "no-cache",
    });

    res.end(req.method === "HEAD" ? undefined : content);
  });

  return true;
}

const server = http.createServer((req, res) => {
  let url;

  try {
    url = new URL(req.url, `http://localhost:${PORT}`);
  } catch {
    return sendJson(res, 400, { error: "URL request tidak valid." });
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  if (serveFrontend(req, res, url)) {
  return;
}

  const target = getTarget(url.pathname, url.search);

  if (!target) {
    return sendJson(res, 404, {
      error: "Endpoint Gateway tidak ditemukan.",
    });
  }

  const publicAuth = isPublicAuth(req, url.pathname);
  const apiKeyValid = req.headers["x-api-key"] === API_KEY;
  const tokenPayload = getBearerPayload(req);
  const tokenValid = Boolean(tokenPayload);

  if (publicAuth) {
    return readAndForward(req, res, target);
  }

  if (isUserOnlyRoute(req, url.pathname)) {
  if (!tokenValid) {
    return sendJson(res, 401, {
      error: "Token pengguna tidak ada, tidak valid, atau kedaluwarsa."
    });
  }
  return readAndForward(req, res, target);
}

  if (isBookCreate(req, url.pathname)) {
    if (!tokenValid) {
      return sendJson(res, 401, {
        error: "Token pengguna tidak ada, tidak valid, atau kedaluwarsa.",
      });
    }

    if (tokenPayload.role !== "admin") {
      return sendJson(res, 403, {
        error: "Hanya admin yang berwenang menambahkan buku.",
      });
    }

    return readAndForward(req, res, target);
  }

  if (isBookRead(req, url.pathname)) {
    if (!tokenValid && !apiKeyValid) {
      return sendJson(res, 401, {
        error: "API Key atau token pengguna yang valid diperlukan.",
      });
    }

    return readAndForward(req, res, target);
  }

  if (isBookStatusPatch(req, url.pathname)) {
    if (!apiKeyValid) {
      return sendJson(res, 401, {
        error: "API Key Gateway yang valid diperlukan.",
      });
    }

    return readAndForward(req, res, target);
  }

  return sendJson(res, 405, {
    error: "Method atau endpoint tidak diizinkan melalui Gateway.",
  });
});

if (require.main === module) {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`API Gateway berjalan pada port ${PORT}`);
  });
}

module.exports = {
  getTarget,
  getBearerPayload,
  isPublicAuth,
  isUserOnlyRoute,
  isBookRead,
  isBookCreate,
  isBookStatusPatch,
  server,
};
