// Semua request aplikasi melalui API Gateway. Tidak ada API Key atau signing secret di browser.
// Token disimpan di sessionStorage (sesi tab), bukan password, akun, buku, atau transaksi.
const API_GATEWAY = (document.querySelector('meta[name="api-gateway-url"]')?.content || 'http://localhost:4000').replace(/\/$/, '');
const TOKEN_STORAGE_KEY = 'perpus_accessToken';
const USER_STORAGE_KEY = 'perpus_currentUser';
const ROLE_STORAGE_KEY = 'perpus_currentRole';
const MAX_ACTIVE_LOANS = 3;
let busy = false;

const $ = id => document.getElementById(id);
const getCurrentUser = () => sessionStorage.getItem(USER_STORAGE_KEY);
const getAccessToken = () => sessionStorage.getItem(TOKEN_STORAGE_KEY);
const getCurrentRole = () => sessionStorage.getItem(ROLE_STORAGE_KEY) || 'user';

function setMessage(id, message, isError = false) {
  const element = $(id);
  if (!element) return;
  element.textContent = message || '';
  element.classList.toggle('message-error', Boolean(isError));
  element.classList.toggle('message-success', Boolean(message) && !isError);
}

function setBusy(button, value, busyText = 'Memproses...') {
  if (!button) return;
  if (value) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    delete button.dataset.originalText;
  }
}

function clearSession() {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(USER_STORAGE_KEY);
  sessionStorage.removeItem(ROLE_STORAGE_KEY);
}

function showLogin(message = '', isError = false) {
  $('appScreen').classList.add('hidden');
  $('loginScreen').classList.remove('hidden');
  setMessage('authMessage', message, isError);
}

function showAppShell() {
  $('loginScreen').classList.add('hidden');
  $('appScreen').classList.remove('hidden');
  $('namaMahasiswa').textContent = `Halo, ${getCurrentUser()} (${getCurrentRole()})`;
  $('adminBookPanel').classList.toggle('hidden', getCurrentRole() !== 'admin');
}

async function readResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { error: text }; }
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(`${API_GATEWAY}${path}`, { ...options, headers });
}

async function handleUnauthorized(response) {
  if (response.status !== 401) return false;
  clearSession();
  showLogin('Sesi login tidak valid atau telah berakhir. Silakan login kembali.', true);
  return true;
}

function appendEmptyRow(tbody, colspan, text) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = colspan;
  cell.className = 'empty-state';
  cell.textContent = text;
  row.appendChild(cell);
  tbody.appendChild(row);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('id-ID');
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('id-ID');
}

// REGISTRASI
$('registerForm').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('btnRegister');
  setBusy(button, true, 'Mendaftarkan...');
  setMessage('authMessage', 'Mengirim data registrasi...');
  const username = $('registerUsername').value.trim();
  const password = $('registerPassword').value;
  try {
    const response = await fetch(`${API_GATEWAY}/api/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await readResponse(response);
    if (!response.ok) {
      setMessage('authMessage', data.error || `Registrasi gagal (HTTP ${response.status}).`, true);
      return;
    }
    $('loginUsername').value = data.user?.username || username;
    $('loginPassword').value = '';
    $('registerPassword').value = '';
    setMessage('authMessage', 'Registrasi berhasil. Silakan login.');
  } catch {
    setMessage('authMessage', 'Tidak dapat menghubungi API Gateway. Periksa koneksi dan status server.', true);
  } finally { setBusy(button, false); }
});

// LOGIN
$('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('btnLogin');
  setBusy(button, true, 'Login...');
  setMessage('authMessage', 'Memverifikasi akun...');
  const username = $('loginUsername').value.trim();
  const password = $('loginPassword').value;
  try {
    const response = await fetch(`${API_GATEWAY}/api/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await readResponse(response);
    if (!response.ok) {
      setMessage('authMessage', data.error || `Login gagal (HTTP ${response.status}).`, true);
      return;
    }
    if (!data.token || !data.user?.username) {
      setMessage('authMessage', 'Respons login tidak lengkap dari server.', true);
      return;
    }
    sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    sessionStorage.setItem(USER_STORAGE_KEY, data.user.username);
    sessionStorage.setItem(ROLE_STORAGE_KEY, data.user.role || 'user');
    $('loginPassword').value = '';
    showAppShell();
    await refreshAll();
  } catch {
    setMessage('authMessage', 'Tidak dapat menghubungi API Gateway. Pastikan Gateway dan service berjalan.', true);
  } finally { setBusy(button, false); }
});

$('btnLogout').addEventListener('click', () => {
  clearSession();
  $('loginForm').reset();
  showLogin('Anda telah logout.');
});
$('btnRefresh').addEventListener('click', () => refreshBooks().catch(() => {}));
$('btnRefreshLoans').addEventListener('click', () => refreshLoans().catch(() => {}));

async function refreshAll() {
  await Promise.all([refreshBooks(), refreshLoans()]);
}

// DAFTAR BUKU
async function refreshBooks() {
  const body = $('bodyBuku');
  body.replaceChildren();
  appendEmptyRow(body, 4, 'Memuat daftar buku...');
  setMessage('booksMessage', 'Memuat data dari server...');
  try {
    const response = await apiFetch('/api/books');
    if (await handleUnauthorized(response)) return;
    const books = await readResponse(response);
    if (!response.ok) throw new Error(books.error || `Gagal memuat buku (HTTP ${response.status}).`);
    if (!Array.isArray(books)) throw new Error('Format daftar buku dari server tidak sesuai.');
    body.replaceChildren();
    const loansResponse = await apiFetch(`/api/loans/${encodeURIComponent(getCurrentUser())}`);
    if (await handleUnauthorized(loansResponse)) return;
    const loansData = await readResponse(loansResponse);
    if (!loansResponse.ok) throw new Error(loansData.error || 'Gagal memeriksa batas peminjaman.');
    if (!Array.isArray(loansData)) throw new Error('Format riwayat peminjaman tidak sesuai.');
    const activeCount = loansData.filter(loan => loan.status === 'active').length;
    $('jumlahPinjam').textContent = String(activeCount);
    if (!books.length) appendEmptyRow(body, 4, 'Belum ada buku di katalog.');
    for (const book of books) {
      const row = document.createElement('tr');
      const title = document.createElement('td'); title.textContent = book.title ?? 'Tanpa judul';
      const author = document.createElement('td'); author.textContent = book.author ?? '—';
      const status = document.createElement('td');
      const statusBadge = document.createElement('span');
      statusBadge.className = book.status === 'tersedia' ? 'status-tersedia' : 'status-dipinjam';
      statusBadge.textContent = book.status === 'tersedia' ? 'Tersedia' : (book.status === 'dipinjam' ? 'Dipinjam' : (book.status || 'Tidak diketahui'));
      status.appendChild(statusBadge);
      const action = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = book.status !== 'tersedia' ? 'Tidak tersedia' : (activeCount >= MAX_ACTIVE_LOANS ? 'Batas maksimal' : 'Pinjam');
      button.disabled = book.status !== 'tersedia' || activeCount >= MAX_ACTIVE_LOANS;
      button.addEventListener('click', () => borrowBook(book.id, button));
      action.appendChild(button);
      row.append(title, author, status, action);
      body.appendChild(row);
    }
    setMessage('booksMessage', books.length ? `${books.length} buku dimuat dari server.` : 'Katalog masih kosong.');
  } catch (error) {
    body.replaceChildren();
    appendEmptyRow(body, 4, 'Daftar buku tidak dapat dimuat.');
    setMessage('booksMessage', error.message || 'Terjadi kesalahan jaringan saat memuat buku.', true);
  }
}

// TAMBAH BUKU ADMIN — role di UI hanya untuk pengalaman pengguna; Gateway/Book Service tetap wajib mengotorisasi.
$('addBookForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (getCurrentRole() !== 'admin') {
    setMessage('addBookMessage', 'Akses hanya untuk admin.', true);
    return;
  }
  const title = $('newBookTitle').value.trim();
  const author = $('newBookAuthor').value.trim();
  if (!title || !author) {
    setMessage('addBookMessage', 'Judul dan penulis wajib diisi.', true);
    return;
  }
  const button = event.submitter || $('addBookForm').querySelector('button[type="submit"]');
  setBusy(button, true, 'Menyimpan...');
  setMessage('addBookMessage', 'Menyimpan buku ke server...');
  try {
    const response = await apiFetch('/api/books', {
      method: 'POST', body: JSON.stringify({ title, author }),
    });
    if (await handleUnauthorized(response)) return;
    const data = await readResponse(response);
    if (!response.ok) {
      setMessage('addBookMessage', data.error || `Buku gagal ditambahkan (HTTP ${response.status}).`, true);
      return;
    }
    setMessage('addBookMessage', `Buku “${data.book?.title || title}” berhasil ditambahkan.`);
    $('addBookForm').reset();
    await refreshBooks();
  } catch {
    setMessage('addBookMessage', 'Jaringan bermasalah. Periksa status Gateway sebelum mencoba kembali.', true);
  } finally { setBusy(button, false); }
});

// PINJAM BUKU (fitur lama dipertahankan)
async function borrowBook(bookId, button) {
  setBusy(button, true, 'Memproses...');
  try {
    const response = await apiFetch('/api/loans', {
      method: 'POST', body: JSON.stringify({ bookId }),
    });
    if (await handleUnauthorized(response)) return;
    const data = await readResponse(response);
    if (!response.ok) {
      setMessage('booksMessage', data.error || `Peminjaman gagal (HTTP ${response.status}).`, true);
      await refreshBooks();
      return;
    }
    setMessage('booksMessage', data.message || 'Peminjaman berhasil.');
    await refreshAll();
  } catch {
    setMessage('booksMessage', 'Tidak dapat menghubungi API Gateway. Status peminjaman belum dapat dipastikan.', true);
  } finally { setBusy(button, false); }
}

// RIWAYAT DAN PENGEMBALIAN
async function refreshLoans() {
  const body = $('bodyPinjaman');
  body.replaceChildren();
  appendEmptyRow(body, 6, 'Memuat riwayat peminjaman...');
  setMessage('loansMessage', 'Memuat riwayat dari server...');
  try {
    const response = await apiFetch(`/api/loans/${encodeURIComponent(getCurrentUser())}`);
    if (await handleUnauthorized(response)) return;
    const loans = await readResponse(response);
    if (!response.ok) throw new Error(loans.error || `Gagal memuat peminjaman (HTTP ${response.status}).`);
    if (!Array.isArray(loans)) throw new Error('Format riwayat peminjaman dari server tidak sesuai.');
    body.replaceChildren();
    const activeCount = loans.filter(loan => loan.status === 'active').length;
    $('jumlahPinjam').textContent = String(activeCount);
    if (!loans.length) appendEmptyRow(body, 6, 'Anda belum memiliki riwayat peminjaman.');
    for (const loan of loans) {
      const row = document.createElement('tr');
      const title = document.createElement('td'); title.textContent = loan.bookTitle || `Buku #${loan.bookId}`;
      const borrowed = document.createElement('td'); borrowed.textContent = formatDate(loan.borrowDate);
      const due = document.createElement('td'); due.textContent = formatDate(loan.dueDate);
      const status = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = loan.status === 'active' ? 'status-dipinjam' : 'status-tersedia';
      badge.textContent = loan.status === 'active' ? 'Aktif / dipinjam' : (loan.status === 'returned' ? 'Dikembalikan' : (loan.status || 'Tidak diketahui'));
      status.appendChild(badge);
      const returned = document.createElement('td'); returned.textContent = formatDateTime(loan.returnedAt);
      const action = document.createElement('td');
      if (loan.status === 'active') {
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = 'Kembalikan';
        button.addEventListener('click', () => returnBook(loan.id, button));
        action.appendChild(button);
      } else {
        action.textContent = '—';
      }
      row.append(title, borrowed, due, status, returned, action);
      body.appendChild(row);
    }
    setMessage('loansMessage', `${loans.length} transaksi dimuat; ${activeCount} masih aktif.`);
  } catch (error) {
    body.replaceChildren();
    appendEmptyRow(body, 6, 'Riwayat peminjaman tidak dapat dimuat.');
    setMessage('loansMessage', error.message || 'Terjadi kesalahan jaringan saat memuat riwayat.', true);
  }
}

async function returnBook(loanId, button) {
  if (!Number.isSafeInteger(Number(loanId)) || Number(loanId) <= 0) {
    setMessage('loansMessage', 'ID transaksi tidak valid.', true);
    return;
  }
  setBusy(button, true, 'Mengembalikan...');
  setMessage('loansMessage', 'Memproses pengembalian...');
  try {
    const response = await apiFetch(`/api/loans/${encodeURIComponent(loanId)}/return`, { method: 'POST' });
    if (await handleUnauthorized(response)) return;
    const data = await readResponse(response);
    if (!response.ok) {
      setMessage('loansMessage', data.error || `Pengembalian gagal (HTTP ${response.status}).`, true);
      // Sinkronkan lagi tampilan dari server, termasuk jika transaksi sudah dikembalikan di tempat lain.
      await refreshAll();
      return;
    }
    setMessage('loansMessage', data.message || 'Buku berhasil dikembalikan.');
    await refreshAll();
  } catch {
    setMessage('loansMessage', 'Jaringan terputus saat mengembalikan. Periksa status transaksi dengan memuat ulang sebelum mencoba lagi.', true);
  } finally { setBusy(button, false); }
}

// Pulihkan sesi tab yang masih memiliki token. Data bisnis selalu diambil ulang dari backend.
if (getAccessToken() && getCurrentUser()) {
  showAppShell();
  refreshAll();
} else {
  clearSession();
  showLogin();
}
