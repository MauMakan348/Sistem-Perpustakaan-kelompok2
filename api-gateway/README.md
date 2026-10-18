# API Gateway

Gateway adalah satu-satunya entry point yang digunakan frontend dan Postman: `http://localhost:4000` secara default. Dari root project jalankan `npm start`; runner root menyalakan Book Service dan Loan Service lebih dahulu lalu memulai Gateway setelah keduanya siap. Service tetap berupa proses terpisah.

Konfigurasi untuk mode satu perintah berada di `.env` root project. Lihat root `.env.example` dan `README.md`. `X-API-Key` diperiksa di Gateway dan tidak diteruskan ke service internal. Registrasi/login tidak perlu API Key; route peminjaman, riwayat, dan pengembalian perlu JWT; tambah buku perlu JWT role admin.

Contoh daftar buku:

```http
GET http://localhost:4000/api/books
X-API-Key: <API_KEY_LOKAL>
```

Jika API Key salah atau tidak ada dan tidak ada JWT valid, Gateway mengembalikan `401`. Jika service upstream tidak tersedia, Gateway mengembalikan `502`; jika timeout, `504`. Port 4001/4002 adalah port internal dan tidak ditujukan untuk request client normal.
