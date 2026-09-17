// ========================================
// DATA BUKU
// ========================================

const defaultBooks = [
    {
        id: 1,
        title: "Informatika Dasar",
        author: "Andi Pratama"
    },
    {
        id: 2,
        title: "Sistem Informasi",
        author: "Budi Santoso"
    },
    {
        id: 3,
        title: "Dasar-Dasar Programming",
        author: "Citra Dewi"
    },
    {
        id: 4,
        title: "Pemrograman Web",
        author: "Dedi Kurniawan"
    },
    {
        id: 5,
        title: "Algoritma dan Struktur Data",
        author: "Eko Wijaya"
    }
];


// ========================================
// LOCAL STORAGE KEY
// ========================================

const BOOKS_KEY = "perpustakaan_books";
const BORROWINGS_KEY = "perpustakaan_borrowings";
const USER_KEY = "perpustakaan_current_user";


// ========================================
// INISIALISASI DATA
// ========================================

function initializeData() {

    if (!localStorage.getItem(BOOKS_KEY)) {

        localStorage.setItem(
            BOOKS_KEY,
            JSON.stringify(defaultBooks)
        );

    }

    if (!localStorage.getItem(BORROWINGS_KEY)) {

        localStorage.setItem(
            BORROWINGS_KEY,
            JSON.stringify([])
        );

    }

}


// ========================================
// MENGAMBIL DATA
// ========================================

function getBooks() {

    return JSON.parse(
        localStorage.getItem(BOOKS_KEY)
    ) || [];

}


function getBorrowings() {

    return JSON.parse(
        localStorage.getItem(BORROWINGS_KEY)
    ) || [];

}


function getCurrentUser() {

    return localStorage.getItem(USER_KEY);

}


// ========================================
// MENYIMPAN DATA
// ========================================

function saveBorrowings(borrowings) {

    localStorage.setItem(
        BORROWINGS_KEY,
        JSON.stringify(borrowings)
    );

}


// ========================================
// CEK PEMINJAMAN AKTIF
// ========================================

function isBorrowingActive(borrowing) {

    const today = new Date();

    const dueDate =
        new Date(borrowing.dueDate);

    return today <= dueDate;

}


// ========================================
// MEMBERSIHKAN PEMINJAMAN KADALUARSA
// ========================================

function cleanExpiredBorrowings() {

    let borrowings = getBorrowings();

    borrowings = borrowings.filter(
        borrowing =>
            isBorrowingActive(borrowing)
    );

    saveBorrowings(borrowings);

}


// ========================================
// CEK KETERSEDIAAN BUKU
// ========================================

function isBookAvailable(bookId) {

    const borrowings =
        getBorrowings();

    return !borrowings.some(
        borrowing =>
            borrowing.bookId === bookId &&
            isBorrowingActive(borrowing)
    );

}


// ========================================
// MENGAMBIL PEMINJAMAN USER
// ========================================

function getActiveBorrowingsForUser(username) {

    const borrowings =
        getBorrowings();

    return borrowings.filter(
        borrowing =>
            borrowing.username === username &&
            isBorrowingActive(borrowing)
    );

}


// ========================================
// LOGIN
// ========================================

function login(username) {

    localStorage.setItem(
        USER_KEY,
        username
    );

    showApp();

}


// ========================================
// LOGOUT
// ========================================

function logout() {

    localStorage.removeItem(USER_KEY);

    document
        .getElementById("appPage")
        .classList.add("hidden");

    document
        .getElementById("loginPage")
        .classList.remove("hidden");

    document
        .getElementById("studentName")
        .value = "";

}


// ========================================
// MENAMPILKAN APLIKASI
// ========================================

function showApp() {

    const username =
        getCurrentUser();

    if (!username) {
        return;
    }

    document
        .getElementById("loginPage")
        .classList.add("hidden");

    document
        .getElementById("appPage")
        .classList.remove("hidden");

    document
        .getElementById("welcomeText")
        .textContent =
        `Selamat datang, ${username}`;

    renderBooks();

    renderBorrowingInfo();

}


// ========================================
// MENAMPILKAN BUKU
// ========================================

function renderBooks() {

    const bookList = document.getElementById("bookList");
    const books = getBooks();
    const username = getCurrentUser();

    // TAMBAHAN: hitung dulu apakah user sudah mentok limit
    const activeBorrowings = getActiveBorrowingsForUser(username);
    const limitReached = activeBorrowings.length >= 3;

    bookList.innerHTML = "";

    books.forEach(book => {

        const available = isBookAvailable(book.id);

        // UBAH: tombol nonaktif jika buku tidak tersedia ATAU limit sudah tercapai
        const disabled = (!available || limitReached);

        const card = document.createElement("div");
        card.className = "book-card";

        card.innerHTML = `
            <h3>${book.title}</h3>
            <p>Penulis: ${book.author}</p>
            <p class="status ${available ? "available" : "unavailable"}">
                Status: ${available ? "Tersedia" : "Sedang Dipinjam"}
            </p>
            <button
                class="borrow-button"
                data-book-id="${book.id}"
                ${disabled ? "disabled" : ""}
            >
                ${
                    !available
                        ? "Tidak Tersedia"
                        : limitReached
                            ? "Batas Maksimal"
                            : "Pinjam"
                }
            </button>
        `;

        bookList.appendChild(card);
    });

    document.querySelectorAll(".borrow-button").forEach(button => {
        button.addEventListener("click", function () {
            const bookId = Number(this.dataset.bookId);
            borrowBook(bookId);
        });
    });
}


// ========================================
// MEMINJAM BUKU
// ========================================

function borrowBook(bookId) {

    const username =
        getCurrentUser();

    if (!username) {

        alert(
            "Silakan login terlebih dahulu."
        );

        return;

    }


    cleanExpiredBorrowings();


    const activeBorrowings =
        getActiveBorrowingsForUser(
            username
        );


    // MAKSIMAL 3 BUKU

    if (activeBorrowings.length >= 3) {

        alert(
            "Peminjaman ditolak. " +
            "Anda sudah memiliki 3 buku aktif."
        );

        return;

    }


    // BUKU HARUS TERSEDIA

    if (!isBookAvailable(bookId)) {

        alert(
            "Peminjaman ditolak. " +
            "Buku sedang dipinjam mahasiswa lain."
        );

        renderBooks();

        return;

    }


    const books =
        getBooks();


    const selectedBook =
        books.find(
            book => book.id === bookId
        );


    if (!selectedBook) {

        alert(
            "Buku tidak ditemukan."
        );

        return;

    }


    // TANGGAL PEMINJAMAN

    const borrowDate =
        new Date();


    // JATUH TEMPO 7 HARI

    const dueDate =
        new Date(borrowDate);

    dueDate.setDate(
        dueDate.getDate() + 7
    );


    const newBorrowing = {

        id: Date.now(),

        username: username,

        bookId: bookId,

        bookTitle:
            selectedBook.title,

        borrowDate:
            borrowDate.toISOString(),

        dueDate:
            dueDate.toISOString()

    };


    const borrowings =
        getBorrowings();


    borrowings.push(
        newBorrowing
    );


    saveBorrowings(
        borrowings
    );


    alert(
        `Buku "${selectedBook.title}" berhasil dipinjam.`
    );


    renderBooks();

    renderBorrowingInfo();

}


// ========================================
// INFORMASI PEMINJAMAN
// ========================================

function renderBorrowingInfo() {

    const username =
        getCurrentUser();

    if (!username) {
        return;
    }


    const activeBorrowings =
        getActiveBorrowingsForUser(
            username
        );


    const countElement =
        document.getElementById(
            "activeBorrowCount"
        );


    const infoElement =
        document.getElementById(
            "borrowInfo"
        );


    countElement.textContent =
        activeBorrowings.length;


    if (activeBorrowings.length === 0) {

        infoElement.innerHTML =
            "Belum ada buku yang dipinjam.";

        return;

    }


    infoElement.innerHTML = "";


    activeBorrowings.forEach(
        borrowing => {

            const borrowDate =
                formatDate(
                    borrowing.borrowDate
                );

            const dueDate =
                formatDate(
                    borrowing.dueDate
                );


            const item =
                document.createElement(
                    "div"
                );


            item.innerHTML = `

                <p>
                    <strong>
                        ${borrowing.bookTitle}
                    </strong>
                </p>

                <p>
                    Tanggal peminjaman:
                    ${borrowDate}
                </p>

                <p>
                    Jatuh tempo:
                    ${dueDate}
                </p>

                <hr>

            `;


            infoElement.appendChild(
                item
            );

        }
    );

}


// ========================================
// FORMAT TANGGAL
// ========================================

function formatDate(dateString) {

    const date =
        new Date(dateString);

    return date.toLocaleDateString(
        "id-ID",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );

}


// ========================================
// EVENT LOGIN
// ========================================

document
    .getElementById("loginForm")
    .addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            const username =
                document
                    .getElementById(
                        "studentName"
                    )
                    .value
                    .trim();


            if (!username) {

                alert(
                    "Nama mahasiswa harus diisi."
                );

                return;

            }


            login(username);

        }
    );


// ========================================
// EVENT LOGOUT
// ========================================

document
    .getElementById("logoutButton")
    .addEventListener(
        "click",
        logout
    );


// ========================================
// MENJALANKAN APLIKASI
// ========================================

initializeData();

cleanExpiredBorrowings();


if (getCurrentUser()) {

    showApp();

}