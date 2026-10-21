# API Contract — Sistem Perpustakaan

> **Basis dokumentasi:** audit terhadap handler di `backend/server.js` pada versi project ini. Dokumentasi ini membedakan endpoint yang benar-benar terdaftar dari endpoint yang punya masalah implementasi. Kode route bukan bukti bahwa endpoint telah lulus uji integrasi.

## 1. Base URL dan menjalankan backend

- Base URL lokal: `http://localhost:4000` (nilai default; port dapat diubah melalui `PORT`).
- Jalankan dari root project:

```bash
npm install
cp .env.example .env
# Edit .env: DB_USER, DB_PASSWORD, API_KEY, JWT_SECRET, dan konfigurasi DB bila perlu
npm start
```

Backend memeriksa koneksi ke database `DB_NAME` (default `perpustakaan_db`) sebelum mulai listen. `JWT_SECRET` wajib tersedia dengan panjang minimal 32 byte; jika tidak, proses keluar. `API_KEY` juga sebaiknya diisi; jika kosong, endpoint yang mewajibkan API key akan menolak request. Jangan membagikan atau commit file `.env`.

Health check:

```http
GET http://localhost:4000/health
```

Contoh response `200`:

```json
{ "service": "Sistem Perpustakaan Backend", "status": "ok" }
```

`GET /` menyajikan `frontend/index.html` karena handler frontend berjalan sebelum handler metadata root. Oleh sebab itu, response aktual untuk `/` adalah halaman HTML, bukan objek daftar endpoint yang juga tertulis pada handler berikutnya.

## 2. Header, token, dan format umum

### API key

Endpoint katalog buku menerima salah satu dari:

```http
X-API-Key: <nilai-API_KEY-di-env>
```

atau JWT yang valid. Endpoint `PATCH /api/books/:id/status` hanya menerima API key. API key adalah akses antarlayanan/internal dan **bukan** token login pengguna. Jangan menaruh API key di frontend.

### JWT pengguna

Untuk endpoint yang memerlukan login, kirim:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Token diperoleh dari `POST /api/login`. Kode menandatangani JWT dengan issuer `perpustakaan-loan-service`; masa berlaku menggunakan `JWT_EXPIRES_IN`, default `2h`. Token yang tidak ada, tidak valid, atau kedaluwarsa menghasilkan `401` pada endpoint terlindungi. Registrasi membuat role default `user`; endpoint registrasi tidak menyediakan parameter untuk membuat admin.

### Format umum dan batasan

- Body JSON harus berupa object JSON, bukan array atau nilai primitif.
- Body JSON tidak valid menghasilkan `400`.
- Body lebih dari 1 MiB menghasilkan `413`.
- Query parameter tidak digunakan oleh endpoint API yang diaudit.
- Respons error umumnya berbentuk `{ "error": "pesan" }`; respons berhasil mengikuti contoh per endpoint di bawah.
- Kesalahan database/internal yang tidak ditangani secara khusus menghasilkan `500` dengan pesan generik.

## 3. Endpoint autentikasi

### `POST /api/register` — membuat akun

**Akses:** publik. **Body wajib:**

```json
{ "username": "mahasiswa1", "password": "passwordku123" }
```

Validasi aktual:

- `username` dan `password` harus bertipe string.
- Username di-trim, diubah menjadi huruf kecil, dan harus 3–32 karakter, hanya huruf ASCII, angka, atau underscore (`[a-zA-Z0-9_]`).
- Password minimal 8 karakter dan maksimal 72 byte UTF-8.
- Password di-hash dengan bcrypt cost 12; hash tidak dikembalikan.

Contoh berhasil (`201`):

```json
{
  "message": "Registrasi berhasil.",
  "user": { "id": 12, "username": "mahasiswa1" }
}
```

Status lain:

- `400` — field hilang/salah tipe, username tidak sesuai pola, password di luar batas, atau JSON tidak valid.
- `409` — username sudah digunakan.
- `413` — body terlalu besar.
- `500` — kesalahan internal/database.

### `POST /api/login` — login dan mendapatkan token

**Akses:** publik. **Body:**

```json
{ "username": "mahasiswa1", "password": "passwordku123" }
```

Username di-trim dan diubah menjadi huruf kecil. Kode hanya memvalidasi bahwa username dan password berupa string dan tidak kosong; aturan panjang/pola registrasi tidak diterapkan ulang pada login.

Contoh berhasil (`200`; `id` dan `expiresIn` mengikuti data/konfigurasi runtime):

```json
{
  "message": "Login berhasil.",
  "token": "<JWT-yang-dihasilkan-server>",
  "tokenType": "Bearer",
  "expiresIn": "2h",
  "user": { "id": 12, "username": "mahasiswa1", "role": "user" }
}
```

Status lain:

- `400` — username/password kosong atau bukan string, atau JSON tidak valid.
- `401` — username tidak ditemukan atau password salah.
- `413` — body terlalu besar.
- `500` — kesalahan database/internal.

**Cara menggunakan token:** salin nilai `token` dari response login lalu tambahkan header `Authorization: Bearer <token>` pada request berikutnya yang memerlukan JWT. Jangan mengirim password atau token dalam query string.

## 4. Endpoint katalog buku

### `GET /api/books` — daftar buku

**Akses:** JWT valid **atau** `X-API-Key` valid. Tanpa keduanya menghasilkan `401`. Tidak ada body atau query parameter yang dipakai.

Contoh berhasil (`200`):

```json
[
  { "id": 1, "title": "Laskar Pelangi", "author": "Andrea Hirata", "status": "tersedia" },
  { "id": 2, "title": "Bumi", "author": "Tere Liye", "status": "dipinjam" }
]
```

Response adalah array buku dengan field `id`, `title`, `author`, `status`, diurutkan berdasarkan `id`. Jika tidak ada buku, hasilnya array kosong `[]`.

### `GET /api/books/:id` — detail buku

**Path parameter:** `id` harus bilangan bulat positif yang aman direpresentasikan JavaScript. **Akses:** JWT valid atau API key valid.

Contoh: `GET /api/books/1`

Response berhasil (`200`):

```json
{ "id": 1, "title": "Laskar Pelangi", "author": "Andrea Hirata", "status": "tersedia" }
```

Status lain:

- `400` — `id` bukan bilangan bulat positif yang valid.
- `401` — API key dan token tidak valid/tidak ada.
- `404` — buku tidak ditemukan.
- `500` — kesalahan internal/database.

### `POST /api/books` — menambahkan buku

**Akses:** JWT valid dengan `role: "admin"`. API key saja tidak cukup untuk endpoint ini. **Body:**

```json
{ "title": "Laskar Pelangi", "author": "Andrea Hirata" }
```

Validasi aktual: `title` dan `author` harus string yang tidak kosong setelah trim; judul maksimal 500 karakter dan penulis maksimal 255 karakter. Status awal selalu `tersedia`; klien tidak dapat menentukan `id` atau `status` melalui body.

Response berhasil (`201`):

```json
{
  "message": "Buku berhasil ditambahkan.",
  "book": { "id": 21, "title": "Laskar Pelangi", "author": "Andrea Hirata", "status": "tersedia" }
}
```

Status lain:

- `400` — judul/penulis hilang, bukan string, kosong, terlalu panjang, atau JSON tidak valid.
- `401` — token tidak ada/tidak valid/kedaluwarsa.
- `403` — pengguna bukan admin.
- `413` — body terlalu besar.
- `500` — kesalahan database/internal.

**Catatan implementasi:** route ini hanya bisa digunakan oleh akun ber-role `admin`, tetapi `POST /api/register` selalu membuat role `user` dan tidak ada endpoint promosi role dalam route yang diaudit. Pembuatan akun admin harus dilakukan melalui mekanisme administrasi/database yang aman di luar endpoint registrasi.

### `PATCH /api/books/:id/status` — mengubah status buku (internal)

**Akses:** `X-API-Key` valid. **Path parameter:** `id` positif. **Body:**

```json
{ "status": "tersedia" }
```

Nilai status yang diterima hanya `tersedia` atau `dipinjam`. Kode hanya menerima transisi `tersedia` → `dipinjam` atau `dipinjam` → `tersedia`; permintaan yang tidak mengubah status dari nilai yang diharapkan ditolak.

Contoh berhasil (`200`):

```json
{
  "message": "Status buku diperbarui.",
  "book": { "id": 1, "title": "Laskar Pelangi", "author": "Andrea Hirata", "status": "tersedia" }
}
```

Status lain: `400` ID/status tidak valid; `401` API key tidak valid/tidak ada; `404` buku tidak ditemukan; `409` transisi status gagal/konflik; `413` body terlalu besar; `500` kesalahan internal/database.

**Status setelah refaktor:** handler hanya menerima `PATCH /api/books/:id/status`. Path `PATCH /api/books` tanpa ID tidak lagi cocok dengan route ini dan mengembalikan `404`.

## 5. Endpoint peminjaman dan pengembalian

### `POST /api/loans` — membuat peminjaman

**Akses:** JWT pengguna. **Body:**

```json
{ "bookId": 1 }
```

`bookId` dapat berupa nilai yang bisa dikonversi menjadi bilangan bulat positif oleh `Number(...)`; nilai kosong/hilang, bukan bilangan bulat positif, atau tidak aman ditolak. `username` tidak diperlukan dan bukan sumber identitas. Jika `username` dikirim, setelah trim/lowercase harus sama dengan pengguna dari JWT, jika tidak `403`.

Business rule aktual:

- Maksimal 3 transaksi dengan `status = "active"` per username.
- Buku harus ada dan statusnya `tersedia`.
- Identitas peminjam berasal dari JWT, bukan body.
- Tanggal jatuh tempo ditetapkan backend 7 × 24 jam setelah `borrowDate`.
- Saat berhasil, status buku menjadi `dipinjam` dan transaksi baru berstatus `active`.
- Backend mengunci baris akun selama pemeriksaan batas peminjaman, serta memakai conditional update pada status buku untuk mencegah dua request mengambil buku yang sama.

Response berhasil (`201`; nilai tanggal dan ID aktual dihasilkan saat runtime):

```json
{
  "message": "Buku berhasil dipinjam.",
  "loan": {
    "id": 1760000000000123,
    "username": "mahasiswa1",
    "bookId": 1,
    "bookTitle": "Laskar Pelangi",
    "borrowDate": "2026-10-19T10:00:00.000Z",
    "dueDate": "2026-10-26T10:00:00.000Z",
    "status": "active"
  }
}
```

Contoh status gagal:

- `400` — `bookId` hilang/tidak valid, atau body JSON tidak valid.
- `401` — token tidak ada/tidak valid/kedaluwarsa atau akun token tidak lagi tersedia.
- `403` — `username` di body (jika diberikan) tidak cocok dengan pengguna login.
- `404` — buku tidak ditemukan.
- `409` — pengguna sudah memiliki 3 peminjaman aktif atau buku sudah tidak tersedia.
- `413` — body terlalu besar.
- `500` — kesalahan internal/database.

### `GET /api/loans/:username` — riwayat peminjaman pengguna

**Akses:** JWT dan hanya pemilik akun yang cocok dengan `:username`. Path parameter di-decode, di-trim, dan diubah menjadi huruf kecil sebelum dibandingkan dengan username JWT. Tidak ada body atau query parameter.

Contoh: `GET /api/loans/mahasiswa1`

Response berhasil (`200`):

```json
[
  {
    "id": 1760000000000123,
    "username": "mahasiswa1",
    "bookId": 1,
    "bookTitle": "Laskar Pelangi",
    "borrowDate": "2026-10-19T10:00:00.000Z",
    "dueDate": "2026-10-26T10:00:00.000Z",
    "status": "active",
    "returnedAt": null
  }
]
```

Field riwayat berasal dari query SQL yang memilih `id`, `username`, `book_id AS bookId`, `book_title AS bookTitle`, `borrow_date AS borrowDate`, `due_date AS dueDate`, `status`, dan `returned_at AS returnedAt`. Hasil diurutkan dari tanggal pinjam terbaru. Bila tidak ada transaksi, response `[]`.

Status lain:

- `400` — username path tidak dapat di-decode.
- `401` — token tidak ada/tidak valid/kedaluwarsa.
- `403` — mencoba melihat riwayat pengguna lain.
- `500` — kesalahan internal/database.

### `POST /api/loans/:id/return` — mengembalikan buku

**Akses:** JWT pemilik transaksi. **Path parameter:** `id` transaksi harus bilangan bulat positif. Tidak memerlukan body; request dapat dikirim tanpa JSON body.

Contoh: `POST /api/loans/1760000000000123/return`

Response berhasil (`200`):

```json
{
  "message": "Buku berhasil dikembalikan.",
  "loan": {
    "id": 1760000000000123,
    "username": "mahasiswa1",
    "bookId": 1,
    "bookTitle": "Laskar Pelangi",
    "status": "returned",
    "returnedAt": "2026-10-19T11:00:00.000Z"
  }
}
```

`returnedAt` merupakan waktu yang dibaca kembali dari database setelah `UTC_TIMESTAMP(3)` ditulis. Respons pengembalian tidak menyertakan `borrowDate` atau `dueDate` pada implementasi saat ini.

Status lain:

- `400` — ID transaksi tidak valid.
- `401` — token tidak ada/tidak valid/kedaluwarsa.
- `403` — transaksi milik pengguna lain.
- `404` — transaksi tidak ditemukan.
- `409` — transaksi sudah dikembalikan, status transaksi tidak sesuai, data buku hilang, status buku tidak cocok, atau status buku berubah bersamaan.
- `500` — kesalahan internal/database.

## 6. Endpoint status dan endpoint yang tidak tersedia

### `GET /health`

Publik, tanpa body atau autentikasi. Mengembalikan `200` dengan objek status backend. Endpoint ini hanya membuktikan proses menjawab health check; tidak menggantikan uji seluruh fungsi API.

### `GET /`

Menyajikan `frontend/index.html` (`200` jika file dapat dibaca). Backend juga memiliki handler JSON root yang mendeklarasikan daftar endpoint, tetapi handler itu tidak tercapai karena `serveFrontend` menangani `/` lebih dahulu. Jika file frontend gagal dibaca, handler mengembalikan `500` JSON.

### Endpoint yang tidak ditemukan

Path/method yang tidak cocok dengan route API yang didaftarkan mengembalikan `404`:

```json
{ "error": "Endpoint tidak ditemukan." }
```

Khusus path API dengan prefix `/api/loans`, backend memeriksa JWT terlebih dahulu; request tanpa JWT ke path tersebut dapat menerima `401` sebelum pemeriksaan route akhir. Preflight `OPTIONS` dijawab `204` dengan header CORS dan tanpa body.

## 7. Business rule dan keterbatasan konsistensi

- Database runtime: `DB_NAME.users`, `DB_NAME.books`, dan `DB_NAME.loans` (default `perpustakaan_db`).
- Status buku yang digunakan handler: `tersedia` dan `dipinjam`.
- Status transaksi yang digunakan handler: `active` dan `returned`.
- Batas peminjaman: maksimal tiga transaksi aktif per pengguna.
- Durasi peminjaman: tujuh hari dihitung sebagai 7 × 24 jam, bukan aturan kalender berdasarkan zona waktu lokal.
- Pengembalian hanya boleh dilakukan pemilik transaksi dan hanya untuk transaksi aktif.
- Data buku dan transaksi berada pada satu database. Handler pinjam/kembali memperbarui status buku dan transaksi dalam satu transaksi MySQL; pengujian integrasi masih diperlukan untuk memverifikasi perilaku aktual.

## 8. Tabel perbandingan route aktual dengan dokumentasi

| Route/method aktual di `backend/server.js` | Dokumentasi | Hasil audit |
|---|---|---|
| `GET /health` | Didokumentasikan | Sesuai; publik, `200` |
| `GET /` | Didokumentasikan | Perlu catatan: aktual menyajikan HTML; handler JSON root tertutup oleh urutan handler frontend |
| `POST /api/register` | Didokumentasikan | Sesuai berdasarkan handler; belum berarti lulus uji integrasi |
| `POST /api/login` | Didokumentasikan | Sesuai berdasarkan handler; token JWT dan masa berlaku berasal dari konfigurasi |
| `GET /api/books` | Didokumentasikan | Sesuai; JWT atau API key |
| `GET /api/books/:id` | Didokumentasikan | Sesuai; JWT atau API key |
| `POST /api/books` | Didokumentasikan | Sesuai berdasarkan handler; hanya JWT role `admin`, namun endpoint registrasi tidak membuat admin |
| `PATCH /api/books/:id/status` | Didokumentasikan | Sesuai untuk path dengan ID; memerlukan API key |
| `PATCH /api/books` | Tidak didukung | Path tanpa ID tidak cocok dengan route status dan seharusnya menghasilkan `404` |
| `POST /api/loans` | Didokumentasikan | Sesuai berdasarkan handler; belum diuji terhadap MySQL aktif |
| `GET /api/loans/:username` | Didokumentasikan | Sesuai berdasarkan handler; hanya pemilik |
| `POST /api/loans/:id/return` | Didokumentasikan | Sesuai berdasarkan handler; hanya pemilik transaksi |
| `OPTIONS *` (preflight CORS) | Didokumentasikan | Sesuai; `204` tanpa body |
| Path/method API lain | Didokumentasikan | `404` jika tidak ditangani; prefix `/api/loans` dapat lebih dulu menghasilkan `401` bila token tidak ada |

## 9. Status verifikasi

Audit ini memeriksa route dan handler dalam source code, bukan melakukan request HTTP ke server dengan MySQL aktif. Dengan demikian:

- **Terverifikasi dari kode:** nama route, metode, validasi yang tertulis, cabang status response, field yang dibentuk dalam response, aturan autentikasi yang terlihat di handler.
- **Belum diverifikasi secara runtime:** respons aktual terhadap database yang aktif, keberhasilan query/insert, nilai timestamp dari sistem, masa berlaku JWT yang berjalan, serta alur end-to-end dari login sampai pengembalian.
- **Langkah verifikasi:** jalankan seluruh contoh melalui Postman setelah backend dan database `DB_NAME` aktif; pastikan `PATCH /api/books` menghasilkan `404`.

Jangan menyatakan kontrak ini lulus uji integrasi sampai request dan response aktual dicatat pada environment project.


## 10. Header dan autentikasi per endpoint (ringkasan audit)

| Method dan path | Header akses | Body/parameter utama | Status yang ditangani source |
|---|---|---|---|
| `GET /health` | Tidak perlu | — | `200` |
| `POST /api/register` | `Content-Type: application/json` | `username`, `password` | `201`, `400`, `409`, `413`, `500` |
| `POST /api/login` | `Content-Type: application/json` | `username`, `password` | `200`, `400`, `401`, `413`, `500` |
| `GET /api/books` | `Authorization: Bearer <JWT>` atau `X-API-Key` | — | `200`, `401`, `500` |
| `GET /api/books/:id` | JWT atau API Key | ID positif pada path; string nonnumerik menghasilkan `400` | `200`, `400`, `401`, `404`, `500` |
| `POST /api/books` | JWT dengan role `admin` | `title`, `author` | `201`, `400`, `401`, `403`, `413`, `500` |
| `PATCH /api/books/:id/status` | `X-API-Key` | `status` = `tersedia` atau `dipinjam` | `200`, `400`, `401`, `404`, `409`, `413`, `500` |
| `POST /api/loans` | JWT pengguna | `bookId`; `username` opsional hanya untuk pemeriksaan kesesuaian | `201`, `400`, `401`, `403`, `404`, `409`, `413`, `500` |
| `GET /api/loans/:username` | JWT pemilik | username pada path harus sama dengan username JWT | `200`, `400`, `401`, `403`, `500` |
| `POST /api/loans/:id/return` | JWT pemilik transaksi | ID transaksi positif pada path; body tidak dibutuhkan | `200`, `400`, `401`, `403`, `404`, `409`, `500` |

Header `Content-Type: application/json` diperlukan ketika mengirim JSON body. Header `Authorization` harus menggunakan format `Bearer <token>`. API Key hanya untuk endpoint yang secara eksplisit menyebutkannya; API Key tidak menggantikan JWT untuk transaksi pengguna. `OPTIONS` ditangani sebagai preflight CORS dan mengembalikan `204`.

**Catatan status tes:** isi kontrak di atas diturunkan dari handler `backend/server.js`. Pada audit paket Prompt 4, tes source-level lulus, tetapi server tidak dapat dijalankan pada environment ini karena dependency dan MySQL tidak tersedia. Seluruh hasil runtime HTTP/MySQL/Postman tetap `NOT TESTED`.
