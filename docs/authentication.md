# Registrasi dan Login Pengguna

## Endpoint publik melalui API Gateway

### `POST /api/register`

Body JSON:

```json
{
  "username": "mahasiswa01",
  "password": "password-kuat-123"
}
```

- `201 Created`: akun berhasil dibuat; response hanya berisi ID dan username.
- `400 Bad Request`: username/password tidak valid atau tidak lengkap.
- `409 Conflict`: username sudah digunakan.

Username 3-32 karakter dan hanya berisi huruf, angka, atau underscore. Password minimal 8 karakter dan dibatasi 72 byte untuk kompatibilitas bcrypt. Password disimpan sebagai bcrypt hash pada tabel `users` di database milik Loan Service.

### `POST /api/login`

Body JSON memakai `username` dan `password` yang sama dengan registrasi.

- `200 OK`: mengembalikan JWT Bearer dan informasi publik user.
- `400 Bad Request`: input tidak lengkap/tidak valid.
- `401 Unauthorized`: username atau password salah.

Password hash tidak pernah dimasukkan ke response.

## Perbedaan API Key dan JWT

- `X-API-Key` adalah credential yang diperiksa di Gateway untuk GET buku tanpa JWT dan PATCH status buku. Gateway tidak meneruskan key tersebut ke service internal.
- JWT adalah token autentikasi pengguna yang diterbitkan setelah login. Endpoint pinjam, riwayat, dan pengembalian selalu memerlukan JWT; Loan Service menggunakan username dari token, bukan mempercayai username body.
- Registrasi dan login dapat diakses tanpa API Key. GET buku menerima API Key valid atau JWT valid. Penambahan buku memerlukan JWT dengan role `admin`; API Key saja tidak cukup.

## Environment

Untuk mode satu perintah, salin `.env.example` di root menjadi `.env`. Isi `API_KEY`, `JWT_SECRET`, `JWT_EXPIRES_IN`, dan konfigurasi MySQL. Runner root mewariskan environment yang sama ke setiap proses; `JWT_SECRET` harus sama pada Gateway dan Loan Service. `BOOK_DB_NAME` dan `LOAN_DB_NAME` tetap terpisah. Jangan commit file `.env` atau memasukkan secret ke JavaScript frontend.

## Migration

Jalankan `npm run migrate` dari root project setelah database dibuat dan environment diatur. Migration memeriksa apakah tabel `users` sudah ada. Jika belum, tabel dibuat. Jika sudah ada, migration memeriksa kolom yang diperlukan dan tidak menghapus tabel atau data pengguna. Jika schema yang sudah ada tidak kompatibel, migration berhenti dengan pesan error agar tidak menimpa data.

## Browser

Frontend mengirim JWT pada header `Authorization: Bearer ...` dan menyimpan token sementara di `sessionStorage` selama sesi tab. Token bukan database pengguna; secret JWT dan API Key tidak pernah disertakan dalam file frontend.


## Role untuk penambahan buku

Registrasi menghasilkan role `user` secara default dan endpoint registrasi tidak menerima parameter role. Operator yang berwenang dapat mengangkat akun menjadi admin melalui koneksi MySQL tepercaya ke `loan_db`:

```sql
UPDATE users SET role = 'admin' WHERE username = 'username_yang_dipilih';
```

Akun admin harus login kembali supaya JWT memuat claim role terbaru. `POST /api/books` mensyaratkan JWT valid dengan `role: admin`; token biasa menghasilkan `403`, sedangkan token hilang/tidak valid menghasilkan `401`. API Key saja tidak memberikan hak untuk menambah buku.
