# Sistem Perpustakaan — Backend API tunggal

Project ini telah disiapkan untuk target UTS dengan **satu proses backend Node.js** pada port `4000`. Backend menangani route autentikasi, katalog buku, peminjaman, pengembalian, dan riwayat. Frontend tetap berada di folder `frontend/` dan dapat dilayani langsung oleh backend; Postman dapat menguji API tanpa menjalankan frontend terpisah.

## Arsitektur saat ini

```text
Client / Postman / Frontend
           |
           v
Backend API tunggal :4000
   |                    |
   v                    v
MySQL book_db        MySQL loan_db
(tabel books)        (tabel users, loans)
```

Untuk mempertahankan data yang ada, backend utama menggunakan dua database MySQL yang sudah digunakan project (`book_db` dan `loan_db`). Semua akses database dilakukan langsung dari proses backend; tidak ada request runtime ke port Book Service `4001` atau Loan Service `4002`.

Folder `api-gateway/`, `book-service/`, dan `loan-service/` tetap dipertahankan sebagai kode historis dan referensi/pemulihan pada tahap migrasi ini. Script `npm start` tidak menjalankan file server lama.

## Persyaratan

- Node.js dan npm
- MySQL aktif dengan database `book_db` dan `loan_db` yang sudah ada
- Kredensial database dengan izin akses ke kedua database

## Menyiapkan environment

Dari root repository:

```bash
cp .env.example .env
```

Edit `.env` dan isi `DB_USER`, `DB_PASSWORD`, `API_KEY`, serta `JWT_SECRET`. Gunakan JWT secret acak minimal 32 byte. Jangan commit atau membagikan `.env`.

Jangan menjalankan migration jika tidak diperlukan. Untuk membuat schema/seed pada instalasi baru, periksa dulu isi migration dan pastikan database target benar:

```bash
npm run migrate
```

Perintah migration memakai script service lama untuk mempertahankan schema yang telah ada; tidak diperlukan untuk menjalankan backend bila tabel sudah tersedia.

## Instalasi dan menjalankan

```bash
npm install
npm start
```

Backend melakukan pengecekan koneksi ke kedua database sebelum listen pada `http://localhost:4000`. Untuk health check:

```bash
curl -i http://localhost:4000/health
```

Buka `http://localhost:4000/` untuk frontend. API bisa diuji langsung lewat Postman pada base URL `http://localhost:4000`.

## Endpoint utama

| Method | Endpoint | Fungsi | Akses |
|---|---|---|---|
| POST | `/api/register` | Registrasi | Publik |
| POST | `/api/login` | Login dan memperoleh JWT | Publik |
| GET | `/api/books` | Daftar buku | JWT atau `X-API-Key` |
| GET | `/api/books/:id` | Detail buku | JWT atau `X-API-Key` |
| POST | `/api/books` | Tambah buku | JWT role `admin` |
| POST | `/api/loans` | Meminjam buku | JWT |
| GET | `/api/loans/:username` | Riwayat pengguna sendiri | JWT |
| POST | `/api/loans/:id/return` | Mengembalikan buku | JWT pemilik transaksi |

`PATCH /api/books/:id/status` tetap tersedia untuk operasi administratif internal dan memerlukan `X-API-Key`. Frontend tidak menyimpan API key; gunakan login untuk operasi pengguna.

## Business rule

- Maksimal 3 peminjaman aktif per pengguna.
- Buku hanya bisa dipinjam jika status `tersedia`.
- Jatuh tempo adalah tanggal peminjaman ditambah 7 hari.
- Saat peminjaman berhasil, status buku berubah menjadi `dipinjam`; setelah pengembalian berhasil, status berubah menjadi `tersedia`.
- Password disimpan sebagai bcrypt hash, bukan teks biasa. Token JWT memiliki masa berlaku.

## Pengujian

```bash
npm run check
npm test
```

`npm run check` memeriksa sintaks file JavaScript. Tes source-level bukan pengganti tes integrasi database. Jalankan skenario Postman pada `postman/Sistem-Perpustakaan.postman_collection.json` dan catat hasil aktual sebelum menyatakan fitur lulus.

## Catatan migrasi

Perubahan ini mengalihkan startup ke `backend/server.js`. Service lama dan database tidak dihapus. Backend utama tetap menggunakan schema `books` pada `book_db`, serta `users` dan `loans` pada `loan_db`. Sebelum menghapus kode lama atau menggabungkan database, lakukan code review dan tes end-to-end terlebih dahulu.
