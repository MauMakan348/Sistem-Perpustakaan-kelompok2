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

- `X-API-Key` adalah credential client untuk mengakses Gateway, terutama untuk pengujian Postman dan client tepercaya.
- JWT adalah token autentikasi pengguna yang diterbitkan setelah login. Endpoint transaksi Loan Service memverifikasi JWT dan menggunakan username dari token, bukan mempercayai username body.
- Registrasi dan login dapat diakses tanpa API Key agar browser dapat memulai sesi tanpa menyimpan API Key rahasia. Endpoint API lain dapat menggunakan API Key yang valid atau JWT valid pada Gateway; endpoint transaksi tetap memerlukan JWT valid di Loan Service.

## Environment

Tambahkan `JWT_SECRET` dan `JWT_EXPIRES_IN` pada `loan-service/.env`, serta `JWT_SECRET` pada `api-gateway/.env`. Gunakan secret acak yang panjang dan nilai `JWT_SECRET` yang sama pada kedua service. Jangan commit file `.env` atau memasukkan secret ke JavaScript frontend.

## Migration

Jalankan `npm run migrate` di `loan-service`. Migration memeriksa apakah tabel `users` sudah ada. Jika belum, tabel dibuat. Jika sudah ada, migration memeriksa kolom yang diperlukan dan tidak menghapus tabel atau data pengguna. Jika schema yang sudah ada tidak kompatibel, migration berhenti dengan pesan error agar tidak menimpa data.

## Browser

Frontend mengirim JWT pada header `Authorization: Bearer ...` dan menyimpan token sementara di `sessionStorage` selama sesi tab. Token bukan database pengguna; secret JWT dan API Key tidak pernah disertakan dalam file frontend.


## Role untuk penambahan buku

Registrasi menghasilkan role `user` secara default dan endpoint registrasi tidak menerima parameter role. Operator yang berwenang dapat mengangkat akun menjadi admin melalui koneksi MySQL tepercaya ke `loan_db`:

```sql
UPDATE users SET role = 'admin' WHERE username = 'username_yang_dipilih';
```

Akun admin harus login kembali supaya JWT memuat claim role terbaru. `POST /api/books` mensyaratkan JWT valid dengan `role: admin`; token biasa menghasilkan `403`, sedangkan token hilang/tidak valid menghasilkan `401`. API Key saja tidak memberikan hak untuk menambah buku.
