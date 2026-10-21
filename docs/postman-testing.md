# Panduan pengujian API dengan Postman

Backend aktif berada pada `http://localhost:4000`. Import `api-test/collection.json` dan `api-test/environment.json`; lihat `api-test/README.md` untuk urutan skenario dan prasyarat. Collection dan environment pada folder `postman/` disinkronkan sebagai salinan kompatibilitas.

Jalankan `npm ci`, siapkan `.env`, jalankan MySQL, `npm run migrate`, lalu `npm start`. Jangan menaruh rahasia di file yang dipublikasikan. Gunakan database lokal pengujian.

Skenario penting mencakup registrasi/login, daftar/detail buku, pinjam buku tersedia, buku tidak tersedia, batas tiga pinjaman aktif, deadline tujuh hari, status buku setelah pinjam/kembali, pengembalian berulang, akses riwayat pengguna lain, dan validasi input. Skenario yang memerlukan state khusus memiliki prasyarat dan tidak otomatis disiapkan oleh collection.

Semua status dalam `api-test/RESULTS.md` harus berasal dari request yang benar-benar dieksekusi. Tes source-level tidak membuktikan request HTTP/MySQL lulus. Saat audit Prompt 4, seluruh request Postman berstatus `NOT TESTED` karena dependency dan MySQL runtime tidak tersedia pada environment pembuatan.
