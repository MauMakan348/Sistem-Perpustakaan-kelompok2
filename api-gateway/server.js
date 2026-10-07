const http = require("http");
const dotenv = require("dotenv");
const { spawn } = require("child_process");
const path = require("path");

dotenv.config();

const PORT = Number(process.env.PORT || 4000);

const BOOK_SERVICE_HOST = process.env.BOOK_SERVICE_HOST || "localhost";
const BOOK_SERVICE_PORT = Number(process.env.BOOK_SERVICE_PORT || 4001);

const LOAN_SERVICE_HOST = process.env.LOAN_SERVICE_HOST || "localhost";
const LOAN_SERVICE_PORT = Number(process.env.LOAN_SERVICE_PORT || 4002);

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error(
    "API_KEY belum diatur. Salin .env.example menjadi .env lalu isi API_KEY."
  );
  process.exit(1);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
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

  if (pathname === "/api/login") {
    return {
      host: LOAN_SERVICE_HOST,
      port: LOAN_SERVICE_PORT,
      path: "/login" + search,
      serviceName: "Loan Service",
    };
  }

  return null;
}

function forwardRequest(req, res, target, body) {
  const headers = {};

  if (req.headers["content-type"]) {
    headers["content-type"] = req.headers["content-type"];
  }

  if (req.headers.accept) {
    headers.accept = req.headers.accept;
  }

  if (body.length > 0) {
    headers["content-length"] = Buffer.byteLength(body);
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
      const responseHeaders = { ...corsHeaders };

      if (proxyRes.headers["content-type"]) {
        responseHeaders["content-type"] =
          proxyRes.headers["content-type"];
      }

      res.writeHead(proxyRes.statusCode || 502, responseHeaders);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("timeout", () => {
    proxyReq.destroy(new Error("Service internal timeout"));
  });

  proxyReq.on("error", (err) => {
    console.error(
      `${target.serviceName} tidak tersedia:`,
      err.message
    );

    if (!res.headersSent) {
      sendJson(res, 502, {
        error: `${target.serviceName} tidak tersedia.`,
      });
    } else {
      res.end();
    }
  });

  if (body.length > 0) {
    proxyReq.write(body);
  }

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
    sendJson(res, 404, {
      error: "Endpoint Gateway tidak ditemukan.",
    });
    return;
  }

  if (req.headers["x-api-key"] !== API_KEY) {
    sendJson(res, 401, {
      error: "API Key tidak valid atau tidak ditemukan.",
    });
    return;
  }

  const chunks = [];

  req.on("data", (chunk) => {
    chunks.push(chunk);
  });

  req.on("end", () => {
    const body = Buffer.concat(chunks);
    forwardRequest(req, res, target, body);
  });

  req.on("error", (err) => {
    console.error("Request client gagal:", err.message);

    if (!res.headersSent) {
      sendJson(res, 400, {
        error: "Request dari client tidak valid.",
      });
    }
  });
});


// =========================================================
// MENJALANKAN MICROSERVICE
// =========================================================

const projectRoot = path.resolve(__dirname, "..");

function startService(serviceName, serviceDirectory, servicePort) {
  const servicePath = path.join(projectRoot, serviceDirectory);

  console.log(
    `[Launcher] Menjalankan ${serviceName} di port ${servicePort}...`
  );

  const child = spawn("npm", ["start"], {
    cwd: servicePath,
    shell: true,
    env: {
      ...process.env,
      PORT: String(servicePort),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (data) => {
    process.stdout.write(`[${serviceName}] ${data}`);
  });

  child.stderr.on("data", (data) => {
    process.stderr.write(`[${serviceName}] ${data}`);
  });

  child.on("exit", (code) => {
    console.log(
      `[Launcher] ${serviceName} berhenti dengan kode ${code}`
    );
  });

  return child;
}

// Jalankan kedua microservice
const bookServiceProcess = startService(
  "Book Service",
  "book-service",
  BOOK_SERVICE_PORT
);

const loanServiceProcess = startService(
  "Loan Service",
  "loan-service",
  LOAN_SERVICE_PORT
);


// Jalankan API Gateway
server.listen(PORT, () => {
  console.log("");
  console.log("========================================");
  console.log("      SISTEM PERPUSTAKAAN BERJALAN");
  console.log("========================================");
  console.log(`API Gateway : http://localhost:${PORT}`);
  console.log(`Book Service: http://localhost:${BOOK_SERVICE_PORT}`);
  console.log(`Loan Service: http://localhost:${LOAN_SERVICE_PORT}`);
  console.log("========================================");
  console.log("");
});


// =========================================================
// MATIKAN SEMUA SERVICE SAAT GATEWAY DI-CLOSE
// =========================================================

function shutdown() {
  console.log("\n[Launcher] Menghentikan semua service...");

  bookServiceProcess.kill();
  loanServiceProcess.kill();

  server.close(() => {
    console.log("[Launcher] Semua service dihentikan.");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);