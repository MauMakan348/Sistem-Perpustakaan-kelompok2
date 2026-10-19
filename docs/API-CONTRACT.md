# API Contract — Sistem Perpustakaan

Base URL lokal: `http://localhost:4000`. Semua body request dan response menggunakan JSON kecuali halaman frontend. Endpoint di bawah mendeskripsikan kontrak yang dimaksudkan berdasarkan handler backend utama; status operasional wajib dikonfirmasi melalui Postman.

| Method | Path | Auth | Body | Hasil umum |
|---|---|---|---|---|
| POST | `/api/register` | Publik | `{ "username": "mahasiswa1", "password": "password-minimal-8" }` | 201; 400 input salah; 409 username sudah digunakan |
| POST | `/api/login` | Publik | `{ "username": "mahasiswa1", "password": "password-minimal-8" }` | 200 token; 400 input salah; 401 kredensial salah |
| GET | `/api/books` | JWT atau `X-API-Key` | — | 200 array buku |
| GET | `/api/books/:id` | JWT atau `X-API-Key` | — | 200 buku; 400 ID salah; 404 tidak ditemukan |
| POST | `/api/books` | JWT role `admin` | `{ "title": "Judul", "author": "Penulis" }` | 201; 400 validasi; 401/403 akses ditolak |
| POST | `/api/loans` | JWT | `{ "bookId": 1 }` | 201 transaksi; 400 input; 404 buku tidak ada; 409 buku tidak tersedia/batas aktif tercapai |
| GET | `/api/loans/:username` | JWT pemilik | — | 200 array riwayat; 401 token tidak valid; 403 akses user lain |
| POST | `/api/loans/:id/return` | JWT pemilik transaksi | — | 200 berhasil; 404 transaksi tidak ada; 403 bukan pemilik; 409 sudah dikembalikan/konflik status |
| PATCH | `/api/books/:id/status` | `X-API-Key` | `{ "status": "tersedia" }` atau `{ "status": "dipinjam" }` | 200; 400 status/ID salah; 404 buku tidak ada; 409 transisi tidak valid |
| GET | `/health` | Publik | — | 200 status backend |

## Catatan autentikasi

- Kirim JWT pada header `Authorization: Bearer <token>`.
- API key gateway dibaca dari environment `API_KEY` melalui header `X-API-Key`; jangan masukkan secret ke frontend.
- Registrasi menghasilkan role default `user`. Penetapan admin tidak dilakukan oleh endpoint registrasi.
- Endpoint membaca buku menerima JWT valid atau API key. Operasi transaksi memerlukan JWT.

## Database

- `book_db.books`: `id`, `title`, `author`, `status`.
- `loan_db.users`: `id`, `username`, `password_hash`, `role`, `created_at`.
- `loan_db.loans`: `id`, `username`, `book_id`, `book_title`, `borrow_date`, `due_date`, `status`, `returned_at`.

## Status verifikasi

Semua endpoint di dokumen ini harus diuji pada environment kelompok. Jangan menandai lulus hanya karena route tertulis dalam source code. Catat status, request, response aktual, dan tanggal uji pada laporan Postman/code review.
