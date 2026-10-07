# End-to-End Flow: Peminjaman Buku

Alur ini adalah contoh fitur lengkap yang melibatkan lebih dari satu microservice.

```text
Client / Postman
      |
      | POST /api/loans + X-API-Key
      v
API Gateway :4000
      |
      | POST /loans
      v
Loan Service :4002
      |
      | GET /books/:id
      v
Book Service :4001
      |
      | SELECT ... FROM books
      v
Book MySQL (`book_db`)
      |
      | data buku + status
      v
Book Service
      |
      | response buku
      v
Loan Service
      |
      | INSERT INTO loans
      v
Loan MySQL (`loan_db`)
      |
      | PATCH /books/:id/status
      v
Book Service :4001
      |
      | UPDATE books SET status = 'dipinjam'
      v
Book MySQL (`book_db`)
      |
      | response berhasil
      v
Loan Service
      |
      v
API Gateway
      |
      v
Client / Postman
```

## 1. Client -> API Gateway

Request:

```http
POST http://localhost:4000/api/loans
X-API-Key: <API_KEY>
Content-Type: application/json
```

Body:

```json
{
  "username": "kokop",
  "bookId": 2
}
```

Gateway memeriksa `X-API-Key`. Jika valid, request diteruskan ke Loan Service. Gateway tidak menjalankan aturan peminjaman.

## 2. API Gateway -> Loan Service

Request internal:

```http
POST http://localhost:4002/loans
Content-Type: application/json
```

Body tetap:

```json
{
  "username": "kokop",
  "bookId": 2
}
```

## 3. Loan Service validasi request

Loan Service memeriksa:

- `username` tersedia.
- `bookId` tersedia dan berupa integer.
- jumlah peminjaman aktif mahasiswa belum mencapai 3.

Jika data tidak lengkap:

```http
400 Bad Request
```

```json
{
  "error": "username dan bookId wajib diisi."
}
```

## 4. Loan Service -> Book Service

Loan Service tidak membaca database Book Service. Loan Service meminta data buku melalui HTTP API:

```http
GET http://localhost:4001/books/2
```

Book Service kemudian mengambil data dari database miliknya:

```sql
SELECT id, title, author, status
FROM books
WHERE id = 2;
```

Contoh response:

```json
{
  "id": 2,
  "title": "Bumbu Kacang Asli dari Kebumen",
  "author": "Mas Narji",
  "status": "tersedia"
}
```

## 5. Loan Service membuat transaksi

Karena buku tersedia, Loan Service membuat transaksi pada **Loan Database**:

```sql
INSERT INTO loans
  (id, username, book_id, book_title, borrow_date, due_date)
VALUES (...);
```

Masa peminjaman tetap 7 hari sesuai business rule yang sudah ada.

## 6. Loan Service -> Book Service untuk mengubah status

Setelah transaksi loan dibuat, Loan Service meminta Book Service mengubah status buku:

```http
PATCH http://localhost:4001/books/2/status
Content-Type: application/json
```

Body:

```json
{
  "status": "dipinjam"
}
```

Book Service menjalankan update pada Book Database:

```sql
UPDATE books
SET status = 'dipinjam'
WHERE id = 2;
```

## 7. Response kembali ke Client

Book Service mengembalikan hasil update ke Loan Service. Loan Service kemudian mengembalikan:

```http
201 Created
```

```json
{
  "message": "Buku berhasil dipinjam.",
  "loan": {
    "id": 1790211757128,
    "username": "kokop",
    "bookId": 2,
    "bookTitle": "Bumbu Kacang Asli dari Kebumen",
    "borrowDate": "2026-10-01T06:30:00.000Z",
    "dueDate": "2026-10-08T06:30:00.000Z"
  }
}
```

Gateway meneruskan status dan body response tersebut kepada Client.

## Error handling

| Kondisi | Response | Penanganan |
|---|---:|---|
| API Key tidak ada/salah | 401 | Ditolak Gateway |
| Body JSON tidak valid | 400 | Ditolak Loan Service |
| `username`/`bookId` tidak lengkap | 400 | Ditolak Loan Service |
| `bookId` tidak valid | 400 | Ditolak Loan Service |
| Buku tidak ditemukan | 404 | Book Service -> Loan Service -> Client |
| Buku sedang dipinjam | 409 | Loan Service menolak peminjaman |
| Batas 3 loan aktif | 409 | Loan Service menolak peminjaman |
| Book Service tidak tersedia saat GET | 502 | Loan Service mengembalikan error |
| Update Book Service gagal | 502 | Loan Service melakukan rollback transaksi loan |
| Database Loan Service error | 500 | Loan Service mengembalikan error |
| Database Book Service error | 502 saat dipanggil Loan Service | Book Service error diteruskan sebagai kegagalan service |
| Loan Service tidak tersedia | 502 | Gateway mengembalikan error |

## Kepemilikan database

Book Service hanya mengakses **Book Database**.

Loan Service hanya mengakses **Loan Database**.

Loan Service tidak menggunakan koneksi, query, tabel, atau file database milik Book Service. Komunikasi antarlayanan dilakukan melalui HTTP API Book Service.
