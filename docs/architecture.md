# Arsitektur Sistem Peminjaman Buku Perpustakaan

## 1. Perubahan arsitektur

### Sebelum pengembangan

Project awal berupa frontend HTML/CSS/JavaScript dengan data berbasis file JSON atau penyimpanan lokal pada tahap awal. Pada tahap microservice awal, Book Service dan Loan Service telah dipisahkan tetapi client masih dapat mengakses service secara langsung.

```text
Browser / Client
   |             |
   v             v
Book Service   Loan Service
   |             |
 books data    loans data
```

### Setelah pengembangan

```text
                  Browser / Postman
                         |
                    HTTP :4000
                         v
                 +----------------+
                 | API Gateway    |
                 | auth + routing |
                 +-------+--------+
                         |
               +---------+----------+
               |                    |
               v                    v
       +---------------+    +----------------+
       | Book Service  |    | Loan Service   |
       | :4001         |    | :4002          |
       +-------+-------+    +--------+-------+
               |                     |
               v                     v
          MySQL book_db          MySQL loan_db
               ^                     |
               |                     |
               +---- HTTP API --------+
                    Loan -> Book
```

Port `4000` adalah entry point client. Port `4001` dan `4002` digunakan oleh service. Gateway diimplementasikan dengan Node.js native `http`, bukan Express.

## 2. Tanggung jawab komponen

### API Gateway (`api-gateway/server.js`, default port 4000)

- Memetakan `/api/books...` ke Book Service dan `/api/loans...`, `/api/register`, `/api/login` ke Loan Service.
- Memvalidasi API Key pada route yang membutuhkannya dan memverifikasi JWT untuk route pengguna.
- Mensyaratkan role `admin` untuk `POST /api/books`.
- Mengonsumsi `X-API-Key` di Gateway; header tersebut tidak diteruskan ke service internal.
- Meneruskan method, path/query, body, `Content-Type`, `Accept`, `Authorization`, dan header relevan yang dipilih.
- Mengembalikan error `502` saat upstream tidak tersedia dan `504` pada timeout.
- Tidak menyimpan data atau menjalankan aturan bisnis peminjaman.

### Book Service (`book-service/server.js`, default port 4001)

Mengelola daftar buku, detail buku, penambahan buku, serta transisi status `tersedia`/`dipinjam`. Data disimpan di MySQL `book_db`, tabel `books`. Perubahan status menggunakan update bersyarat berdasarkan status yang diharapkan; jika status sudah berubah, service mengembalikan `409`.

### Loan Service (`loan-service/server.js`, default port 4002)

Mengelola registrasi/login, hashing password dengan `bcryptjs`, JWT, peminjaman, pengembalian, dan data riwayat transaksi. Data pengguna dan pinjaman disimpan di MySQL `loan_db`, tabel `users` dan `loans`. Loan Service meminta detail dan mengubah status buku melalui HTTP API Book Service; tidak menggunakan koneksi ke `book_db`.

## 3. Database ownership dan migration

| Service | Database | Tabel | Ownership |
|---|---|---|---|
| Book Service | `book_db` | `books` | Buku dan status buku |
| Loan Service | `loan_db` | `users`, `loans` | Akun pengguna dan transaksi peminjaman |

Setiap service menggunakan `mysql2` dan konfigurasi koneksi sendiri. File `books.json` dan `loans.json` tetap ada sebagai sumber data migration. Script `migrate.js` membuat/menyesuaikan skema dan mengimpor data lama bila tersedia; migration Loan Service menambahkan kolom status pengembalian untuk tabel lama tanpa menghapus baris yang sudah ada.

## 4. Route publik Gateway

| Method | Path Gateway | Tujuan internal |
|---|---|---|
| `POST` | `/api/register` | Loan Service `POST /register` |
| `POST` | `/api/login` | Loan Service `POST /login` |
| `GET` | `/api/books` | Book Service `GET /books` |
| `GET` | `/api/books/:id` | Book Service `GET /books/:id` |
| `POST` | `/api/books` | Book Service `POST /books` |
| `PATCH` | `/api/books/:id/status` | Book Service `PATCH /books/:id/status` |
| `POST` | `/api/loans` | Loan Service `POST /loans` |
| `GET` | `/api/loans/:username` | Loan Service `GET /loans/:username` |
| `POST` | `/api/loans/:id/return` | Loan Service `POST /loans/:id/return` |

## 5. Aturan autentikasi

- `POST /api/register` dan `POST /api/login` adalah route publik supaya pengguna dapat membuat akun dan memperoleh token.
- GET buku menerima API Key valid atau JWT valid.
- POST penambahan buku memerlukan JWT valid dengan `role: admin`; registrasi normal memberikan role `user`.
- Route peminjaman, riwayat, dan pengembalian memerlukan JWT valid. API Key tidak menggantikan JWT pengguna.
- PATCH status buku memerlukan API Key valid dan dimaksudkan untuk operasi tepercaya/backend.
- `JWT_SECRET` minimal 32 byte dan nilainya harus sama di Gateway dan Loan Service. `API_KEY` disimpan di environment Gateway. Tidak satu pun secret dimasukkan ke frontend.

Header client:

```http
X-API-Key: <API_KEY_LOKAL>
Authorization: Bearer <JWT_HASIL_LOGIN>
Content-Type: application/json
```

## 6. Alur peminjaman end-to-end

1. Client mengirim `POST /api/loans` dengan `Authorization: Bearer <JWT>` dan body `{ "bookId": 2 }`.
2. Gateway memvalidasi token dan meneruskan request ke Loan Service.
3. Loan Service mengambil identitas username dari JWT, memeriksa batas maksimal 3 pinjaman aktif, lalu meminta detail buku lewat `GET /books/:id` ke Book Service.
4. Jika buku tersedia, Loan Service meminta Book Service melakukan transisi atomik `tersedia` menjadi `dipinjam` lewat `PATCH /books/:id/status`. Hanya satu request yang dapat memenangkan transisi bersamaan.
5. Loan Service memasukkan transaksi ke `loan_db` dengan status `active` dan tanggal jatuh tempo 7 hari setelah peminjaman.
6. Jika insert gagal setelah reservasi buku, Loan Service mencoba mengembalikan status buku menjadi `tersedia`; kegagalan kompensasi dicatat untuk rekonsiliasi.

## 7. Alur pengembalian

1. Client mengirim `POST /api/loans/:id/return` menggunakan ID transaksi pinjaman, bukan ID buku, dengan JWT pemilik.
2. Loan Service mengunci baris transaksi dengan `SELECT ... FOR UPDATE`, memeriksa kepemilikan dan status `active`.
3. Loan Service memeriksa buku lewat Book Service, mengubah status buku menjadi `tersedia`, kemudian menyimpan `status='returned'` dan `returned_at` dalam transaksi MySQL.
4. Transaksi yang sudah dikembalikan tidak dapat dikembalikan lagi (`409`). Jika update transaksi gagal setelah status buku berubah, Loan Service mencoba kompensasi mengubah status buku kembali menjadi `dipinjam`.
5. `GET /api/loans/:username` menampilkan riwayat transaksi milik pengguna yang tokennya digunakan, termasuk transaksi berstatus `active` dan `returned`.

## 8. Environment dan teknologi

- Mode satu perintah membaca `.env` di root: `GATEWAY_PORT`, `BOOK_PORT`, `LOAN_PORT`, `BOOK_SERVICE_HOST`, `BOOK_SERVICE_PORT`, `LOAN_SERVICE_HOST`, `LOAN_SERVICE_PORT`, `API_KEY`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `BOOK_DB_NAME`, dan `LOAN_DB_NAME`.
- `BOOK_DB_NAME` dan `LOAN_DB_NAME` dipakai untuk memastikan setiap service memakai database miliknya meskipun environment diwariskan dari satu root process.
- File `.env.example` di dalam direktori service tetap tersedia untuk mode menjalankan service secara individual, tetapi petunjuk utama project menggunakan root `.env`.
- Stack: Node.js native HTTP, MySQL, `mysql2`, `dotenv`, `bcryptjs`, `jsonwebtoken`, HTML/CSS/Vanilla JS, Postman.

## 9. Batasan verifikasi

Source-level syntax check dan tes unit/static yang tersedia tidak membuktikan alur database end-to-end. Dalam hasil audit terakhir, tes source-level regresi dan tes keamanan Gateway lulus, sedangkan tes autentikasi Loan Service terhambat dependency `bcryptjs` yang tidak tersedia dan instalasi dependency timeout. Tes end-to-end dengan MySQL aktif belum dijalankan pada environment audit tersebut.

## 10. Menjalankan seluruh backend dengan satu perintah

Dari root project jalankan `npm install`, siapkan root `.env` dari `.env.example`, buat kedua database, lalu jalankan `npm run migrate` dan `npm start`. `scripts/start-all.js` menjalankan Book Service dan Loan Service sebagai child process terpisah, menunggu port mereka siap, baru memulai API Gateway. Ini menggunakan pendekatan process runner yang setara dengan menjalankan beberapa service melalui satu script; tidak menggabungkan source code menjadi monolith.

Runner meneruskan log dengan label nama service, memeriksa kesiapan port, dan menghentikan semua child process jika startup gagal atau pengguna menekan Ctrl+C. Ketika port sudah dipakai proses lain, startup akan gagal dengan pesan yang menyebut service/port; hentikan proses lama atau ubah port pada root `.env`. Semua proses mewarisi environment root, dengan `BOOK_DB_NAME` dan `LOAN_DB_NAME` terpisah agar ownership database tetap benar.
