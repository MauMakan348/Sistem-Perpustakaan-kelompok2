// =========================================================
// FRONTEND
// Tidak lagi menyimpan data sendiri (tidak ada localStorage
// untuk data buku/peminjaman) — semua data diambil dari
// Book Service dan Loan Service lewat fetch().
// Hanya nama user yang disimpan di localStorage sekadar
// supaya sesi login tidak hilang saat refresh halaman.
// =========================================================

const BOOK_SERVICE = "http://localhost:4001";
const LOAN_SERVICE = "http://localhost:4002";
const MAX_ACTIVE_LOANS = 3;

function getCurrentUser() {
  return localStorage.getItem("perpus_currentUser");
}

// ================== LOGIN ==================
document.getElementById("btnLogin").addEventListener("click", async () => {
  const nama = document.getElementById("namaInput").value.trim();
  if (!nama) {
    alert("Nama tidak boleh kosong.");
    return;
  }

  try {
    const res = await fetch(`${LOAN_SERVICE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: nama }),
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Login gagal.");
      return;
    }

    localStorage.setItem("perpus_currentUser", data.username);
    showApp();
  } catch (err) {
    alert("Tidak dapat menghubungi Loan Service. Pastikan service sudah berjalan.");
  }
});

document.getElementById("btnLogout").addEventListener("click", () => {
  localStorage.removeItem("perpus_currentUser");
  document.getElementById("appScreen").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
});

async function showApp() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("appScreen").classList.remove("hidden");
  document.getElementById("namaMahasiswa").innerText = "Halo, " + getCurrentUser();
  await renderBooks();
  await renderMyLoans();
}

// ================== DAFTAR BUKU ==================
async function renderBooks() {
  const user = getCurrentUser();

  const [books, myLoans] = await Promise.all([
    fetch(`${BOOK_SERVICE}/books`).then(r => r.json()),
    fetch(`${LOAN_SERVICE}/loans/${encodeURIComponent(user)}`).then(r => r.json()),
  ]);

  const limitReached = myLoans.length >= MAX_ACTIVE_LOANS;

  const body = document.getElementById("bodyBuku");
  body.innerHTML = "";

  books.forEach(book => {
    const tr = document.createElement("tr");

    const statusLabel = book.status === "tersedia"
      ? '<span class="status-tersedia">Tersedia</span>'
      : '<span class="status-dipinjam">Dipinjam</span>';

    const disabled = (book.status !== "tersedia" || limitReached) ? "disabled" : "";
    const label = book.status !== "tersedia"
      ? "Tidak Tersedia"
      : (limitReached ? "Batas Maksimal" : "Pinjam");

    tr.innerHTML = `
      <td>${book.title}</td>
      <td>${book.author}</td>
      <td>${statusLabel}</td>
      <td><button ${disabled} onclick="borrowBook(${book.id})">${label}</button></td>
    `;
    body.appendChild(tr);
  });
}

// ================== PINJAM BUKU ==================
async function borrowBook(bookId) {
  const user = getCurrentUser();

  try {
    const res = await fetch(`${LOAN_SERVICE}/loans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, bookId }),
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Peminjaman gagal.");
      await renderBooks(); // sinkronkan ulang tampilan
      return;
    }

    alert(`Buku "${data.loan.bookTitle}" berhasil dipinjam.`);
    await renderBooks();
    await renderMyLoans();
  } catch (err) {
    alert("Tidak dapat menghubungi Loan Service. Pastikan service sudah berjalan.");
  }
}

// ================== BUKU SAYA ==================
async function renderMyLoans() {
  const user = getCurrentUser();
  const myLoans = await fetch(`${LOAN_SERVICE}/loans/${encodeURIComponent(user)}`).then(r => r.json());

  document.getElementById("jumlahPinjam").innerText = myLoans.length;

  const body = document.getElementById("bodyPinjaman");
  body.innerHTML = "";
  myLoans.forEach(loan => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${loan.bookTitle}</td>
      <td>${new Date(loan.borrowDate).toLocaleDateString("id-ID")}</td>
      <td>${new Date(loan.dueDate).toLocaleDateString("id-ID")}</td>
    `;
    body.appendChild(tr);
  });
}

// ================== INIT ==================
if (getCurrentUser()) {
  showApp();
}
