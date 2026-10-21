# Audit Fondasi Database dan Autentikasi

## Database yang digunakan

Runtime backend utama menggunakan satu database MySQL yang ditentukan oleh `DB_NAME` (default `perpustakaan_db`). Ketiga tabel aplikasi berada di database yang sama:

- `perpustakaan_db.users`: `id`, `username` unik, `password_hash`, `role`, `created_at`.
- `perpustakaan_db.books`: `id`, `title`, `author`, `status`.
- `perpustakaan_db.loans`: `id`, `username`, `book_id`, `book_title`, tanggal pinjam/jatuh tempo, `status`, `returned_at`.

Nama database aktual dapat berbeda jika `DB_NAME` diubah. Relasi `loans.username` ke `users.username` dan `loans.book_id` ke `books.id` dijaga backend; foreign key tidak ditambahkan agar migrasi historis tidak gagal karena data lama yang belum bersih. `book_title` adalah snapshot judul saat peminjaman.

## Migration dan seed

```bash
cp .env.example .env
# Isi kredensial MySQL dan nama database sumber lama pada .env
npm run migrate
```

`backend/migrate.js` membuat database target jika akun MySQL memiliki izin, membuat tabel jika belum ada, dan mencoba menyalin data dari `LEGACY_BOOK_DB_NAME` serta `LEGACY_LOAN_DB_NAME` menggunakan `INSERT IGNORE`. Database sumber tidak diubah atau dihapus. Jika sumber tidak tersedia, seed JSON dipakai sebagai fallback hanya ketika tabel target terkait masih kosong. Log menampilkan jumlah baris ditambahkan dan dilewati. Baris dengan ID/username yang bentrok dapat dilewati; periksa konflik pada log dan bandingkan data sumber-target sebelum menganggap migrasi lengkap. Backup database sumber terlebih dahulu.

Tidak ada akun admin default. Registrasi membuat role `user`; operator berwenang dapat menetapkan role admin secara manual pada database uji.

## Autentikasi

- Registrasi memvalidasi username/password dan menyimpan bcrypt hash tanpa mengembalikan hash.
- Login membaca `users`, membandingkan password menggunakan bcrypt, dan menerbitkan JWT yang memiliki masa berlaku.
- JWT memakai `JWT_SECRET`; API key (`X-API-Key`) merupakan mekanisme akses terpisah.
- `POST /api/books` membutuhkan JWT dengan role `admin`.
- Peminjaman, riwayat, dan pengembalian membutuhkan JWT.

## Batasan verifikasi

Satu pool MySQL digunakan runtime. Handler peminjaman dan pengembalian memakai transaksi pada koneksi yang sama sehingga update `books` dan `loans` dapat di-commit/rollback bersama. Source-level tests belum membuktikan MySQL lokal tersedia atau endpoint sukses saat runtime; jalankan migration, server, Postman, dan query verifikasi pada environment kelompok.
