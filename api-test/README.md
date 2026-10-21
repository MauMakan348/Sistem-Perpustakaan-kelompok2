# Pengujian API dengan Postman

Collection yang aktif untuk arsitektur backend tunggal: `collection.json`; environment template aman: `environment.json`. File duplikat pada `postman/` disinkronkan dengan collection yang sama agar tidak ada endpoint lama yang tertinggal. Base URL `http://localhost:4000`.

## Prasyarat

1. Instal dependency (`npm ci`), siapkan `.env` dari `.env.example`, dan jalankan MySQL lokal.
2. Jalankan `npm run migrate`, lalu `npm start` dari root. Pastikan `GET /health` mengembalikan `200`.
3. Import collection dan environment ini ke Postman lalu pilih `Sistem Perpustakaan - Local Test (safe template)`.
4. Isi `apiKey` dari `.env` hanya pada environment lokal Postman. Isi `password` dan `wrongPassword` sendiri; file template tidak membawa password/token/API key. Gunakan database khusus pengujian.
5. Jalankan `01 Register test user` lalu `02 Login valid`. Username harus unik; jika request registrasi mengembalikan `409`, ubah username lalu ulangi. Token hasil login disimpan ke variabel environment.
6. Jalankan `05 Books list` untuk mengambil contoh ID tersedia/dipinjam bila tersedia. Jika data tidak mencukupi, siapkan buku uji di database lokal secara aman dan catat perubahan tersebut.

## Urutan dan prasyarat skenario

- `00` health check dapat dijalankan kapan saja setelah backend aktif.
- `01` registrasi → `02` login → `03` login password salah. `04` menguji username invalid.
- `05` daftar buku → `06` detail buku → `07` ID detail invalid.
- `08` pinjam buku tersedia → `09` verifikasi status `dipinjam` → `14` pengembalian → `15` verifikasi status `tersedia` → `16` pengembalian berulang. Urutan ini memerlukan buku tersedia dan pengguna yang masih di bawah batas tiga pinjaman aktif.
- `10` menguji buku tidak tersedia; `borrowedBookId` harus sudah diketahui berstatus `dipinjam`.
- `11` menguji pinjaman keempat; perlu tepat tiga pinjaman aktif pada pengguna token dan `fourthBookId` harus merupakan buku tersedia yang berbeda. Collection tidak membuat data tersebut otomatis.
- `12` riwayat sendiri; `13` riwayat pengguna lain dengan `otherUsername` yang berbeda; `17` tanpa token; `18` `bookId` hilang; `19` ID transaksi tidak ditemukan.

Assertion Postman merupakan pemeriksaan response saat request dijalankan, bukan hasil tes yang telah terjadi. Catat output aktual di `RESULTS.md`; simpan screenshot asli jika dibutuhkan. Jangan memasukkan token atau secret dalam screenshot yang dibagikan.

## Pemeriksaan konsistensi database

Sesudah peminjaman, pastikan `loans.status = 'active'` dan `books.status = 'dipinjam'`. Sesudah pengembalian, pastikan transaksi yang sama `returned`, `returned_at` tidak NULL, dan buku `tersedia`. Gunakan SELECT read-only di `RESULTS.md` dengan ID aktual.
