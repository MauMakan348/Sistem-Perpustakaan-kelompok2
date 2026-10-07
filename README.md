# Sistem Peminjaman Buku Perpustakaan — Microservice

## 1. Nama Project

**Sistem Peminjaman Buku Perpustakaan — Microservice**

Project ini merupakan pengembangan dari project Sistem Perpustakaan sebelumnya menjadi aplikasi berbasis microservice.

## 2. Deskripsi

Sistem digunakan untuk melihat daftar buku, melihat status ketersediaan buku, login mahasiswa, melihat peminjaman aktif, dan melakukan peminjaman buku.

Versi saat ini menggunakan dua microservice utama, yaitu **Book Service** dan **Loan Service**, serta **API Gateway** sebagai satu-satunya entry point untuk client. Data utama masing-masing service disimpan pada database MySQL yang terpisah.

## 3. Tujuan Project

Tujuan pengembangan adalah menerapkan konsep microservice pada project Sistem Perpustakaan yang sudah ada, dengan:

- pemisahan tanggung jawab antar-service;
- API Gateway sebagai entry point client;
- komunikasi antar-service melalui HTTP API;
- database terpisah berdasarkan ownership service;
- API Key authentication pada Gateway; dan
- pengujian API menggunakan Postman.

## 4. Architecture Sebelum

Versi sebelumnya merupakan aplikasi web sederhana dengan frontend HTML/CSS/JavaScript dan persistence menggunakan file/localStorage pada tahap awal project. Pada tahap microservice awal, Book Service dan Loan Service sudah dipisahkan, tetapi client masih dapat berkomunikasi langsung dengan service internal.

Secara sederhana:

```text
Client / Frontend
      |             \
      v              v
Book Service      Loan Service
  :4001              :4002
      |                |
  books data       loans data
```

## 5. Architecture Sesudah

Arsitektur yang sudah diimplementasikan:

```text
                         Client
                  Web / Postman / Client
                            |
                     X-API-Key + HTTP
                            |
                            v
                   API Gateway :4000
                     /             \
                    /               \
                   v                 v
          Book Service :4001   Loan Service :4002
                   |                 |
                   v                 |
          Book MySQL (`book_db`)            |
                                     v
                              Loan MySQL (`loan_db`)

Loan Service <---- HTTP API ----> Book Service
```

Client menggunakan Gateway `:4000`. Port `:4001` dan `:4002` merupakan port service internal.

## 6. Daftar Microservice

| Komponen | Port | Tanggung jawab |
|---|---:|---|
| API Gateway | 4000 | Entry point client, API Key authentication, routing dan forwarding |
| Book Service | 4001 | Data buku dan status ketersediaan buku |
| Loan Service | 4002 | Login, transaksi peminjaman, batas 3 buku aktif dan jatuh tempo 7 hari |

## 7. Fungsi Setiap Service

### API Gateway

- Menerima request client.
- Memeriksa header `X-API-Key`.
- Meneruskan request ke service tujuan.
- Meneruskan method, path, body, header yang relevan, status response, dan body response.
- Mengembalikan `502` jika service internal tidak tersedia.
- Tidak menjalankan business logic buku atau peminjaman.

### Book Service

- Mengambil daftar buku.
- Mengambil detail buku.
- Mengubah status buku menjadi `tersedia` atau `dipinjam`.
- Mengakses Book MySQL (`book_db`).

### Loan Service

- Login sederhana berdasarkan username.
- Mengambil daftar peminjaman aktif mahasiswa.
- Memvalidasi transaksi peminjaman.
- Membatasi maksimal 3 peminjaman aktif.
- Menetapkan masa pinjam 7 hari.
- Memanggil Book Service melalui HTTP API untuk mengecek dan mengubah status buku.
- Mengakses Loan MySQL (`loan_db`).

## 8. API Gateway

Gateway berjalan pada:

```text
http://localhost:4000
```

Endpoint publik yang tersedia:

| Method | Endpoint | Tujuan |
|---|---|---|
| GET | `/api/books` | Daftar buku |
| GET | `/api/books/:id` | Detail buku |
| PATCH | `/api/books/:id/status` | Mengubah status buku |
| POST | `/api/login` | Login sederhana |
| GET | `/api/loans/:username` | Peminjaman aktif |
| POST | `/api/loans` | Membuat peminjaman |

Gateway meneruskan route ke endpoint internal yang sesuai. Client tidak perlu memanggil `:4001` atau `:4002` secara langsung.

## 9. Database

Terdapat dua database MySQL dengan ownership terpisah:

```text
Book Service  -> book_db -> books
Loan Service  -> loan_db -> loans
```

Loan Service **tidak mengakses Book Database secara langsung**. Informasi buku diperoleh melalui API Book Service.

File terkait database:

```text
book-service/db.js
book-service/schema.sql
book-service/migrate.js
loan-service/db.js
loan-service/schema.sql
loan-service/migrate.js
```

File `books.json` dan `loans.json` tetap berada di project sebagai data sumber migrasi lama. Script migration melakukan upsert ke MySQL dan tidak menghapus file JSON.

## 10. API Key

Gateway menggunakan header:

```text
X-API-Key: <API_KEY>
```

API Key disimpan pada environment variable `API_KEY`, bukan di source code.

Contoh konfigurasi:

```env
API_KEY=your_api_key_here
```

Jika key tidak ada atau salah, Gateway mengembalikan:

```http
401 Unauthorized
```

API Key tidak disimpan di frontend public. Pengujian API dengan key dilakukan melalui Postman.

## 11. Technology Stack

| Bagian | Teknologi |
|---|---|
| Backend | Node.js native HTTP |
| Gateway | Node.js native HTTP |
| Database | MySQL |
| Database driver | `mysql2` |
| Environment configuration | `dotenv` |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| API testing | Postman |
| AI Coding Assistant | ChatGPT |

Project sengaja tidak menggunakan Express atau framework backend tambahan.

## 12. Struktur Folder

```text
perpustakaan2/
├── api-gateway/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── .gitignore
│   └── README.md
├── book-service/
│   ├── server.js
│   ├── db.js
│   ├── migrate.js
│   ├── schema.sql
│   ├── books.json
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
├── loan-service/
│   ├── server.js
│   ├── db.js
│   ├── migrate.js
│   ├── schema.sql
│   ├── loans.json
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── docs/
│   ├── architecture.md
│   ├── ai-usage.md
│   ├── prompts.md
│   ├── e2e-loan-flow.md
│   └── postman-testing.md
├── postman/
│   └── Sistem-Perpustakaan.postman_collection.json
├── .gitignore
└── README.md
```

## 13. Cara Install

Pastikan sudah tersedia:

- Node.js
- MySQL
- npm

Install dependency setiap service:

```bash
cd book-service
npm install
```

```bash
cd ../loan-service
npm install
```

```bash
cd ../api-gateway
npm install
```

Dependency utama:

- `mysql2` untuk koneksi MySQL pada Book Service dan Loan Service.
- `dotenv` untuk membaca environment variable.

## 14. Cara Konfigurasi `.env`

Jangan menggunakan file `.env` yang dibagikan ke repository. Salin masing-masing `.env.example` menjadi `.env`.

### Book Service

```env
PORT=4001
DB_HOST=localhost
DB_PORT=3306
DB_NAME=book_db
DB_USER=root
DB_PASSWORD=your_mysql_password
```

### Loan Service

```env
PORT=4002
BOOK_SERVICE_HOST=localhost
BOOK_SERVICE_PORT=4001
DB_HOST=localhost
DB_PORT=3306
DB_NAME=loan_db
DB_USER=root
DB_PASSWORD=your_mysql_password
```

### API Gateway

```env
PORT=4000
BOOK_SERVICE_HOST=localhost
BOOK_SERVICE_PORT=4001
LOAN_SERVICE_HOST=localhost
LOAN_SERVICE_PORT=4002
API_KEY=your_api_key_here
```

File `.env` sudah dimasukkan ke `.gitignore`.

## 15. Cara Menjalankan Database

Buat dua database MySQL:

```sql
CREATE DATABASE book_db CHARACTER SET utf8mb4;
CREATE DATABASE loan_db CHARACTER SET utf8mb4;
```

Kemudian jalankan migration dari masing-masing service:

```bash
cd book-service
npm run migrate
```

```bash
cd loan-service
npm run migrate
```

Migration membaca data lama dari `books.json` dan `loans.json`, membuat tabel yang diperlukan, lalu melakukan upsert ke MySQL.

## 16. Cara Menjalankan Setiap Service

### Book Service

```bash
cd book-service
npm start
```

Port:

```text
http://localhost:4001
```

### Loan Service

Pastikan Book Service dan MySQL tersedia terlebih dahulu.

```bash
cd loan-service
npm start
```

Port:

```text
http://localhost:4002
```

## 17. Cara Menjalankan API Gateway

Pastikan Book Service dan Loan Service sudah berjalan.

```bash
cd api-gateway
npm start
```

Gateway:

```text
http://localhost:4000
```

## 18. Cara Menjalankan Frontend

Frontend berada di folder `frontend` dan menggunakan Gateway:

```text
http://localhost:4000
```

`frontend/script.js` tidak memanggil port `4001` atau `4002` secara langsung.

Frontend dapat dibuka menggunakan web server lokal sederhana atau Live Server di VS Code.

## 19. Cara Menggunakan API melalui Postman

Import collection:

```text
postman/Sistem-Perpustakaan.postman_collection.json
```

Atur variable:

```text
baseUrl = http://localhost:4000
apiKey = API_KEY dari api-gateway/.env
```

Untuk request yang membutuhkan authentication, gunakan:

```text
X-API-Key: {{apiKey}}
```

Collection berisi request untuk:

- `GET /api/books`
- `GET /api/books/:id`
- `POST /api/loans`
- `GET /api/loans/:username`

Skenario error juga didokumentasikan di `docs/postman-testing.md`.

## 20. Contoh API Request

### Melihat daftar buku

```http
GET http://localhost:4000/api/books
X-API-Key: <API_KEY>
```

### Meminjam buku

```http
POST http://localhost:4000/api/loans
X-API-Key: <API_KEY>
Content-Type: application/json
```

```json
{
  "username": "kokop",
  "bookId": 2
}
```

## 21. Contoh API Response

Contoh daftar buku:

```json
[
  {
    "id": 2,
    "title": "Bumbu Kacang Asli dari Kebumen",
    "author": "Mas Narji",
    "status": "tersedia"
  }
]
```

Contoh peminjaman berhasil:

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

Nilai ID dan tanggal pada response nyata dibuat saat request berlangsung.

## 22. Alur Peminjaman Buku

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
      v
Book MySQL (`book_db`)
      |
      | data + status buku
      v
Loan Service
      |
      | INSERT loan
      v
Loan MySQL (`loan_db`)
      |
      | PATCH /books/:id/status
      v
Book Service -> Book MySQL (`book_db`)
      |
      v
Loan Service -> API Gateway -> Client
```

Jika update status buku gagal setelah loan tersimpan, Loan Service menghapus kembali transaksi loan tersebut sebagai rollback.

## 23. Cara Testing

Testing API dilakukan menggunakan Postman Collection:

```text
postman/Sistem-Perpustakaan.postman_collection.json
```

Skenario yang didokumentasikan meliputi:

- API Key benar;
- API Key salah;
- API Key tidak dikirim;
- buku ditemukan;
- buku tidak ditemukan;
- buku tersedia;
- buku sedang dipinjam;
- data peminjaman tidak lengkap;
- Book Service tidak tersedia;
- Loan Service tidak tersedia; dan
- database error jika kondisi database dapat disimulasikan.

Detail expected status dan response terdapat pada `docs/postman-testing.md`.

Selain itu, syntax source utama telah diperiksa selama pengembangan. Pengujian MySQL penuh harus dilakukan pada environment yang memiliki MySQL aktif dan kredensial yang sesuai.

## 24. Kontribusi Anggota Kelompok

Anggota kelompok yang tercantum pada project:

| Anggota | Kontribusi |
|---|---|
| Shandy Aulia | Pengembangan project kelompok |
| Sri Maharani | Pengembangan project kelompok |
| Putra Aji Pratama | Pengembangan project kelompok |
| Muhammad Lutfi Rivani | Pengembangan project kelompok |
| Lia Saripah | Pengembangan project kelompok |

Pembagian tugas individual yang lebih rinci tidak tercatat di source project yang digunakan untuk dokumentasi ini, sehingga dokumentasi tidak mengklaim pembagian tugas spesifik yang tidak dapat diverifikasi.

---

## Dokumentasi Tambahan

- [Architecture](docs/architecture.md)
- [AI Usage](docs/ai-usage.md)
- [Prompts](docs/prompts.md)
- [E2E Loan Flow](docs/e2e-loan-flow.md)
- [Postman Testing](docs/postman-testing.md)
