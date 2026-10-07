# Skenario Testing API - Postman

## 1. Persiapan

API Gateway:

```text
http://localhost:4000
```

Header authentication:

```text
X-API-Key: <API_KEY>
```

Isi `API_KEY` di Postman dengan nilai yang sama seperti `API_KEY` pada `api-gateway/.env`.

Import collection:

```text
postman/Sistem-Perpustakaan.postman_collection.json
```

Collection menggunakan variabel:

- `baseUrl` = `http://localhost:4000`
- `apiKey` = `your_api_key_here`
- `username` = `kokop`
- `availableBookId` = `2`
- `borrowedBookId` = `1`
- `notFoundBookId` = `999999`

> ID 1 dan 2 mengikuti data awal project. Jika data MySQL sudah berubah, sesuaikan `availableBookId` dan `borrowedBookId` di Postman.

## 2. Request 1 - GET /api/books

**Method:** `GET`

**URL:**

```text
http://localhost:4000/api/books
```

**Headers:**

```text
X-API-Key: <API_KEY>
```

**Body:** tidak ada.

**Expected status:** `200 OK`

**Expected response:** array buku, misalnya:

```json
[
  {
    "id": 1,
    "title": "Cara Membedakan Tangan Kanan dan Tangan Kiri",
    "author": "Andi Pratama",
    "status": "dipinjam"
  },
  {
    "id": 2,
    "title": "Bumbu Kacang Asli dari Kebumen",
    "author": "Mas Narji",
    "status": "tersedia"
  }
]
```

**Kemungkinan error:**

- `401` API Key tidak ada/salah.
- `500` jika Book Service mengalami database/request error.
- `502` jika Book Service tidak tersedia.

### API Key salah

Header:

```text
X-API-Key: wrong-api-key
```

Expected:

```http
401 Unauthorized
```

```json
{
  "error": "API Key tidak valid atau tidak ditemukan."
}
```

### API Key tidak dikirim

Hapus header `X-API-Key`.

Expected:

```http
401 Unauthorized
```

```json
{
  "error": "API Key tidak valid atau tidak ditemukan."
}
```

## 3. Request 2 - GET /api/books/:id

**Method:** `GET`

**URL contoh:**

```text
http://localhost:4000/api/books/2
```

**Headers:**

```text
X-API-Key: <API_KEY>
```

**Body:** tidak ada.

**Expected status jika buku ditemukan:** `200 OK`

```json
{
  "id": 2,
  "title": "Bumbu Kacang Asli dari Kebumen",
  "author": "Mas Narji",
  "status": "tersedia"
}
```

### Buku tidak ditemukan

Gunakan:

```text
GET http://localhost:4000/api/books/999999
```

Expected:

```http
404 Not Found
```

```json
{
  "error": "Buku tidak ditemukan."
}
```

**Kemungkinan error:** `400` jika ID bukan integer, `401` jika API Key salah/tidak ada, `500` database/request error, atau `502` jika Book Service mati.

## 4. Request 3 - POST /api/loans

**Method:** `POST`

**URL:**

```text
http://localhost:4000/api/loans
```

**Headers:**

```text
X-API-Key: <API_KEY>
Content-Type: application/json
```

**Body:**

```json
{
  "username": "kokop",
  "bookId": 2
}
```

### Buku tersedia

Jika buku 2 berstatus `tersedia` dan mahasiswa belum mencapai batas 3 loan aktif:

**Expected:** `201 Created`

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

Nilai `id`, `borrowDate`, dan `dueDate` akan berbeda saat testing nyata.

### Data peminjaman tidak lengkap

Body:

```json
{
  "username": "kokop"
}
```

Expected:

```http
400 Bad Request
```

```json
{
  "error": "username dan bookId wajib diisi."
}
```

### Buku sedang dipinjam

Gunakan ID buku yang statusnya `dipinjam`, misalnya buku 1 pada data awal:

```json
{
  "username": "kokop",
  "bookId": 1
}
```

Expected:

```http
409 Conflict
```

```json
{
  "error": "Peminjaman ditolak. Buku sedang dipinjam mahasiswa lain."
}
```

### Buku tidak ditemukan

```json
{
  "username": "kokop",
  "bookId": 999999
}
```

Expected:

```http
404 Not Found
```

```json
{
  "error": "Buku tidak ditemukan."
}
```

### API Key salah/tidak ada

Expected:

```http
401 Unauthorized
```

Gateway menolak request sebelum Loan Service menerima request.

### Book Service mati

Hentikan Book Service `:4001`, tetapi biarkan Gateway dan Loan Service hidup. Kirim POST peminjaman dengan API Key benar.

Expected dari Loan Service melalui Gateway:

```http
502 Bad Gateway
```

```json
{
  "error": "Book Service tidak dapat dihubungi."
}
```

## 5. Request 4 - GET /api/loans/:username

**Method:** `GET`

**URL:**

```text
http://localhost:4000/api/loans/kokop
```

**Headers:**

```text
X-API-Key: <API_KEY>
```

**Body:** tidak ada.

**Expected status:** `200 OK`

**Expected response:** array peminjaman aktif.

Contoh:

```json
[
  {
    "id": 1790211757127,
    "username": "kokop",
    "bookId": 1,
    "bookTitle": "Cara Membedakan Tangan Kanan dan Tangan Kiri",
    "borrowDate": "2026-09-24T01:02:37.126Z",
    "dueDate": "2026-10-01T01:02:37.126Z"
  }
]
```

Jika tidak ada loan aktif, expected response tetap `200` dengan array kosong:

```json
[]
```

**Kemungkinan error:** `401` API Key salah/tidak ada, `500` Loan Database/request error, atau `502` jika Loan Service tidak tersedia.

## 6. Simulasi Database Error

Tidak perlu membuat endpoint baru untuk simulasi.

### Book Database error

Cara sederhana:

1. Pastikan Gateway dan Book Service berjalan.
2. Buat kondisi MySQL Book Service tidak tersedia atau konfigurasi koneksi database salah.
3. Kirim:

```text
GET http://localhost:4000/api/books
```

Jika Book Service tetap hidup tetapi query database gagal, expected:

```http
500 Internal Server Error
```

```json
{
  "error": "Terjadi kesalahan pada Book Service."
}
```

Jika Book Service mati total karena gagal koneksi saat startup, Gateway akan mengembalikan:

```http
502 Bad Gateway
```

### Loan Database error

Dengan Loan Service masih berjalan tetapi koneksi MySQL gagal pada saat request, kirim:

```text
GET http://localhost:4000/api/loans/kokop
```

Expected:

```http
500 Internal Server Error
```

```json
{
  "error": "Terjadi kesalahan pada Loan Service."
}
```

Jika Loan Service mati total, Gateway mengembalikan `502 Bad Gateway`.

## 7. Ringkasan Skenario

| Skenario | Request | Expected |
|---|---|---:|
| API Key benar | GET `/api/books` | 200 |
| API Key salah | GET `/api/books` | 401 |
| API Key tidak dikirim | GET `/api/books` | 401 |
| Buku ditemukan | GET `/api/books/2` | 200 |
| Buku tidak ditemukan | GET `/api/books/999999` | 404 |
| Buku tersedia | POST `/api/loans` dengan bookId tersedia | 201 |
| Buku sedang dipinjam | POST `/api/loans` dengan bookId dipinjam | 409 |
| Data loan tidak lengkap | POST `/api/loans` tanpa bookId | 400 |
| Book Service mati | GET `/api/books` | 502 |
| Loan Service mati | GET `/api/loans/kokop` | 502 |
| Book DB error | GET `/api/books` | 500* |
| Loan DB error | GET `/api/loans/kokop` | 500* |

`*` Jika service masih hidup dan error terjadi saat query. Jika service tidak dapat berjalan sama sekali karena database gagal saat startup, Gateway akan mengembalikan `502`.

## 8. Catatan Urutan Testing

Untuk menjaga data tidak berubah tanpa sengaja:

1. Jalankan GET Books.
2. Jalankan GET Book by ID.
3. Jalankan POST Loan buku tersedia hanya jika memang ingin membuat transaksi peminjaman.
4. Jalankan GET Loans untuk memeriksa transaksi.
5. Jalankan kasus error API Key kapan saja.
6. Kasus service/database mati dilakukan terpisah dari testing normal.

Semua request di atas menggunakan endpoint existing project melalui API Gateway. Tidak ada endpoint baru yang dibuat khusus untuk testing.
