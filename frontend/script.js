// Frontend memakai API Gateway. API Key/JWT signing secret tidak disimpan di browser.
// JWT access token hanya disimpan di sessionStorage selama tab sesi ini.
const API_GATEWAY = "http://localhost:4000";
const TOKEN_STORAGE_KEY = "perpus_accessToken";
const USER_STORAGE_KEY = "perpus_currentUser";
const ROLE_STORAGE_KEY = "perpus_currentRole";
const MAX_ACTIVE_LOANS = 3;

function getCurrentUser() {
  return sessionStorage.getItem(USER_STORAGE_KEY);
}

function getAccessToken() {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_GATEWAY}${path}`, { ...options, headers });
}

function setAuthMessage(message, isError = false) {
  const element = document.getElementById("authMessage");
  element.textContent = message;
  element.style.color = isError ? "#b42318" : "#167647";
}

function clearSession() {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(USER_STORAGE_KEY);
  sessionStorage.removeItem(ROLE_STORAGE_KEY);
}

function showLogin() {
  document.getElementById("appScreen").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
}

// ================== REGISTRASI ==================
document.getElementById("registerForm").addEventListener("submit", async event => {
  event.preventDefault();
  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value;

  try {
    const response = await fetch(`${API_GATEWAY}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      setAuthMessage(data.error || "Registrasi gagal.", true);
      return;
    }

    document.getElementById("loginUsername").value = data.user.username;
    document.getElementById("loginPassword").value = "";
    document.getElementById("registerPassword").value = "";
    setAuthMessage("Registrasi berhasil. Silakan login dengan akun baru.");
  } catch {
    setAuthMessage("Tidak dapat menghubungi API Gateway. Periksa apakah Gateway dan Loan Service berjalan.", true);
  }
});

// ================== LOGIN ==================
document.getElementById("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const response = await fetch(`${API_GATEWAY}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      setAuthMessage(data.error || "Login gagal.", true);
      return;
    }

    sessionStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    sessionStorage.setItem(USER_STORAGE_KEY, data.user.username);
    sessionStorage.setItem(ROLE_STORAGE_KEY, data.user.role || "user");
    document.getElementById("loginPassword").value = "";
    setAuthMessage("");
    await showApp();
  } catch {
    setAuthMessage("Tidak dapat menghubungi API Gateway. Pastikan Gateway dan service sudah berjalan.", true);
  }
});

document.getElementById("btnLogout").addEventListener("click", () => {
  clearSession();
  showLogin();
});

async function showApp() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("appScreen").classList.remove("hidden");
  document.getElementById("namaMahasiswa").textContent = `Halo, ${getCurrentUser()} (${sessionStorage.getItem(ROLE_STORAGE_KEY) || "user"})`;
  document.getElementById("adminBookPanel").classList.toggle("hidden", sessionStorage.getItem(ROLE_STORAGE_KEY) !== "admin");
  await renderBooks();
  await renderMyLoans();
}

async function handleExpiredSession(response) {
  if (response.status === 401) {
    clearSession();
    showLogin();
    setAuthMessage("Sesi login berakhir. Silakan login kembali.", true);
    return true;
  }
  return false;
}

// ================== DAFTAR BUKU ==================
async function renderBooks() {
  const [booksResponse, loansResponse] = await Promise.all([
    apiFetch("/api/books"),
    apiFetch(`/api/loans/${encodeURIComponent(getCurrentUser())}`),
  ]);
  if (await handleExpiredSession(booksResponse) || await handleExpiredSession(loansResponse)) return;
  if (!booksResponse.ok || !loansResponse.ok) throw new Error("Gagal memuat data perpustakaan.");

  const books = await booksResponse.json();
  const myLoans = await loansResponse.json();
  const limitReached = myLoans.length >= MAX_ACTIVE_LOANS;
  const body = document.getElementById("bodyBuku");
  body.replaceChildren();

  books.forEach(book => {
    const tr = document.createElement("tr");
    const titleCell = document.createElement("td");
    titleCell.textContent = book.title;
    const authorCell = document.createElement("td");
    authorCell.textContent = book.author;
    const statusCell = document.createElement("td");
    const statusLabel = document.createElement("span");
    statusLabel.className = book.status === "tersedia" ? "status-tersedia" : "status-dipinjam";
    statusLabel.textContent = book.status === "tersedia" ? "Tersedia" : "Dipinjam";
    statusCell.appendChild(statusLabel);
    const actionCell = document.createElement("td");
    const button = document.createElement("button");
    button.disabled = book.status !== "tersedia" || limitReached;
    button.textContent = book.status !== "tersedia" ? "Tidak Tersedia" : (limitReached ? "Batas Maksimal" : "Pinjam");
    button.addEventListener("click", () => borrowBook(book.id));
    actionCell.appendChild(button);
    tr.append(titleCell, authorCell, statusCell, actionCell);
    body.appendChild(tr);
  });
}

// ================== TAMBAH BUKU (ADMIN) ==================
document.getElementById("addBookForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (sessionStorage.getItem(ROLE_STORAGE_KEY) !== "admin") {
    document.getElementById("addBookMessage").textContent = "Akses hanya untuk admin.";
    return;
  }
  const title = document.getElementById("newBookTitle").value.trim();
  const author = document.getElementById("newBookAuthor").value.trim();
  const message = document.getElementById("addBookMessage");
  if (!title || !author) {
    message.textContent = "Judul dan penulis wajib diisi.";
    return;
  }
  try {
    const response = await apiFetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, author }),
    });
    if (await handleExpiredSession(response)) return;
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Buku gagal ditambahkan.";
      return;
    }
    message.textContent = `Buku "${data.book.title}" berhasil ditambahkan.`;
    document.getElementById("addBookForm").reset();
    await renderBooks();
  } catch {
    message.textContent = "Tidak dapat menghubungi API Gateway.";
  }
});

// ================== PINJAM BUKU ==================
async function borrowBook(bookId) {
  try {
    const response = await apiFetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId }),
    });
    if (await handleExpiredSession(response)) return;
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || "Peminjaman gagal.");
      await renderBooks();
      return;
    }

    alert(`Buku "${data.loan.bookTitle}" berhasil dipinjam.`);
    await renderBooks();
    await renderMyLoans();
  } catch {
    alert("Tidak dapat memuat data dari API Gateway. Pastikan semua service berjalan.");
  }
}

// ================== BUKU SAYA ==================
async function renderMyLoans() {
  const response = await apiFetch(`/api/loans/${encodeURIComponent(getCurrentUser())}`);
  if (await handleExpiredSession(response)) return;
  if (!response.ok) throw new Error("Gagal memuat peminjaman pengguna.");
  const myLoans = await response.json();
  document.getElementById("jumlahPinjam").textContent = myLoans.length;
  const body = document.getElementById("bodyPinjaman");
  body.replaceChildren();

  myLoans.forEach(loan => {
    const tr = document.createElement("tr");
    const title = document.createElement("td");
    title.textContent = loan.bookTitle;
    const borrowed = document.createElement("td");
    borrowed.textContent = new Date(loan.borrowDate).toLocaleDateString("id-ID");
    const due = document.createElement("td");
    due.textContent = new Date(loan.dueDate).toLocaleDateString("id-ID");
    tr.append(title, borrowed, due);
    body.appendChild(tr);
  });
}

// ================== INIT ==================
if (getAccessToken() && getCurrentUser()) {
  showApp().catch(() => {
    clearSession();
    showLogin();
    setAuthMessage("Sesi tidak dapat dipulihkan. Silakan login kembali.", true);
  });
}
