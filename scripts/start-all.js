const path = require('path');
const net = require('net');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROOT = path.resolve(__dirname, '..');
const STARTUP_TIMEOUT_MS = Number(process.env.STARTUP_TIMEOUT_MS || 30000);
const SERVICES = [
  { name: 'Book Service', script: 'book-service/server.js', port: Number(process.env.BOOK_PORT || 4001) },
  { name: 'Loan Service', script: 'loan-service/server.js', port: Number(process.env.LOAN_PORT || 4002) },
  { name: 'API Gateway', script: 'api-gateway/server.js', port: Number(process.env.GATEWAY_PORT || 4000) },
];
const children = new Map();
let shuttingDown = false;
let shutdownPromise;
let startupFailure = null;

function logLines(name, stream, output) {
  let pending = '';
  stream.setEncoding('utf8');
  stream.on('data', chunk => {
    pending += chunk;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || '';
    for (const line of lines) if (line) output.write(`[${name}] ${line}\n`);
  });
  stream.on('end', () => { if (pending) output.write(`[${name}] ${pending}\n`); });
}

function launch(service) {
  const child = spawn(process.execPath, [service.script], {
    cwd: ROOT,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  children.set(service.name, child);
  logLines(service.name, child.stdout, process.stdout);
  logLines(service.name, child.stderr, process.stderr);
  child.on('error', error => {
    startupFailure = `${service.name} gagal dijalankan: ${error.message}`;
    console.error(`[Runner] ${startupFailure}`);
    if (!shuttingDown) void shutdown(1);
  });
  child.on('exit', (code, signal) => {
    if (!shuttingDown) {
      startupFailure = `${service.name} berhenti tidak terduga (code=${code}, signal=${signal || 'none'}).`;
      console.error(`[Runner] ${startupFailure}`);
      void shutdown(code && code !== 0 ? code : 1);
    }
  });
  console.log(`[Runner] Menjalankan ${service.name} (port ${service.port})`);
  return child;
}

function canConnect(port) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(500);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
  });
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitUntilReady(service, child) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (shuttingDown || startupFailure || child.exitCode !== null || child.signalCode !== null) {
      throw new Error(startupFailure || `${service.name} berhenti sebelum siap.`);
    }
    if (await canConnect(service.port)) {
      console.log(`[Runner] ${service.name} siap di port ${service.port}`);
      return;
    }
    await delay(200);
  }
  throw new Error(`${service.name} belum siap setelah ${STARTUP_TIMEOUT_MS} ms. Periksa port dan koneksi MySQL.`);
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise(resolve => {
    const forceTimer = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    }, 4000);
    forceTimer.unref();
    child.once('exit', () => { clearTimeout(forceTimer); resolve(); });
    child.kill('SIGTERM');
  });
}

function shutdown(exitCode = 0) {
  if (shutdownPromise) return shutdownPromise;
  shuttingDown = true;
  shutdownPromise = (async () => {
    console.log('\n[Runner] Menghentikan seluruh service...');
    await Promise.all([...children.values()].reverse().map(stopChild));
    console.log('[Runner] Semua proses service telah dihentikan.');
    process.exitCode = exitCode;
  })();
  return shutdownPromise;
}

process.on('SIGINT', () => { void shutdown(0); });
process.on('SIGTERM', () => { void shutdown(0); });

async function main() {
  try {
    if (!process.env.API_KEY) throw new Error('API_KEY belum diatur. Salin .env.example menjadi .env dan isi nilainya.');
    if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET, 'utf8') < 32) {
      throw new Error('JWT_SECRET belum diatur atau kurang dari 32 byte.');
    }
    for (const service of SERVICES.slice(0, 2)) launch(service);
    await Promise.all(SERVICES.slice(0, 2).map(service => waitUntilReady(service, children.get(service.name))));
    const gateway = SERVICES[2];
    launch(gateway);
    await waitUntilReady(gateway, children.get(gateway.name));
    console.log(`[Runner] Seluruh service siap. Gunakan http://localhost:${gateway.port}`);
    console.log('[Runner] Tekan Ctrl+C untuk menghentikan Gateway dan kedua service internal.');
  } catch (error) {
    console.error(`[Runner] Startup gagal: ${error.message}`);
    await shutdown(1);
  }
}

main();
