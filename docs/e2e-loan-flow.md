# Alur End-to-End: Peminjaman dan Pengembalian

Client/Postman dan frontend mengakses satu backend di `http://localhost:4000`. Backend menyimpan akun, buku, dan transaksi dalam satu database MySQL (`DB_NAME`, default `perpustakaan_db`).

## Peminjaman

```http
POST http://localhost:4000/api/loans
Authorization: Bearer <JWT_HASIL_LOGIN>
Content-Type: application/json

{ "bookId": 2 }
```

Username berasal dari JWT. Jika `username` dikirim oleh client, nilainya harus sesuai dengan token. Backend membuka transaksi MySQL, mengunci baris pengguna (`SELECT ... FOR UPDATE`), menghitung pinjaman aktif dan menolak jika sudah tiga. Backend mengunci buku, memastikan status `tersedia`, mengubahnya menjadi `dipinjam`, lalu menyimpan transaksi. Semua perubahan dilakukan pada koneksi dan database yang sama; kegagalan sebelum commit menyebabkan rollback terhadap status buku dan transaksi.

Transaksi menyimpan tanggal pinjam, jatuh tempo tujuh hari kemudian, status `active`, ID buku, snapshot judul, dan username pemilik.

## Pengembalian

```http
POST http://localhost:4000/api/loans/<ID_TRANSAKSI>/return
Authorization: Bearer <JWT_PEMILIK_TRANSAKSI>
```

Backend mengunci transaksi, memeriksa keberadaan, kepemilikan, dan status aktif, lalu mengubah status buku menjadi `tersedia` dan transaksi menjadi `returned` serta mengisi `returned_at` dalam transaksi MySQL yang sama. Pengembalian kedua ditolak dengan `409`; ID tidak ada menghasilkan `404`; transaksi milik pengguna lain menghasilkan `403`.

## Skenario Postman wajib

1. Registrasi dan login, lalu simpan JWT pada environment lokal.
2. `GET /api/books`, pilih buku berstatus `tersedia`.
3. Pinjam buku tersedia; harapkan `201`, `borrowDate`, `dueDate`, dan status buku `dipinjam`.
4. Coba pinjam ID buku yang sama; harapkan `409`.
5. Pastikan tepat tiga pinjaman aktif, lalu pinjaman keempat harapkan `409`.
6. Kembalikan transaksi aktif; harapkan `200` dan status buku `tersedia`.
7. Uji ID transaksi tidak ada (`404`), pengembalian kedua (`409`), transaksi pengguna lain (`403`), dan riwayat username lain (`403`).
8. Restart backend, login kembali, lalu verifikasi data tetap ada.

Hasil aktual harus dicatat dari Postman/SQL. Source-level tests bukan bukti pengujian database runtime.


## Status eksekusi terbaru

Alur di atas adalah penjelasan implementasi dan prosedur uji yang diharapkan, bukan bukti eksekusi. Pada audit Prompt 4, seluruh request Postman dan query database berstatus `NOT TESTED`; tes source-level lulus 24/24. Catat hasil aktual pada `api-test/RESULTS.md` setelah backend dan MySQL aktif.
