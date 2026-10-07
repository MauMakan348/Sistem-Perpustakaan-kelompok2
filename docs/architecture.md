# Architecture — Sistem Peminjaman Buku Perpustakaan

## 1. Diagram Arsitektur

```text
                         CLIENT
                  Web / Postman / Client
                            |
                     HTTP + X-API-Key
                            |
                            v
                   +------------------+
                   | API GATEWAY      |
                   | localhost:4000   |
                   +--------+---------+
                            |
                 +----------+----------+
                 |                     |
                 v                     v
        +----------------+    +----------------+
        | BOOK SERVICE   |    | LOAN SERVICE   |
        | :4001          |    | :4002          |
        +-------+--------+    +--------+-------+
                |                       |
                v                       v
        +---------------+       +---------------+
        | book_db       |       | loan_db       |
        | MySQL         |       | MySQL         |
        +---------------+       +---------------+
                ^                       |
                |                       |
                +---- HTTP API <-------+
                     Loan Service
                     -> Book Service
```

Client hanya menggunakan API Gateway `:4000`. Port `:4001` dan `:4002` digunakan oleh service internal.

## 2. Komponen

### Client

Client dapat berupa frontend web atau tool API seperti Postman. Client mengirim request ke Gateway, bukan langsung ke Book Service atau Loan Service.

Frontend yang ada pada project menggunakan:

```text
http://localhost:4000
```

### API Gateway — `:4000`

Gateway merupakan satu-satunya entry point API untuk client.

Tanggung jawabnya:

- membaca `X-API-Key`;
- menolak request dengan API Key tidak ada atau salah menggunakan HTTP `401`;
- menentukan service tujuan berdasarkan path;
- meneruskan HTTP method;
- meneruskan body;
- meneruskan header yang relevan;
- meneruskan response service ke client; dan
- mengembalikan `502` ketika service internal tidak tersedia.

Gateway tidak menjalankan aturan bisnis peminjaman atau pengelolaan data buku.

### Book Service — `:4001`

Book Service bertanggung jawab atas:

- daftar buku;
- detail buku;
- status `tersedia` atau `dipinjam`; dan
- Book MySQL (`book_db`).

Endpoint internal yang digunakan:

```text
GET   /books
GET   /books/:id
PATCH /books/:id/status
```

### Loan Service — `:4002`

Loan Service bertanggung jawab atas:

- login sederhana;
- transaksi peminjaman;
- maksimal 3 peminjaman aktif per mahasiswa;
- masa peminjaman 7 hari;
- Loan MySQL (`loan_db`); dan
- komunikasi dengan Book Service melalui HTTP API.

Endpoint internal:

```text
POST /login
GET  /loans/:username
POST /loans
```

## 3. Public Routing pada Gateway

| Public route | Internal target |
|---|---|
| `GET /api/books` | Book Service `GET /books` |
| `GET /api/books/:id` | Book Service `GET /books/:id` |
| `PATCH /api/books/:id/status` | Book Service `PATCH /books/:id/status` |
| `POST /api/login` | Loan Service `POST /login` |
| `GET /api/loans/:username` | Loan Service `GET /loans/:username` |
| `POST /api/loans` | Loan Service `POST /loans` |

## 4. Komunikasi Antar-Service

Loan Service berkomunikasi dengan Book Service menggunakan HTTP API Node.js native.

Contoh saat peminjaman:

```text
Loan Service
     |
     | GET /books/2
     v
Book Service
     |
     | query MySQL
     v
Book Database
```

Jika buku tersedia, Loan Service kemudian menyimpan transaksi pada database miliknya dan meminta Book Service mengubah status buku:

```text
Loan Service
     |
     | INSERT loan
     v
Loan Database

Loan Service
     |
     | PATCH /books/2/status
     v
Book Service
     |
     | UPDATE books
     v
Book Database
```

Loan Service tidak membuka koneksi MySQL milik Book Service.

## 5. Database Ownership

Setiap service memiliki database sendiri.

```text
Book Service
    |
    +--> book_db
          +--> books

Loan Service
    |
    +--> loan_db
          +--> loans
```

Ownership berarti service hanya mengelola data database miliknya.

Loan Service membutuhkan informasi buku melalui API Book Service, bukan dengan menjalankan query terhadap `books` secara langsung.

## 6. API Key Authentication

Gateway menggunakan environment variable:

```env
API_KEY=your_api_key_here
```

Client mengirim:

```text
X-API-Key: <API_KEY>
```

Validasi dilakukan sebelum request diteruskan ke service tujuan. Jika header tidak ada atau nilainya salah, Gateway mengembalikan `401 Unauthorized`.

API Key tidak ditanam di frontend public.

## 7. End-to-End Flow: Peminjaman Buku

```text
Client
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
  | SELECT buku
  v
Book MySQL (`book_db`)
  |
  | data + status
  v
Loan Service
  |
  | INSERT transaksi
  v
Loan MySQL (`loan_db`)
  |
  | PATCH /books/:id/status
  v
Book Service :4001
  |
  | UPDATE status
  v
Book MySQL (`book_db`)
  |
  v
Loan Service -> Gateway -> Client
```

Jika update status Book Service gagal setelah loan berhasil disimpan, Loan Service menjalankan rollback dengan menghapus loan yang baru dibuat.

## 8. Error Handling Arsitektur

- Gateway: `401` untuk API Key tidak valid/tidak ada.
- Gateway: `404` untuk route Gateway yang tidak dikenal.
- Gateway: `502` jika service internal tidak tersedia.
- Loan Service: `400` untuk body/data peminjaman tidak valid.
- Loan Service: `404` jika buku tidak ditemukan.
- Loan Service: `409` jika buku sedang dipinjam atau batas 3 loan aktif tercapai.
- Service: `500` untuk error database/request internal.
- Loan Service melakukan rollback loan jika update status buku gagal.
