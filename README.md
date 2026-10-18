# Sistem Perpustakaan — Microservices

Project ini mempertahankan tiga proses backend terpisah: API Gateway, Book Service, dan Loan Service. Jalankan dari root project dengan satu perintah `npm start`; runner menyalakan kedua service internal lebih dahulu, menunggu port-nya siap, lalu menyalakan Gateway. Ini **bukan monolith**: setiap service tetap berjalan sebagai proses Node.js terpisah dan memiliki tanggung jawab/database masing-masing.

## 1. Arsitektur sebelum dan sesudah

### Sebelum pengembangan

Versi awal menggunakan frontend HTML/CSS/JavaScript dan data yang disimpan dalam JSON/localStorage pada tahap awal. Pada tahap microservice sebelumnya, Book Service dan Loan Service sudah dipisah, tetapi belum ada satu entry point yang mengelola startup seluruh service secara terkoordinasi.

```text
Frontend / Client
   |             |
   v             v
Book Service   Loan Service
   |             |
 books data    loans data
```

### Sesudah pengembangan

```text
Frontend / Postman
        |
        v
API Gateway :4000
   |             |
   v             v
Book Service   Loan Service
 :4001            :4002
   ^                |
   |---- HTTP API --|
   |
book_db         loan_db
```

- **API Gateway**: satu entry point untuk client, autentikasi route, routing, dan forwarding.
- **Book Service**: data buku dan status ketersediaan di `book_db`.
- **Loan Service**: pengguna, JWT, transaksi pinjam/kembali di `loan_db`; memanggil Book Service melalui HTTP.
- Root runner menjalankan ketiga proses dan menghentikan semuanya ketika menerima Ctrl+C/SIGTERM. Ketiga proses tetap terpisah.

## 2. Teknologi

- Node.js dengan modul `http` native (Express tidak digunakan).
- MySQL dan `mysql2`.
- `dotenv` untuk konfigurasi environment.
- `bcryptjs` untuk hashing password.
- `jsonwebtoken` untuk JWT.
- Frontend HTML, CSS, dan Vanilla JavaScript.
- Postman Collection untuk pengujian API.

## 3. Instalasi dari awal

Prasyarat: Node.js/npm dan MySQL yang sedang berjalan.

1. Buka terminal di root project.
2. Salin `.env.example` menjadi `.env`.
3. Edit `.env`, isi kredensial MySQL, `API_KEY`, dan `JWT_SECRET`. Buat `API_KEY` acak dan `JWT_SECRET` acak minimal 32 byte. Jangan membagikan atau commit `.env`.
4. Buat database MySQL jika belum ada:

   ```sql
   CREATE DATABASE book_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE DATABASE loan_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

5. Instal dependency di root:

   ```bash
   npm install
   ```

6. Buat/upgrade tabel dan impor data JSON lama yang tersedia:

   ```bash
   npm run migrate
   ```

   Migration tidak menghapus file JSON. Data JSON diimpor sebagai seed; untuk ID buku yang sudah ada, migration memperbarui judul/penulis tetapi mempertahankan status ketersediaan aktif. Migration Loan Service menambahkan kolom `status` dan `returned_at` yang belum ada pada tabel lama tanpa menghapus transaksi yang ada.

7. Jalankan semua backend dengan satu perintah:

   ```bash
   npm start
   ```

   Runner menyalakan Book Service dan Loan Service, menunggu port siap, lalu menjalankan API Gateway. Jika service atau koneksi MySQL gagal saat startup, penyebab dilaporkan dan proses yang sudah berjalan dihentikan. Tekan `Ctrl+C` untuk menghentikan semua proses.

Gateway: `http://localhost:4000`. Frontend statis ada di `frontend/index.html`; buka melalui server statis lokal jika browser memblokir permintaan file langsung. Frontend mengakses Gateway pada port 4000.

## 4. Environment variables

Konfigurasi utama dibaca dari `.env` di root project. File `.env.example` hanya berisi placeholder.

| Variable | Default/contoh | Kegunaan |
|---|---|---|
| `GATEWAY_PORT` | `4000` | Port Gateway |
| `BOOK_PORT` | `4001` | Port Book Service |
| `LOAN_PORT` | `4002` | Port Loan Service |
| `BOOK_SERVICE_HOST` | `127.0.0.1` | Host Book Service yang dipanggil Gateway/Loan Service |
| `BOOK_SERVICE_PORT` | `4001` | Port Book Service internal |
| `LOAN_SERVICE_HOST` | `127.0.0.1` | Host Loan Service yang dipanggil Gateway |
| `LOAN_SERVICE_PORT` | `4002` | Port Loan Service internal |
| `API_KEY` | wajib diisi | Kunci akses tepercaya pada Gateway; jangan letakkan di frontend |
| `JWT_SECRET` | wajib, minimal 32 byte | Signing secret JWT, nilainya sama untuk Gateway dan Loan Service |
| `JWT_EXPIRES_IN` | `2h` | Masa berlaku token |
| `DB_HOST`, `DB_PORT` | `127.0.0.1`, `3306` | Host/port MySQL |
| `DB_USER`, `DB_PASSWORD` | sesuai konfigurasi lokal | Kredensial MySQL |
| `BOOK_DB_NAME` | `book_db` | Database milik Book Service |
| `LOAN_DB_NAME` | `loan_db` | Database milik Loan Service |
| `STARTUP_TIMEOUT_MS` | `30000` | Batas waktu menunggu service siap |

Gunakan `API_KEY` dan `JWT_SECRET` berbeda satu sama lain. API Key adalah kunci yang diperiksa Gateway; JWT adalah identitas pengguna yang diterbitkan setelah login. Jangan mengirim API Key ke frontend publik atau menyimpan nilai rahasia di Postman Collection yang dipublikasikan.

## 5. Registrasi, login, dan token

Registrasi akun baru dengan role `user`:

```http
POST http://localhost:4000/api/register
Content-Type: application/json
```

```json
{ "username": "mahasiswa01", "password": "password-lokal-123" }
```

Contoh response `201`:

```json
{ "message": "Registrasi berhasil.", "user": { "id": 1, "username": "mahasiswa01" } }
```

Login:

```http
POST http://localhost:4000/api/login
Content-Type: application/json
```

```json
{ "username": "mahasiswa01", "password": "password-lokal-123" }
```

Response sukses `200` berisi `token`, `tokenType: "Bearer"`, `expiresIn`, dan `user`. Gunakan token untuk endpoint pengguna:

```http
Authorization: Bearer <TOKEN_HASIL_LOGIN>
```

Registrasi normal tidak membuat administrator. Untuk memberi hak admin, registrasikan akun terlebih dahulu, lalu operator database yang berwenang menjalankan perintah terencana berikut dengan username yang tepat:

```sql
UPDATE loan_db.users SET role = 'admin' WHERE username = 'username_yang_dipilih';
```

Logout frontend menghapus token dari `sessionStorage`; token juga kedaluwarsa sesuai `JWT_EXPIRES_IN`. Jangan pernah memasukkan JWT signing secret ke client.

## 6. Cara menggunakan API Key

Untuk membaca buku dengan API Key atau memanggil endpoint status internal melalui Gateway, gunakan header:

```http
X-API-Key: <API_KEY_DARI_ENV_ROOT>
```

Gateway memeriksa key dan **tidak meneruskan header `X-API-Key` ke service internal**. API Key tidak menggantikan JWT untuk peminjaman, riwayat, atau pengembalian. Registrasi/login tidak memerlukan API Key. Penambahan buku memerlukan JWT dengan role `admin`.

## 7. Endpoint API Gateway

| Method | Path | Auth | Fungsi |
|---|---|---|---|
| `POST` | `/api/register` | Tidak perlu | Registrasi user |
| `POST` | `/api/login` | Tidak perlu | Login dan memperoleh JWT |
| `GET` | `/api/books` | API Key **atau** JWT | Daftar buku |
| `GET` | `/api/books/:id` | API Key **atau** JWT | Detail buku |
| `POST` | `/api/books` | JWT role `admin` | Tambah buku |
| `PATCH` | `/api/books/:id/status` | API Key | Perubahan status untuk operasi tepercaya; umumnya dipanggil Loan Service melalui HTTP internal |
| `POST` | `/api/loans` | JWT | Pinjam buku; `bookId` pada body |
| `GET` | `/api/loans/:username` | JWT pemilik | Riwayat transaksi pengguna dari database (termasuk status aktif/dikembalikan) |
| `POST` | `/api/loans/:id/return` | JWT pemilik transaksi | Kembalikan berdasarkan ID transaksi peminjaman |

### Daftar dan detail buku

```http
GET /api/books
X-API-Key: <API_KEY>
```

Contoh response `200` berupa array:

```json
[{ "id": 2, "title": "Contoh Judul", "author": "Contoh Penulis", "status": "tersedia" }]
```

Detail:

```http
GET /api/books/2
Authorization: Bearer <TOKEN>
```

Response `200` berupa objek buku; ID yang tidak ada menghasilkan `404`.

### Menambah buku

Hanya token dengan role `admin`:

```http
POST /api/books
Authorization: Bearer <TOKEN_ADMIN>
Content-Type: application/json
```

```json
{ "title": "Buku Baru", "author": "Nama Penulis" }
```

Response `201` berisi `message` dan objek `book` dengan status awal `tersedia`. Judul dan penulis wajib berupa string tidak kosong. Token user biasa menghasilkan `403`; tanpa token valid menghasilkan `401`.

### Meminjam buku

```http
POST /api/loans
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

```json
{ "bookId": 2 }
```

Username diambil dari token, bukan dari body. Response `201` berisi transaksi dengan `id`, `username`, `bookId`, `bookTitle`, `borrowDate`, `dueDate`, dan `status: "active"`. Batasnya maksimal 3 pinjaman aktif per pengguna dan masa pinjam 7 hari. Buku yang tidak tersedia menghasilkan `409`; buku tidak ditemukan menghasilkan `404`.

### Mengembalikan buku

Gunakan **ID transaksi pinjaman**, bukan ID buku:

```http
POST /api/loans/1712345678000123/return
Authorization: Bearer <TOKEN_PEMILIK>
```

Response `200` memuat `loan.status: "returned"` dan `returnedAt`. Transaksi yang sudah dikembalikan kembali akan menghasilkan `409`; transaksi yang bukan milik pengguna menghasilkan `403`.

### Riwayat transaksi

```http
GET /api/loans/mahasiswa01
Authorization: Bearer <TOKEN_MAHASISWA01>
```

Response `200` berupa array transaksi dengan `status` (`active` atau `returned`) dan `returnedAt` (null jika belum dikembalikan). Username pada path harus sama dengan pemilik token, jika tidak hasilnya `403`.

## 8. Postman

File tersedia di `postman/`:

- `Sistem-Perpustakaan.postman_collection.json`
- `Sistem-Perpustakaan.postman_environment.json`

Import keduanya ke Postman dan pilih environment `Sistem Perpustakaan - Local`. Isi `apiKey` dan `password` lokal secara manual; jangan ekspor environment berisi credential. Jalankan urutan umum:

1. Registrasi user baru (username harus unik).
2. Login pengguna; test script menyimpan JWT ke variable `token`.
3. GET daftar/detail buku.
4. Login dengan akun role admin untuk request tambah buku (role admin harus ditetapkan oleh operator DB).
5. POST peminjaman; request menyimpan `loanId` dari response sukses.
6. GET riwayat dengan username yang cocok dengan token.
7. POST pengembalian menggunakan `{{loanId}}`.
8. Ulangi return untuk menguji `409`, dan uji API Key salah, token tidak ada, buku tidak ditemukan, dan user mencoba mengakses riwayat orang lain.

Semua request normal dari klien ditujukan ke `http://localhost:4000`; jangan mengirim request klien langsung ke port 4001/4002. Untuk hasil pengujian, lihat `docs/postman-testing.md` dan jalankan request terhadap lingkungan lokal.

## 9. Error umum

- **`API_KEY belum diatur` / `JWT_SECRET belum diatur`:** buat `.env` dari `.env.example`; JWT secret harus minimal 32 byte.
- **Koneksi MySQL gagal / service tidak siap:** pastikan MySQL aktif, database `book_db` dan `loan_db` dibuat, kredensial benar, lalu jalankan `npm run migrate`.
- **Port sudah dipakai:** ubah `GATEWAY_PORT`, `BOOK_PORT`, atau `LOAN_PORT` beserta port service tujuan yang terkait di `.env`, lalu mulai ulang.
- **`401`:** cek API Key untuk route yang memerlukannya atau login kembali dan gunakan `Authorization: Bearer <token>`.
- **`403`:** token tidak punya role/ownership yang diperlukan; penambahan buku perlu role admin dan riwayat/return harus milik token aktif.
- **`409`:** buku tidak tersedia, batas pinjaman aktif tercapai, atau transaksi sudah dikembalikan.
- **`502` / `504`:** service internal tidak tersedia atau timeout; periksa log berlabel service di terminal `npm start`.
- **Username sudah dipakai:** pilih username lain; registrasi duplikat menghasilkan `409`.

## 10. Tes dan status verifikasi

Perintah yang tersedia:

```bash
npm run check
npm test
```

Hasil pemeriksaan yang benar-benar dijalankan saat paket ini disusun:

| Pemeriksaan | Status | Hasil |
|---|---|---|
| `npm run check` | PASS | Syntax check runner dan service utama berhasil. |
| `node --check` seluruh file JavaScript | PASS | Tidak ditemukan syntax error. |
| `node --test api-gateway/test/security-audit.test.js loan-service/test/regression-audit.test.js` | PASS | 11 tes source-level lulus. Tes ini memeriksa pola source, bukan simulasi DB/concurrency runtime. |
| `npm ls --package-lock-only --all` | PASS | Dependency tree pada lockfile terbaca dan konsisten dengan package manifest. |
| `npm test` | FAIL | 11 lulus, 1 file tes gagal dimuat karena `Cannot find module 'bcryptjs'`; dependency belum terpasang di lingkungan penyusunan. |
| `npm start` | FAIL / terhambat lingkungan | Runner berhenti sebelum startup karena modul `dotenv` belum terpasang. Instalasi dependency dicoba tetapi timeout saat mengakses registry. |
| Tes end-to-end dengan MySQL aktif, pinjam/kembali, dan shutdown proses | NOT TESTED | Perlu `npm install`, MySQL aktif, migration, lalu pengujian runtime/Postman. |

Tes autentikasi menguji hashing/JWT tanpa database, tetapi belum bisa dijalankan di lingkungan ini karena dependency belum terpasang. Jalankan `npm install`, lalu `npm test` dan pengujian Postman dengan MySQL aktif untuk memverifikasi seluruh alur. Jangan menyimpulkan E2E lulus hanya dari tes source-level.

## 11. Dokumen pendukung

- `docs/architecture.md` — arsitektur, ownership database, alur lintas-service.
- `docs/authentication.md` — aturan autentikasi.
- `docs/e2e-loan-flow.md` — alur pinjam lintas-service.
- `docs/postman-testing.md` — skenario Postman.
- `docs/ai-usage.md` dan `docs/prompts.md` — penggunaan AI Coding Tool dan prompt pengembangan.
