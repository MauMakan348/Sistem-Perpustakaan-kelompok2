# Pengujian API dengan Postman

Base URL: `http://localhost:4000`.

1. Jalankan MySQL dan pastikan database `book_db` serta `loan_db` dan tabel yang diperlukan tersedia.
2. Salin `.env.example` ke `.env`, isi konfigurasi lokal, lalu jalankan `npm install` dan `npm start` dari root.
3. Import `postman/Sistem-Perpustakaan.postman_collection.json` dan environment yang sesuai.
4. Jalankan registrasi lalu login. Simpan token hasil login pada variabel environment dan gunakan header `Authorization: Bearer {{token}}`.
5. Uji daftar/detail buku, penambahan buku dengan token admin, peminjaman, riwayat, pengembalian, dan skenario gagal.
6. Catat status HTTP dan respons aktual. Jangan menganggap tes lulus hanya karena request ada di collection.

## Skenario minimal wajib UTS

- Login valid dan login salah.
- Daftar/detail buku.
- Peminjaman buku tersedia dan buku tidak tersedia.
- Penolakan peminjaman buku keempat ketika sudah ada tiga buku aktif.
- Jatuh tempo tujuh hari setelah tanggal peminjaman.
- Pengembalian buku dan perubahan status buku menjadi tersedia.
- Pengembalian transaksi yang tidak ada atau sudah dikembalikan.
- Penambahan buku oleh admin dan penolakan pengguna biasa.
- Token tidak ada/kedaluwarsa serta akses riwayat pengguna lain.

Catat hasil pada tabel kerja kelompok dengan status awal `BELUM DIUJI` sampai eksekusi aktual dilakukan.
