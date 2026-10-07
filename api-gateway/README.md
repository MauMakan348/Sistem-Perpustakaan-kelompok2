# API Gateway

API Gateway adalah satu-satunya entry point API untuk client.

- Port: `4000`
- Book Service internal: `4001`
- Loan Service internal: `4002`
- API authentication: header `X-API-Key`

## Konfigurasi

Salin `.env.example` menjadi `.env`, lalu isi `API_KEY` dengan nilai lokal yang hanya diketahui oleh client yang dipercaya.

## Postman

Request:

```http
GET http://localhost:4000/api/books
```

Header:

```text
X-API-Key: <API_KEY>
```

### API Key benar

Gateway meneruskan request ke Book Service. Jika Book Service berjalan, response sukses diteruskan apa adanya, misalnya:

```json
[
  {
    "id": 1,
    "title": "Cara Membedakan Tangan Kanan dan Tangan Kiri",
    "author": "Andi Pratama",
    "status": "dipinjam"
  }
]
```

### API Key tidak ada atau salah

Gateway tidak meneruskan request dan mengembalikan:

```http
HTTP/1.1 401 Unauthorized
```

```json
{
  "error": "API Key tidak valid atau tidak ditemukan."
}
```

## Catatan frontend

Frontend browser tidak menyimpan API key rahasia. Browser hanya menggunakan API Gateway pada port `4000`. Untuk pengujian API yang membutuhkan API key, gunakan Postman atau client yang dapat menyimpan credential secara aman.

## Contoh alur end-to-end peminjaman

Gunakan Postman:

```http
POST http://localhost:4000/api/loans
```

Header:

```text
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

Gateway memeriksa API Key lalu meneruskan request ke Loan Service. Loan Service meminta data buku ke Book Service melalui HTTP API. Jika buku tersedia, Loan Service menyimpan transaksi pada Loan Database, lalu meminta Book Service mengubah status buku menjadi `dipinjam`. Response akhir dikembalikan melalui Gateway.

Dokumentasi tahap demi tahap dan contoh response tersedia di `docs/e2e-loan-flow.md`.
