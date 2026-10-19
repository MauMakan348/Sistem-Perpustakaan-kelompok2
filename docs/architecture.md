# Arsitektur Sistem Perpustakaan (target backend tunggal)

## Arsitektur runtime

```text
Client / Postman / Frontend
           |
           v
      backend/server.js :4000
        /      |      \
      Auth    Books    Loans
        \      |      /
         MySQL databases
       book_db   loan_db
```

Satu proses Node.js menangani endpoint publik dan terhubung langsung ke dua database MySQL yang sudah ada. `book_db` tetap memiliki tabel `books`; `loan_db` tetap memiliki tabel `users` dan `loans`. Tidak ada foreign key lintas database; hubungan buku/transaksi dijaga melalui ID dan validasi aplikasi.

## File aktif dan legacy

- Aktif sebagai entry point: `backend/server.js`.
- `frontend/` tetap tersedia dan dilayani dari backend pada port yang sama.
- `api-gateway/`, `book-service/`, `loan-service/`, serta `scripts/start-all.js` dipertahankan untuk referensi/pemulihan migrasi. `npm start` tidak menjalankan server-server lama.
- Migration lama dipertahankan untuk menjaga schema dan data. Jangan jalankan migration pada database produksi tanpa memeriksa SQL terlebih dahulu.

## Konfigurasi

Salin `.env.example` menjadi `.env` pada root. Variabel utama: `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `BOOK_DB_NAME`, `LOAN_DB_NAME`, `API_KEY`, `JWT_SECRET`, dan `JWT_EXPIRES_IN`. Jangan commit `.env`.

## Aturan utama

- Maksimal 3 peminjaman aktif per pengguna.
- Buku hanya dapat dipinjam jika `status = 'tersedia'`.
- Jatuh tempo tujuh hari setelah tanggal pinjam.
- Peminjaman mengubah status buku menjadi `dipinjam`; pengembalian mengubahnya menjadi `tersedia` dan menandai transaksi `returned`.
- Password disimpan dalam bentuk bcrypt hash; JWT memakai secret dari environment.

## Verifikasi

`npm run check` memeriksa sintaks. `npm test` mencakup pemeriksaan source dan tes autentikasi/regresi. Tes sumber tidak menggantikan pengujian runtime dengan MySQL aktif. Semua endpoint harus diverifikasi memakai Postman sebelum dinyatakan lulus.
