const http = require("http");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

dotenv.config();

const PORT = Number(process.env.PORT || 4000);
const BOOK_SERVICE_HOST = process.env.BOOK_SERVICE_HOST || "127.0.0.1";
const BOOK_SERVICE_PORT = Number(process.env.BOOK_SERVICE_PORT || 4001);
const LOAN_SERVICE_HOST = process.env.LOAN_SERVICE_HOST || "127.0.0.1";
const LOAN_SERVICE_PORT = Number(process.env.LOAN_SERVICE_PORT || 4002);
const API_KEY = process.env.API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

if (!API_KEY) {
  console.error("API_KEY belum diatur. Salin .env.example menjadi .env lalu isi API_KEY.");
  process.exit(1);
}
if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET, "utf8") < 32) {
  console.error("JWT_SECRET belum diatur atau terlalu pendek. Gunakan secret random minimal 32 byte yang sama dengan Loan Service.");
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
      path: pathname === "/api/login" ? "/login" + search : "/register" + search,
      serviceName: "Loan Service",
    };
  }

  return null;
}

function hasValidBearerToken(req) {
  const authorization = req.headers.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  try {
    jwt.verify(match[1], JWT_SECRET, { issuer: "perpustakaan-loan-service" });
    return true;
  } catch {
    return false;
  }
}

function isPublicAuthenticationRoute(req, pathname) {
  return req.method === "POST" && (pathname === "/api/register" || pathname === "/api/login");
}

function isUserTokenRoute(req, pathname) {
  if (req.method === "GET" && (pathname === "/api/books" || pathname.startsWith("/api/books/") || pathname.startsWith("/api/loans/"))) {
    return true;
  }
  return req.method === "POST" && pathname === "/api/loans";
}

function forwardRequest(req, res, target, body) {
  const headers = {};
  if (req.headers["content-type"]) headers["content-type"] = req.headers["content-type"];
  if (req.headers.accept) headers.accept = req.headers.accept;
  if (req.headers.authorization) headers.authorization = req.headers.authorization;
  if (body.length > 0) headers["content-length"] = Buffer.byteLength(body);

  const proxyReq = http.request(
    {
      hostname: target.host,
      port: target.port,
      path: target.path,
      method: req.method,
      headers,
      timeout: 5000,
    },
    proxyRes => {
      const responseHeaders = { ...corsHeaders };
      if (proxyRes.headers["content-type"]) responseHeaders["content-type"] = proxyRes.headers["content-type"];
      res.writeHead(proxyRes.statusCode || 502, responseHeaders);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("timeout", () => proxyReq.destroy(new Error("Service internal timeout")));
  proxyReq.on("error", err => {
    console.error(`${target.serviceName} tidak tersedia:`, err.message);
    if (!res.headersSent) {
      sendJson(res, 502, { error: `${target.serviceName} tidak tersedia. Pastikan service sudah berjalan.` });
    } else {
      res.end();
    }
  });
  if (body.length > 0) proxyReq.write(body);
  proxyReq.end();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const target = getTarget(url.pathname, url.search);
  if (!target) {
    sendJson(res, 404, { error: "Endpoint Gateway tidak ditemukan." });
    return;
  }

  // Registrasi/login boleh diakses tanpa credential agar browser dapat memulai sesi.
  // Endpoint lain menerima API Key untuk client tepercaya atau JWT valid untuk pengguna login.
  const publicAuthRoute = isPublicAuthenticationRoute(req, url.pathname);
  const validApiKey = req.headers["x-api-key"] === API_KEY;
  const validUserToken = hasValidBearerToken(req);
  const validUserAccess = isUserTokenRoute(req, url.pathname) && validUserToken;
  if (!publicAuthRoute && !validApiKey && !validUserAccess) {
    sendJson(res, 401, { error: "API Key tidak valid atau token autentikasi tidak ditemukan/valid." });
    return;
  }

  const chunks = [];
  req.on("data", chunk => chunks.push(chunk));
  req.on("end", () => forwardRequest(req, res, target, Buffer.concat(chunks)));
  req.on("error", err => {
    console.error("Request client gagal:", err.message);
    if (!res.headersSent) sendJson(res, 400, { error: "Request dari client tidak valid." });
  });
});

server.listen(PORT, () => {
  console.log(`API Gateway berjalan di http://localhost:${PORT}`);
  console.log(`Book Service: http://${BOOK_SERVICE_HOST}:${BOOK_SERVICE_PORT}`);
  console.log(`Loan Service: http://${LOAN_SERVICE_HOST}:${LOAN_SERVICE_PORT}`);
});
