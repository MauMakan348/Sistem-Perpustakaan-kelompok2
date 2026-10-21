# Arsitektur Aktual Sistem Perpustakaan

## Arsitektur runtime

```text
Browser / Postman
       |
       v
backend/server.js :4000  (satu proses backend utama)
       |
       v
MySQL: perpustakaan_db
  +-- users
  +-- books
  +-- loans
```

`npm start` dari root menjalankan `node backend/server.js`. Backend menyajikan frontend dari folder `frontend/` dan API HTTP/JSON pada port `4000`. Frontend menggunakan URL relatif/same-origin sehingga tidak mengarah ke Gateway atau port service lama.

## Database dan konsolidasi data

Runtime menggunakan satu database MySQL yang dipilih oleh `DB_NAME` (default `perpustakaan_db`). Tabel `users`, `books`, dan `loans` berada dalam database yang sama. Peminjaman dan pengembalian mengubah status buku serta transaksi dalam satu transaksi MySQL, sehingga rollback mencakup kedua perubahan. Tabel tidak menggunakan foreign key untuk `loans.username` dan `loans.book_id` agar migrasi data historis tetap kompatibel; backend memvalidasi relasi tersebut.

Jalankan `npm run migrate` untuk membuat schema dan mengimpor data secara non-destruktif dari database lama yang disebut oleh `LEGACY_BOOK_DB_NAME` dan `LEGACY_LOAN_DB_NAME`. Database lama hanya dibaca dan tidak dihapus/diubah. Baris yang bertabrakan dengan primary/unique key target dapat dilewati oleh `INSERT IGNORE`; periksa log migrasi dan rekonsiliasi konflik sebelum menyatakan migrasi data selesai. Backup database lama sebelum menjalankan migrasi.

## Folder legacy yang dipertahankan

- `backend/server.js`: satu-satunya entry point runtime aktif.
- `backend/migrate.js`: migrasi schema dan konsolidasi data ke database utama.
- `api-gateway/`, `book-service/`, `loan-service/`, dan `scripts/start-all.js`: implementasi/runner lama yang dipertahankan sebagai referensi atau pemulihan. `npm start` tidak menjalankan proses tersebut dan backend utama tidak melakukan HTTP request ke service-service itu. Jangan menjalankan server legacy bersamaan dengan backend utama pada port yang sama.
- `book-service/books.json` dan `loan-service/loans.json`: seed fallback untuk instalasi baru jika sumber database lama tidak tersedia dan tabel target masih kosong. Setelah data berhasil dikonsolidasikan, database adalah sumber runtime.

## Environment

Salin `.env.example` menjadi `.env` di root dan isi `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `LEGACY_BOOK_DB_NAME`, `LEGACY_LOAN_DB_NAME`, `PORT`, `API_KEY`, `JWT_SECRET`, dan `JWT_EXPIRES_IN`. Variabel legacy hanya digunakan saat migrasi; backend runtime menggunakan `DB_NAME`. Jangan commit `.env`.

## Business rules

- Maksimal tiga pinjaman aktif per pengguna.
- Buku hanya bisa dipinjam jika `status = 'tersedia'`.
- Jatuh tempo ditetapkan tujuh hari (7 × 24 jam) setelah peminjaman.
- Pengembalian hanya dilakukan pemilik transaksi aktif.
- Pinjam/kembali memperbarui `books.status` dan `loans.status` dalam transaksi database yang sama.
- Password disimpan sebagai bcrypt hash; login menerbitkan JWT yang diverifikasi memakai secret environment.

## Verifikasi

`npm run check` memeriksa sintaks JavaScript termasuk file legacy. `npm test` memeriksa kontrak source-level dan tes terkait yang tersedia. Kedua perintah itu tidak menggantikan pengujian integrasi dengan MySQL aktif dan eksekusi Postman.


## Audit endpoint dan verifikasi terbaru

API Contract yang mengikuti route aktif ada di `docs/API-CONTRACT.md`; Postman utama ada di `api-test/collection.json` dan environment aman di `api-test/environment.json`. Root `/` menyajikan `frontend/index.html`; gunakan `/health` untuk health check JSON. Endpoint tambah buku mensyaratkan JWT role `admin`, tetapi registrasi normal hanya membuat role `user`; tidak ada akun admin bawaan.

Pada audit Prompt 4, tes source-level 24/24 lulus, `npm run check` dan `node --check frontend/script.js` lulus. Tes HTTP, migrasi, dan transaksi MySQL belum dijalankan karena dependency runtime, konfigurasi `.env`, dan MySQL tidak tersedia di environment audit.
