# Pengujian API dengan Postman

## Persiapan

1. Pastikan MySQL aktif, migration sudah dijalankan, dan seluruh service berjalan melalui `npm start` dari root.
2. Import `postman/Sistem-Perpustakaan.postman_collection.json` dan `postman/Sistem-Perpustakaan.postman_environment.json`.
3. Pilih environment **Sistem Perpustakaan - Local**.
4. Isi `apiKey` sesuai `.env` lokal dan `password` untuk akun uji. Jangan ekspor file environment yang berisi credential nyata.
5. Registrasi dan login tidak memakai API Key. Login menyimpan JWT ke variable `token`. Endpoint transaksi membutuhkan `Authorization: Bearer {{token}}`.

Semua request client menggunakan `{{baseUrl}}` (default `http://localhost:4000`), bukan port internal 4001/4002.

## Urutan pengujian utama

| Urutan | Request | Auth | Hasil yang diharapkan |
|---|---|---|---|
| 1 | `POST /api/register` | Tidak perlu | `201`; username duplikat `409`; input invalid `400` |
| 2 | `POST /api/login` | Tidak perlu | `200`, token JWT disimpan ke environment; credential salah `401` |
| 3 | `GET /api/books` | API Key valid atau JWT | `200`, array buku |
| 4 | `GET /api/books/{{availableBookId}}` | API Key valid atau JWT | `200` detail buku; ID tidak ada `404` |
| 5 | `POST /api/books` | JWT role admin | `201`; token user biasa `403`, token hilang `401` |
| 6 | `POST /api/loans` | JWT user | `201`, transaksi berstatus `active`; request menyimpan `loanId` |
| 7 | `GET /api/loans/{{username}}` | JWT pemilik | `200`, daftar transaksi pemilik termasuk status aktif dan dikembalikan |
| 8 | `POST /api/loans/{{loanId}}/return` | JWT pemilik transaksi | `200`, `loan.status` menjadi `returned` dan `returnedAt` terisi |
| 9 | Ulangi return pada ID sama | JWT pemilik | `409`, transaksi sudah dikembalikan |

### Contoh body

Registrasi/login:

```json
{ "username": "{{username}}", "password": "{{password}}" }
```

Tambah buku (login sebagai admin yang role-nya telah diberikan operator database):

```json
{ "title": "Buku Uji", "author": "Penulis Uji" }
```

Peminjaman (username ditentukan oleh JWT, bukan body):

```json
{ "bookId": {{availableBookId}} }
```

Pengembalian menggunakan **ID transaksi**, bukan ID buku, pada path `/api/loans/{{loanId}}/return`.

## Pengujian negatif dan keamanan

- GET buku dengan API Key yang salah atau hilang dan tanpa JWT: `401`.
- Pinjam, riwayat, atau return tanpa JWT / JWT tidak valid / JWT kedaluwarsa: `401`.
- User biasa mencoba `POST /api/books`: `403`.
- Pengguna mencoba riwayat atau return transaksi milik pengguna lain: `403`.
- `bookId` tidak valid: `400`; buku tidak ada: `404`; buku sudah dipinjam: `409`.
- Melebihi 3 pinjaman aktif: `409`.
- Return kedua kali untuk transaksi yang sama: `409`.
- Matikan Book Service untuk memeriksa error upstream `502` atau timeout `504` dari Gateway. Jangan lakukan pada lingkungan yang dipakai pengguna lain.
- Uji status buku dengan request paralel hanya pada lingkungan lokal dan data uji; transisi status bersyarat seharusnya mengizinkan satu reservasi dan menolak request lain dengan `409`.

## Catatan pengujian

Response yang diharapkan di atas adalah skenario yang perlu diuji, bukan klaim bahwa semua skenario telah dijalankan pada MySQL aktif. Tes source-level yang tersedia tidak menggantikan pengujian end-to-end terhadap tiga proses backend dan database lokal.
