# Implementasi Fitur Peminjaman dan Pengembalian

## Implementasi aktual

- `backend/server.js` adalah satu-satunya entry point runtime. `backend/migrate.js` menyiapkan schema dan konsolidasi data.
- Satu pool MySQL (`DB_NAME`) digunakan untuk `users`, `books`, dan `loans`.
- Peminjaman mengunci pengguna, memeriksa jumlah pinjaman aktif, mengunci dan memperbarui status buku secara bersyarat, lalu menyimpan transaksi dalam satu transaksi MySQL.
- Pengembalian mengunci transaksi, memeriksa pemilik/status, memperbarui status buku dan transaksi dalam satu transaksi yang sama.
- `POST /api/loans` menerima `{ "bookId": 1 }`; username berasal dari JWT. Riwayat dan pengembalian hanya diizinkan untuk pemiliknya.
- Batas bisnis: maksimal tiga pinjaman aktif; buku harus tersedia; jatuh tempo tujuh hari; pengembalian menandai `returned` dan `returned_at`.

## File lama

Folder `api-gateway/`, `book-service/`, dan `loan-service/` tetap disimpan sebagai referensi/pemulihan, tetapi tidak menjadi proses runtime dari `npm start`. Jangan jalankan service lama bersamaan dengan backend utama.

## Pengujian

`npm run check` dan `npm test` dijalankan setelah perubahan; hasil aktual dicatat pada `docs/FINAL-UTS-AUDIT.md`. Pengujian HTTP dengan MySQL aktif dan Postman harus tetap dijalankan di komputer kelompok sebelum fitur dinyatakan lulus integrasi.
