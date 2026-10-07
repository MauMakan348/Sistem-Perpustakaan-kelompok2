# Prompt yang Digunakan Selama Pengembangan

Dokumen ini mencatat prompt yang benar-benar digunakan dalam percakapan pengembangan project. Prompt ditulis kembali secara ringkas ketika diperlukan agar mudah dibaca, tanpa mengklaim langkah yang tidak dilakukan.

## 1. Analisis dan Implementasi AC-02

```text
The implementation does not fully satisfy this Acceptance Criteria:

"If a student already has 3 active borrowed books, the borrow button
must be disabled for ALL books, even books that are still available."

Current behavior:
- Clicking the borrow button when the student already has 3 active
  loans DOES correctly show a rejection alert.
- However, the button itself still renders as enabled/clickable
  for books with status "Tersedia", even when the student has already reached the limit.

Analyze first: identify the function deciding disabled/enabled state,
why it ignores active loan count, and what condition/location should be added.
Do not change code yet.
```

Tahap ini digunakan untuk menganalisis bug Acceptance Criteria sebelum perubahan kode dilakukan.

## 2. Perencanaan Microservice

```text
Kondisi proyek saya: teknologi sebelumnya html, jumlah anggota 4+, pilihan teknologi node.
Bantu saya merencanakan pengembangan proyek perpustakaan menjadi microservice sesuai tugas.
```

Requirement tugas kemudian dijabarkan menjadi Book Service, Loan Service, komunikasi API, API Gateway, database, dan alur end-to-end.

## 3. Migrasi JSON ke PostgreSQL

```text
Sekarang implementasikan perubahan persistence dari JSON menjadi PostgreSQL.

Conditions:
- book-service currently uses books.json
- loan-service currently uses loans.json
- target: Book Service PostgreSQL for books, Loan Service PostgreSQL for loans.
- Don’t delete old data before migration.
- Inspect JSON structures first.
- Make schema matching existing data.
- No cross-service DB access.
- Loan Service gets book info via Book Service API.
- DB config via environment variables.
- No hardcoded DB password.
- Create .env.example.
- Add .env to .gitignore.
- Create SQL schema or easy migration script.
- Preserve relevant endpoints.
- Add DB connection error handling.
- Before coding: explain schema, files changed, dependencies.
- Then implement.
- No extra features.
```

Prompt ini menghasilkan perubahan persistence ke PostgreSQL dan script migration.

## 4. Implementasi API Gateway

```text
Sekarang tambahkan API Gateway ke project.

Tujuan:
API Gateway menjadi satu-satunya entry point yang digunakan oleh client.

Target:
Client
   ↓
API Gateway :4000
   ├── /api/books → Book Service
   └── /api/loans → Loan Service

Ketentuan:
- API Gateway port 4000.
- Book Service dan Loan Service tetap terpisah.
- Client tidak boleh langsung memanggil port internal.
- Gateway meneruskan method, path, body, relevant headers, dan response.
- Error handling service internal.
- Tidak memasukkan business logic ke Gateway.
- Gunakan teknologi sederhana dan Node.js native.
- Update frontend agar hanya menggunakan Gateway.

Sebelum implementasi jelaskan file dan alur routing, kemudian implementasikan.
```

## 5. API Key Authentication

```text
Sekarang tambahkan API Key authentication pada API Gateway.

Gunakan header:
X-API-Key: <API_KEY>

Ketentuan:
- API Key diperiksa di API Gateway.
- API Key tidak ditulis langsung di source code.
- Simpan API Key dalam environment variable.
- Tambahkan API_KEY ke .env.example.
- Tambahkan .env ke .gitignore.
- Jika API Key tidak ada atau salah, return 401.
- Jika benar, request diteruskan.
- Jangan menaruh API Key rahasia di frontend public.
- Dokumentasikan penggunaan API Key di Postman.
- Jangan membuat authentication user yang kompleks.
```

## 6. End-to-End Peminjaman

```text
Sekarang pastikan terdapat minimal satu alur fitur end-to-end yang melibatkan lebih dari satu microservice.

Gunakan alur: Peminjaman Buku

Client
 ↓
API Gateway
 ↓
Loan Service
 ↓
Book Service
 ↓
Book Database

Kemudian:
Loan Service
 ↓
Loan Database

Pastikan Loan Service tidak pernah mengakses database Book Service secara langsung.
Tambahkan error handling untuk buku tidak ditemukan, buku sedang dipinjam,
data request tidak lengkap, database error, Book Service tidak tersedia,
dan Loan Service error.
Jangan membuat fitur tambahan yang tidak diperlukan.
Setelah implementasi, buat contoh request dan response untuk setiap tahap penting.
```

## 7. Skenario Testing Postman

```text
Sekarang buat skenario testing API menggunakan Postman.

API Gateway berjalan pada:
http://localhost:4000

Gunakan API Key melalui:
X-API-Key

Buat request:
1. GET /api/books
2. GET /api/books/:id
3. POST /api/loans
4. GET /api/loans/:username

Untuk setiap request berikan Method, URL, Headers, Body jika diperlukan,
Expected status code, Expected response, dan kemungkinan error.

Tambahkan testing untuk API Key benar/salah/tidak dikirim, buku ditemukan/tidak,
buku tersedia/dipinjam, data peminjaman tidak lengkap, Book Service mati,
dan database error jika dapat disimulasikan.

Jika dapat membuat Postman Collection JSON, buat collection yang dapat langsung di-import.
Jangan membuat API baru hanya untuk testing.
Gunakan endpoint yang benar-benar ada di project.
```

## 8. Pembaruan Dokumentasi Akhir

```text
Sekarang perbarui dokumentasi project berdasarkan implementasi yang benar-benar sudah selesai.

Jangan mendokumentasikan fitur yang tidak ada.

Perbarui:
README.md
docs/architecture.md
docs/ai-usage.md
docs/prompts.md

README harus menjelaskan nama project, deskripsi, tujuan, architecture sebelum/sesudah,
microservice, fungsi service, Gateway, database, API Key, stack, struktur folder,
install, .env, database, menjalankan service/Gateway/frontend, Postman, request/response,
alur peminjaman, testing, dan kontribusi anggota.

docs/architecture.md harus berisi diagram, komponen, komunikasi antar-service,
database ownership, dan API Gateway.

docs/ai-usage.md harus berisi AI Coding Tool, bagian yang dibantu AI,
bagian yang diperiksa manusia, masalah/kesalahan AI, perbaikan, dan testing.

docs/prompts.md harus berisi prompt yang benar-benar digunakan.

Jangan membuat klaim bahwa AI melakukan sesuatu yang sebenarnya tidak dilakukan.
```

## Catatan Akurasi

Dokumentasi ini membedakan antara:

- requirement yang diminta;
- kode yang benar-benar sudah dibuat;
- testing yang benar-benar dilakukan; dan
- hal yang belum dapat diuji karena environment membutuhkan PostgreSQL aktif/kredensial yang sesuai.

Tidak ada klaim bahwa fitur atau pengujian yang belum dilakukan sudah berhasil.


## Prompt: Migrasi PostgreSQL ke MySQL

> Saya ingin mengganti database project dari PostgreSQL menjadi MySQL. Jangan mengubah arsitektur microservice. Gunakan package mysql2 untuk Node.js. Book Service menggunakan database book_db dan Loan Service menggunakan database loan_db. Setiap service hanya mengakses database miliknya sendiri. Loan Service tidak boleh mengakses database Book Service secara langsung dan harus mengambil data buku melalui API Book Service. Gunakan environment variable, jangan hard-code password, buat .env.example, pastikan .env masuk .gitignore, sesuaikan migration dan query SQL, jangan mengubah endpoint, API Gateway, API Key, atau fitur yang sudah berjalan. Sebelum mengubah kode, cari seluruh penggunaan PostgreSQL/pg, identifikasi file, dependency, query yang tidak kompatibel, dan jelaskan rencana migrasi. Setelah perubahan, lakukan code review dan verifikasi koneksi, Gateway port 4000, komunikasi HTTP antar-service, GET books, POST loan, serta penyimpanan data MySQL. Laporkan semua perubahan dan keterbatasan pengujian.
