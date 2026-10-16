# Sistem Peminjaman Buku Perpustakaan — Microservice

Project ini mengembangkan aplikasi perpustakaan web menjadi sistem Node.js dengan API Gateway, Book Service, Loan Service, dan dua database MySQL yang dimiliki service masing-masing. Client web dan Postman mengakses API melalui Gateway `http://localhost:4000`.

## Arsitektur sebelum dan sesudah

**Sebelum:** aplikasi perpustakaan sederhana berbasis HTML, CSS, dan JavaScript dengan data buku/peminjaman berbasis JSON atau penyimpanan lokal pada tahap awal. Pada tahap microservice awal, service dapat diakses langsung oleh client.

**Sesudah:**

```text
Browser / Postman
       | HTTP + aturan API Key/JWT
       v
API Gateway :4000
   |                 |
   v                 v
Book Service :4001  Loan Service :4002
   |                 |       |
   v                 |       +---- HTTP API ----> Book Service
book_db (MySQL)      v
                  loan_db (MySQL)
```

Gateway merutekan request dan meneruskan response, bukan menjalankan aturan bisnis peminjaman. Book Service hanya mengelola `book_db`; Loan Service hanya mengelola `loan_db` dan mengambil data/mengubah status buku melalui HTTP API Book Service. File `books.json` dan `loans.json` dipertahankan sebagai sumber data migration lama, bukan persistence aktif.

## Komponen dan teknologi

| Komponen | Fungsi | Port default |
|---|---|---:|
| API Gateway | Entry point, pemeriksaan API Key/JWT/role sesuai route, routing dan forwarding | 4000 |
| Book Service | Daftar/detail buku, penambahan buku, perubahan status buku | 4001 |
| Loan Service | Registrasi/login, JWT, peminjaman, pengembalian, riwayat transaksi | 4002 |
| Book DB | Tabel `books` | MySQL 3306 |
| Loan DB | Tabel `users` dan `loans` | MySQL 3306 |

Backend memakai Node.js native `http` (tanpa Express), `mysql2`, `dotenv`, `bcryptjs`, dan `jsonwebtoken`. Frontend memakai HTML, CSS, dan Vanilla JavaScript. Postman digunakan untuk pengujian API.

## Persyaratan dan instalasi

Pastikan Node.js/npm dan MySQL tersedia. Dari root project, pasang dependency di tiap service:

```bash
cd book-service && npm install
cd ../loan-service && npm install
cd ../api-gateway && npm install
```

Salin masing-masing `.env.example` menjadi `.env`. Jangan commit atau membagikan `.env` berisi credential nyata.

### Environment variable

`book-service/.env`:

```env
PORT=4001
DB_HOST=localhost
DB_PORT=3306
DB_NAME=book_db
DB_USER=root
DB_PASSWORD=isi_password_mysql_lokal
```

`loan-service/.env`:

```env
PORT=4002
BOOK_SERVICE_HOST=127.0.0.1
BOOK_SERVICE_PORT=4001
DB_HOST=localhost
DB_PORT=3306
DB_NAME=loan_db
DB_USER=root
DB_PASSWORD=isi_password_mysql_lokal
JWT_SECRET=ganti_dengan_secret_random_minimal_32_byte
JWT_EXPIRES_IN=2h
```

`api-gateway/.env`:

```env
PORT=4000
BOOK_SERVICE_HOST=127.0.0.1
BOOK_SERVICE_PORT=4001
LOAN_SERVICE_HOST=127.0.0.1
LOAN_SERVICE_PORT=4002
API_KEY=ganti_dengan_api_key_lokal
JWT_SECRET=gunakan_secret_yang_sama_dengan_loan_service
```

Gateway mewajibkan `API_KEY` dan `JWT_SECRET` (minimal 32 byte). `JWT_SECRET` pada Gateway dan Loan Service harus sama. Nilai di atas adalah contoh konfigurasi, bukan secret siap pakai.

## Menyiapkan database dan menjalankan aplikasi

1. Buat database di MySQL:

   ```sql
   CREATE DATABASE book_db CHARACTER SET utf8mb4;
   CREATE DATABASE loan_db CHARACTER SET utf8mb4;
   ```
2. Jalankan migration untuk membuat/menyesuaikan schema dan mengimpor data JSON lama bila tersedia:

   ```bash
   cd book-service && npm run migrate
   cd ../loan-service && npm run migrate
   ```
3. Jalankan setiap service di terminal terpisah:

   ```bash
   cd book-service && npm start
   ```
   ```bash
   cd loan-service && npm start
   ```
   ```bash
   cd api-gateway && npm start
   ```
4. Buka `frontend/index.html` di browser. Frontend menggunakan Gateway di port 4000; jangan arahkan client ke port internal 4001/4002.
5. Import `postman/Sistem-Perpustakaan.postman_collection.json` ke Postman dan import environment `postman/Sistem-Perpustakaan.postman_environment.json`. Pilih environment itu, lalu isi `apiKey` dengan API key lokal yang sama dengan `api-gateway/.env`. Isi username/password uji sesuai akun yang terdaftar.

Jalankan migration sebelum service diuji. Akun admin tidak dibuat melalui registrasi publik: registrasi menghasilkan role `user`. Untuk memberi role admin, operator database tepercaya dapat menjalankan query berikut pada `loan_db` dan pengguna harus login ulang:

```sql
UPDATE users SET role = 'admin' WHERE username = 'username_yang_dipilih';
```

Jangan memberikan akses database kepada pengguna umum.

## Autentikasi: API Key dan JWT

- `POST /api/register` dan `POST /api/login` tidak memerlukan API Key.
- `X-API-Key: {{apiKey}}` adalah credential client untuk Gateway, bukan identitas pengguna. GET buku menerima API Key valid atau JWT valid; `PATCH /api/books/:id/status` memerlukan API Key valid.
- Route peminjaman, riwayat, dan pengembalian memerlukan JWT pengguna yang valid. API Key saja tidak cukup.
- `POST /api/books` memerlukan JWT dengan `role: admin`; akun registrasi baru ber-role `user` dan akan mendapat `403` jika mencoba menambah buku.
- Login mengembalikan `token`. Kirim pada request terlindungi sebagai `Authorization: Bearer <token>`. Postman Collection menyimpan token hasil login ke variable `token` secara otomatis.

### Registrasi

`POST {{baseUrl}}/api/register`

```json
{ "username": "mahasiswa01", "password": "PasswordUji123!" }
```

Contoh response `201 Created`:

```json
{
  "message": "Registrasi berhasil.",
  "user": { "id": 1, "username": "mahasiswa01" }
}
```

Username dinormalisasi menjadi huruf kecil, 3–32 karakter, hanya huruf/angka/underscore. Password minimal 8 karakter dan maksimum 72 byte. Username duplikat menghasilkan `409`.

### Login dan token

`POST {{baseUrl}}/api/login`

```json
{ "username": "mahasiswa01", "password": "PasswordUji123!" }
```

Contoh response `200 OK` (token disingkat):

```json
{
  "message": "Login berhasil.",
  "token": "<JWT_DARI_RESPONSE>",
  "tokenType": "Bearer",
  "expiresIn": "2h",
  "user": { "id": 1, "username": "mahasiswa01", "role": "user" }
}
```

Gunakan token aktual dari response, bukan teks placeholder. Token kedaluwarsa harus diperoleh ulang dengan login.

## Endpoint API melalui Gateway

Semua URL berikut memakai base URL `http://localhost:4000`.

| Method dan path | Header / body | Akses dan hasil utama |
|---|---|---|
| `POST /api/register` | JSON `{ "username", "password" }` | Publik; `201`, username duplikat `409`, input invalid `400` |
| `POST /api/login` | JSON `{ "username", "password" }` | Publik; `200` berisi JWT, kredensial salah `401` |
| `GET /api/books` | `X-API-Key` valid atau JWT valid | `200`, array buku berisi `id`, `title`, `author`, `status` |
| `GET /api/books/:id` | `X-API-Key` valid atau JWT valid | `200` detail; `404` jika tidak ada |
| `POST /api/books` | `Authorization: Bearer <JWT admin>`, JSON `{ "title", "author" }` | `201`; `401` token tidak valid/tidak ada, `403` bukan admin, `400` input invalid |
| `POST /api/loans` | `Authorization: Bearer <JWT>`, JSON `{ "bookId": 2 }` | `201`; `400` ID invalid, `404` buku tidak ada, `409` buku tak tersedia/batas tercapai |
| `GET /api/loans/:username` | `Authorization: Bearer <JWT>` | `200` array peminjaman aktif milik akun yang login; akses username lain `403` |
| `POST /api/loans/:id/return` | `Authorization: Bearer <JWT>` | `200` transaksi dikembalikan; `404` transaksi tidak ada, `403` bukan pemilik, `409` sudah dikembalikan |
| `PATCH /api/books/:id/status` | `X-API-Key` valid, JSON `{ "status": "dipinjam" }` atau `{ "status": "tersedia" }` | Endpoint operasi internal/trusted; `200`, konflik transisi `409` |

Untuk `POST /api/loans`, username peminjam diambil dari JWT, bukan dari body. Batasnya 3 peminjaman aktif per pengguna dengan masa pinjam 7 hari. Saat pengembalian berhasil, `status` transaksi menjadi `returned`, `returnedAt` diisi, dan status buku menjadi `tersedia`. Endpoint `GET /api/loans/:username` menampilkan pinjaman aktif; detail transaksi yang telah dikembalikan tersimpan pada database, tetapi tidak termasuk daftar aktif tersebut.

### Contoh peminjaman

Request:

```http
POST /api/loans
Authorization: Bearer <JWT_DARI_LOGIN>
Content-Type: application/json
```

```json
{ "bookId": 2 }
```

Contoh response `201 Created`:

```json
{
  "message": "Buku berhasil dipinjam.",
  "loan": {
    "id": 1780000000000000,
    "username": "mahasiswa01",
    "bookId": 2,
    "bookTitle": "Contoh Judul",
    "borrowDate": "2026-10-16T10:00:00.000Z",
    "dueDate": "2026-10-23T10:00:00.000Z",
    "status": "active"
  }
}
```

Nilai ID, tanggal, dan judul di atas hanya ilustrasi bentuk response; gunakan nilai aktual dari server.

### Contoh pengembalian

`POST /api/loans/:id/return` menggunakan `id` transaksi pinjaman (loan ID), bukan ID buku. Contoh response `200 OK`:

```json
{
  "message": "Buku berhasil dikembalikan.",
  "loan": {
    "id": 1780000000000000,
    "username": "mahasiswa01",
    "bookId": 2,
    "bookTitle": "Contoh Judul",
    "status": "returned",
    "returnedAt": "2026-10-16T11:00:00.000Z"
  }
}
```

## Skenario Postman

Gunakan Collection dan environment yang disertakan. Jalankan berurutan:

1. Register (username baru), lalu Login; request login menyimpan JWT ke `token`.
2. GET daftar buku dan GET detail buku.
3. POST penambahan buku dengan JWT admin; JWT dari akun `user` seharusnya ditolak `403`.
4. POST peminjaman dengan `bookId` yang tersedia; Collection menyimpan `loanId` dari response untuk request return.
5. GET riwayat aktif pengguna dengan username yang sama dengan token.
6. POST return menggunakan `loanId`, lalu coba return sekali lagi untuk memastikan transaksi kedua ditolak `409`.
7. Uji API Key salah/tidak ada, token tidak ada/invalid, buku tidak ditemukan, buku sudah dipinjam, dan service internal mati (Gateway diharapkan memberi `502`, atau `504` untuk timeout).

Expected status code dalam deskripsi Collection adalah ekspektasi skenario, bukan bukti bahwa seluruh skenario telah dieksekusi. Untuk detail test, lihat `docs/postman-testing.md`.

## Error umum

- **Gateway berhenti saat startup:** pastikan `API_KEY` ada dan `JWT_SECRET` minimal 32 byte.
- **`401` pada route pengguna:** login ulang, gunakan `Authorization: Bearer <token>`, dan pastikan token belum kedaluwarsa.
- **`401` pada GET buku tanpa token:** tambahkan `X-API-Key` yang sama dengan konfigurasi Gateway.
- **`403` saat menambah buku:** hanya JWT role `admin` yang dapat menambah buku; registrasi publik membuat role `user`.
- **`409` saat pinjam:** buku sudah dipinjam, batas 3 buku aktif tercapai, atau status berubah bersamaan. Gunakan buku yang tersedia dan periksa riwayat aktif.
- **`502` / `504`:** pastikan service tujuan aktif dan host/port pada `.env` sesuai.
- **Error koneksi MySQL:** pastikan MySQL aktif, database sudah dibuat, credential benar, lalu jalankan `npm run migrate`.
- **Module tidak ditemukan:** jalankan `npm install` pada folder service yang error.
- **`409` saat return:** transaksi sudah pernah dikembalikan; gunakan loan ID transaksi yang masih aktif.

## AI Coding Tool dan verifikasi

ChatGPT digunakan untuk membantu analisis requirement, perencanaan perubahan, debugging, pembuatan kode/dokumentasi, serta skenario Postman. Prompt yang tercatat tersedia pada `docs/prompts.md`; evaluasi dan keterbatasan pemeriksaan ada di `docs/ai-usage.md`.

Pemeriksaan terakhir yang tercatat pada patch audit: syntax check untuk service/migration/frontend lulus; 4 tes source-level regresi dan 6 tes keamanan Gateway lulus. Tes `loan-service/test/auth.test.js` belum berjalan sukses karena dependency `bcryptjs` tidak tersedia saat pengujian dan instalasi dependency timeout. Tes end-to-end dengan MySQL aktif belum dijalankan. Karena itu hasil tersebut tidak boleh ditafsirkan sebagai bukti semua alur runtime telah lulus.
