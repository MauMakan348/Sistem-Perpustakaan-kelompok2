# Alur End-to-End: Peminjaman Buku

Dokumen ini menjelaskan alur sesuai implementasi saat ini. Client mengakses API Gateway. Loan Service tidak mengakses database Book Service secara langsung.

```text
Client / Postman
  | POST /api/loans + Authorization: Bearer <JWT> + { bookId }
  v
API Gateway :4000
  | POST /loans (HTTP)
  v
Loan Service :4002
  | GET /books/:id (HTTP)
  v
Book Service :4001 -> MySQL book_db
  |
  | PATCH /books/:id/status { status: "dipinjam" }
  v
Book Service :4001 -> conditional UPDATE books
  |
  | reservation berhasil
  v
Loan Service :4002 -> INSERT loans pada MySQL loan_db
  |
  | jika insert gagal, kompensasi status buku menjadi tersedia
  v
API Gateway -> Client
```

## 1. Client ke Gateway

```http
POST http://localhost:4000/api/loans
Authorization: Bearer <JWT_HASIL_LOGIN>
Content-Type: application/json
```

```json
{ "bookId": 2 }
```

Username diperoleh dari JWT. Body tidak perlu memuat username. API Key tidak menggantikan JWT untuk operasi peminjaman.

## 2. Validasi Loan Service

Loan Service memastikan token valid, `bookId` merupakan integer positif, pengguna belum mencapai batas 3 pinjaman aktif, dan buku dapat ditemukan melalui `GET /books/:id` pada Book Service.

## 3. Reservasi buku atomik

Loan Service meminta Book Service melakukan `PATCH /books/:id/status` dengan body `{ "status": "dipinjam" }`. Book Service hanya mengubah status jika status saat ini `tersedia`. Bila dua request bersamaan berebut buku yang sama, satu transisi berhasil dan request lain menerima `409`.

## 4. Simpan transaksi

Setelah reservasi berhasil, Loan Service menyimpan transaksi di `loan_db.loans` dengan `status='active'`, tanggal pinjam, dan tanggal jatuh tempo 7 hari kemudian. Response `201` berisi objek `loan`, termasuk ID transaksi yang digunakan kelak saat pengembalian.

Jika penyimpanan transaksi gagal, Loan Service mencoba kompensasi mengubah status buku kembali menjadi `tersedia`. Jika kompensasi juga gagal, log memberi peringatan untuk rekonsiliasi manual; ini bukan transaksi atomik lintas dua database.

## 5. Contoh response sukses

```json
{
  "message": "Buku berhasil dipinjam.",
  "loan": {
    "id": 1790211757128,
    "username": "mahasiswa01",
    "bookId": 2,
    "bookTitle": "Contoh Judul",
    "borrowDate": "2026-10-17T01:00:00.000Z",
    "dueDate": "2026-10-24T01:00:00.000Z",
    "status": "active"
  }
}
```

Nilai contoh di atas ilustratif; ID dan tanggal aktual dibuat saat request.

## 6. Pengembalian

Client memanggil `POST /api/loans/:id/return` dengan JWT pemilik transaksi. Loan Service mengunci baris transaksi, memeriksa pemilik/status, meminta Book Service mengubah status buku menjadi `tersedia`, lalu menyimpan `status='returned'` dan `returned_at`. Pengembalian kedua untuk transaksi yang sama menghasilkan `409`. Jika update transaksi gagal setelah status buku berubah, Loan Service mencoba kompensasi mengembalikan status buku ke `dipinjam`.

## 7. Error yang diharapkan

| Kondisi | Status | Catatan |
|---|---:|---|
| JWT tidak ada/tidak valid | 401 | Ditolak Gateway atau Loan Service |
| Body tidak valid / `bookId` tidak valid | 400 | Input harus JSON dengan ID positif |
| Buku tidak ditemukan | 404 | Tidak ada transaksi baru |
| Buku sudah tidak tersedia | 409 | Transisi status atomik ditolak |
| Batas 3 pinjaman aktif tercapai | 409 | Tidak membuat pinjaman tambahan |
| Book Service tidak tersedia/timeout | 502 | Loan Service tidak dapat menyelesaikan operasi |
| Gateway tidak dapat mencapai service | 502/504 | Error upstream yang disanitasi Gateway |
| Insert transaksi gagal setelah reservasi | 500 | Kompensasi status buku dicoba; periksa log bila gagal |

## Kepemilikan database

- `book_db.books` hanya dikelola Book Service.
- `loan_db.users` dan `loan_db.loans` hanya dikelola Loan Service.
- Komunikasi antar-service untuk informasi dan status buku dilakukan melalui HTTP API Book Service.

Skenario ini harus diuji dengan service dan MySQL aktif. Diagram dan contoh response bukan bukti bahwa pengujian runtime telah dijalankan.
