# Prompt yang Digunakan Selama Pengembangan

Dokumen ini menyimpan prompt pengembangan yang tercatat dalam riwayat kerja project. Prompt pada tahap awal dipertahankan sebagai catatan historis; bila menyebut teknologi yang berbeda dari konfigurasi akhir, hal itu ditandai sebagai tahap sebelumnya, bukan instruksi konfigurasi project saat ini.

## 1. Analisis Acceptance Criteria AC-02

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

## 2. Perencanaan pengembangan microservice

```text
Kondisi proyek saya: teknologi sebelumnya html, jumlah anggota 4+, pilihan teknologi node. Bantu saya merencanakan pengembangan proyek perpustakaan menjadi microservice sesuai tugas.
```

## 3. Migrasi JSON ke PostgreSQL — tahap historis

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

Prompt ini merupakan bagian riwayat perubahan sebelumnya. Database akhir yang digunakan project saat ini adalah MySQL, bukan PostgreSQL.

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

## 5. API Key pada Gateway

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

Autentikasi pengguna kemudian berkembang untuk memakai JWT pada route peminjaman/pengembalian dan role admin pada penambahan buku.

## 6. Alur peminjaman end-to-end

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

## 7. Skenario testing Postman

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

## 8. Migrasi PostgreSQL ke MySQL

```text
Saya ingin mengganti database project dari PostgreSQL menjadi MySQL. Jangan mengubah arsitektur microservice. Gunakan package mysql2 untuk Node.js. Book Service menggunakan database book_db dan Loan Service menggunakan database loan_db. Setiap service hanya mengakses database miliknya sendiri. Loan Service tidak boleh mengakses database Book Service secara langsung dan harus mengambil data buku melalui API Book Service. Gunakan environment variable, jangan hard-code password, buat .env.example, pastikan .env masuk .gitignore, sesuaikan migration dan query SQL, jangan mengubah endpoint, API Gateway, API Key, atau fitur yang sudah berjalan. Sebelum mengubah kode, cari seluruh penggunaan PostgreSQL/pg, identifikasi file, dependency, query yang tidak kompatibel, dan jelaskan rencana migrasi. Setelah perubahan, lakukan code review dan verifikasi koneksi, Gateway port 4000, komunikasi HTTP antar-service, GET books, POST loan, serta penyimpanan data MySQL. Laporkan semua perubahan dan keterbatasan pengujian.
```

## 9. Dokumentasi akhir project

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

## 10. Perbaikan hasil audit

```text
Perbaiki masalah yang sudah ditemukan pada audit sebelumnya, tanpa mengubah bagian yang tidak terkait. Setelah perbaikan:
1. Jalankan ulang tes yang gagal.
2. Jalankan tes regresi untuk fitur yang sebelumnya berhasil.
3. Tampilkan hanya file yang diubah atau ditambahkan.
4. Jelaskan setiap perbaikan.
5. Laporkan hasil tes yang benar-benar dijalankan.
6. Jangan mengklaim semua tes lulus jika masih ada yang gagal.
7. Jangan menyalin seluruh struktur project.
```

## Catatan

Daftar ini hanya mencakup prompt yang tercatat pada riwayat pengembangan yang tersedia. Tidak ditambahkan klaim tentang prompt lain yang tidak terdokumentasi. Untuk hasil audit dan batasan pengujian, lihat `docs/ai-usage.md`.

## 8. Refaktor startup satu perintah (prompt aktual dari tahap finalisasi)

```text
Tujuan utama: project dapat dijalankan dengan satu perintah `npm start` dari direktori root. API Gateway port 4000 menjadi entry point client, Book Service tetap pada port 4001, Loan Service pada port 4002, dan arsitektur microservices tidak boleh diubah menjadi monolith.

Pilih pendekatan yang stabil: API Gateway mengelola child process atau satu script/package menjalankan semua service. Pastikan port tidak bentrok, Gateway dimulai setelah service yang diperlukan siap, kegagalan startup jelas, log setiap service terlihat, tidak ada proses ganda, dan semua proses berhenti ketika aplikasi dihentikan. URL dan port internal dapat diatur melalui environment variables.

Pertahankan semua fitur yang ada, MySQL dengan ownership database terpisah, autentikasi, JWT, API Key, migrasi data non-destruktif, serta komunikasi Loan Service ke Book Service melalui HTTP API. Jangan menyimpan secret di source code atau frontend.

Setelah implementasi, uji startup, forwarding Gateway, pinjam/kembali, autentikasi, error ketika service mati, shutdown, dan persistensi. Laporkan setiap pemeriksaan sebagai PASS, FAIL, atau NOT TESTED; jangan mengklaim tes yang tidak dijalankan. Output harus berupa ZIP project lengkap tanpa node_modules, .git, cache, log, atau secret, beserta README dan file pendukung.
```


## 9. Prompt lengkap untuk refaktorisasi satu perintah dan paket final

Teks berikut adalah prompt lengkap yang diberikan pada tahap finalisasi.

````text
# PROMPT: REFAKTORISASI PROJECT SISTEM PERPUSTAKAAN MENJADI SATU ENTRY POINT DENGAN MICROservices

Bertindaklah sebagai Senior Backend Engineer yang memahami Node.js, Express.js, REST API, Microservices Architecture, MySQL, autentikasi, dan API Gateway.

Saya memiliki project **Sistem Perpustakaan** yang sudah berjalan dan ingin memperbaiki cara menjalankannya. Analisis seluruh file project yang tersedia sebelum melakukan perubahan.

## 1. Tujuan utama

Saya ingin project dapat dijalankan menggunakan **satu perintah dan satu service utama yang dijalankan secara manual**, yaitu API Gateway.

Perintah yang diinginkan:

```bash
npm start
```

Perintah tersebut dijalankan dari direktori root project.

Setelah dijalankan, pengguna harus bisa mengakses API melalui satu alamat utama:

```text
http://localhost:4000
```

API Gateway harus dapat memanggil Book Service dan Loan Service secara otomatis melalui komunikasi HTTP API internal.

Saya tidak ingin membuka tiga terminal dan menjalankan `npm start` secara terpisah untuk setiap service.

**Penting:** Jangan mengubah project menjadi monolith. Pertahankan arsitektur microservices. Istilah satu service yang dimaksud dalam permintaan ini adalah satu entry point yang dijalankan secara manual oleh pengguna, bukan menggabungkan seluruh kode menjadi satu aplikasi.

## 2. Arsitektur yang diharapkan

Pertahankan pemisahan tanggung jawab berikut:

- **API Gateway — port 4000:** satu-satunya entry point yang diakses oleh frontend dan Postman.
- **Book Service — port 4001:** mengelola data buku dan penambahan buku.
- **Loan Service — port 4002:** mengelola autentikasi pengguna jika memang sudah menjadi tanggung jawabnya, peminjaman, riwayat transaksi, dan pengembalian buku sesuai arsitektur project yang ada.
- **MySQL:** digunakan sebagai database persisten sesuai konfigurasi database masing-masing service.

Alur komunikasi yang diharapkan:

```text
Frontend / Postman
        |
        v
API Gateway :4000
        |
        +---- HTTP API ----> Book Service :4001
        |
        +---- HTTP API ----> Loan Service :4002
                                  |
                                  +---- HTTP API ----> Book Service
```

Sesuaikan diagram tersebut jika hasil pemeriksaan project menunjukkan pembagian tanggung jawab yang berbeda. Jangan memindahkan kepemilikan data antar-service tanpa alasan yang jelas.

## 3. Mekanisme menjalankan project

Implementasikan mekanisme agar saya cukup menjalankan:

```bash
npm start
```

dari direktori root project.

Pilih pendekatan paling tepat setelah memeriksa kode yang tersedia.

Prioritaskan salah satu pendekatan berikut:

**Pendekatan A — API Gateway sebagai orchestrator proses**

API Gateway menyalakan Book Service dan Loan Service sebagai child process, kemudian menjalankan server Gateway. Pastikan proses dapat dihentikan dengan benar, log setiap service terlihat, dan seluruh child process ikut berhenti ketika aplikasi dihentikan.

**Pendekatan B — Satu perintah untuk seluruh service**

Jika pendekatan A berisiko menimbulkan circular dependency, konflik proses, atau masalah pengelolaan proses, gunakan package seperti `concurrently` atau pendekatan setara dari skrip root untuk menyalakan ketiga service dengan satu perintah.

Jika menggunakan pendekatan B, jelaskan secara transparan bahwa ketiga proses backend tetap berjalan terpisah walaupun dimulai dengan satu perintah.

Pilih satu pendekatan yang paling stabil. Jangan menerapkan kedua pendekatan sekaligus.

Pastikan:
- Tidak ada port yang digunakan oleh dua server berbeda.
- Gateway tidak menerima trafik sebelum service yang dibutuhkan siap, atau memberikan respons error yang jelas selama service belum siap.
- Kegagalan startup suatu service dilaporkan secara jelas.
- Tidak ada proses Node.js ganda ketika `npm start` dijalankan berulang kali.
- Perintah penghentian berjalan dengan benar.
- Penggunaan port dan URL internal bisa diatur melalui environment variables jika diperlukan.

## 4. Komunikasi antar-service

API Gateway wajib meneruskan request ke service yang tepat menggunakan HTTP API.

Pertahankan atau perbaiki endpoint yang sudah ada. Jangan membuat endpoint duplikat tanpa alasan.

Pastikan Gateway meneruskan:
- HTTP method.
- Path dan query parameters.
- Request body.
- Header yang diperlukan.
- Status code dan response body dari service tujuan.
- Informasi autentikasi yang memang diperlukan dan aman untuk diteruskan.

Jika Loan Service perlu memeriksa atau mengubah ketersediaan buku, lakukan komunikasi melalui API Book Service, bukan dengan mengakses database internal Book Service secara langsung.

Hindari ketergantungan langsung pada file kode internal service lain.

## 5. Pertahankan fitur project

Jangan menghilangkan atau merusak fitur yang sudah ada. Periksa dan pertahankan seluruh fitur yang relevan, termasuk:

- Melihat daftar dan detail buku.
- Menambahkan buku.
- Login dan registrasi jika sudah tersedia.
- Peminjaman buku jika sudah tersedia.
- Riwayat peminjaman.
- Pengembalian buku.
- Validasi input dan penanganan error.
- Autentikasi dan otorisasi.
- Penyimpanan data ke MySQL.
- Endpoint lain yang memang sudah ada di project.

Jika suatu fitur belum diimplementasikan, laporkan sebagai fitur yang belum tersedia. Jangan mengklaim fitur sudah berfungsi tanpa implementasi dan pengujian.

## 6. Keamanan

Periksa dan pertahankan mekanisme keamanan yang sudah ada.

- Jangan menaruh password database, JWT secret, atau API key rahasia langsung di source code.
- Gunakan environment variables dan sediakan `.env.example` tanpa nilai rahasia asli.
- Jangan menghapus autentikasi hanya untuk mempermudah komunikasi antar-service.
- Bedakan API key untuk komunikasi antar-service dari token autentikasi pengguna.
- Jangan menanamkan API key rahasia ke frontend.
- Pastikan endpoint yang membutuhkan autentikasi tetap terlindungi.
- Pastikan hanya pengguna yang memiliki izin yang dapat menambahkan buku atau mengembalikan transaksi sesuai aturan aplikasi.
- Jangan membuat akun administrator dengan password default yang tidak aman.
- Jangan menghapus data database atau melakukan migrasi destruktif tanpa persetujuan.

## 7. Database

Gunakan MySQL sesuai kebutuhan project.

Periksa konfigurasi koneksi, nama database, tabel, relasi, dan query yang sudah ada sebelum mengubah apa pun.

Pastikan:
- Service dapat terhubung ke database yang benar.
- Data tetap tersimpan setelah server dimatikan dan dijalankan kembali.
- Tidak ada ketergantungan pada file JSON atau `localStorage` sebagai database utama.
- Database Book Service dan Loan Service tidak saling mengakses secara langsung jika arsitektur project memisahkan kepemilikan data.
- Tersedia instruksi pembuatan database, tabel, dan migrasi jika diperlukan.
- Tidak ada kredensial database asli yang dimasukkan ke dokumentasi publik.

Jangan mengganti database menjadi PostgreSQL. Jika project saat ini belum menggunakan MySQL, jelaskan perubahan yang dibutuhkan dan implementasikan hanya jika struktur serta dependensi project memungkinkan.

## 8. Pemeriksaan dan pengujian

Setelah implementasi, lakukan pengujian yang bisa dijalankan di lingkungan project.

Minimal periksa:

1. `npm start` dari root project.
2. API Gateway berjalan di port 4000.
3. Book Service dapat diakses melalui Gateway.
4. Loan Service dapat diakses melalui Gateway.
5. Gateway dapat meneruskan request ke masing-masing service.
6. Peminjaman dapat memeriksa ketersediaan buku melalui API yang sesuai.
7. Pengembalian dapat memperbarui status transaksi dan ketersediaan buku dengan benar.
8. Endpoint autentikasi dan otorisasi tetap bekerja.
9. Request yang tidak valid menghasilkan status code yang sesuai.
10. Jika suatu backend service mati, Gateway memberikan error yang informatif, bukan crash tanpa penjelasan.
11. Server dapat dihentikan dan dimulai ulang tanpa meninggalkan child process.
12. Data tetap tersimpan di MySQL setelah server dimulai ulang.

Gunakan Postman atau `curl` untuk menguji API Gateway pada port 4000. Untuk pengujian normal, semua request klien harus melewati Gateway, bukan langsung menuju port 4001 atau 4002.

Laporkan hasil sebagai PASS, FAIL, atau NOT TESTED. Jangan mengaku pengujian berhasil jika belum benar-benar dijalankan.

## 9. Aturan perubahan kode

- Baca dan pahami project sebelum mengedit.
- Modifikasi file yang sudah ada jika masih sesuai.
- Tambahkan file baru hanya jika benar-benar diperlukan.
- Jangan membuat folder project duplikat.
- Jangan membuat salinan file seperti `server-new.js`, `server-fixed.js`, atau `package-final.json` tanpa alasan yang diperlukan.
- Jangan menghapus fitur atau file yang masih digunakan.
- Hindari perubahan yang tidak berkaitan dengan tujuan.
- Pertahankan dependensi dan struktur project yang masih relevan.
- Jika ada keputusan arsitektur yang tidak dapat dipastikan dari kode, jelaskan asumsi yang digunakan.
- Jika diperlukan perubahan besar atau destruktif, minta persetujuan sebelum melakukannya.

## 10. Output akhir: tampilkan seluruh file project

**Saya ingin output berupa file lengkap dari project hasil perbaikan, bukan hanya daftar perubahan atau potongan kode.**

Setelah implementasi dan pemeriksaan selesai:

1. Tampilkan atau sediakan **seluruh file project final yang diperlukan untuk menjalankan aplikasi**.
2. Sertakan semua file yang dipertahankan maupun yang ditambahkan atau diubah, termasuk file konfigurasi, source code, package files, SQL/migration, dokumentasi, dan file pendukung yang diperlukan.
3. Jangan hanya memberikan file yang berubah.
4. Jangan menampilkan `node_modules`, direktori `.git`, file cache, log, atau rahasia dalam paket output.
5. Jangan menghilangkan file yang diperlukan agar project bisa dijalankan.
6. Pastikan `package.json` dan lockfile sesuai dengan dependensi yang digunakan.
7. Sertakan `.env.example`, tetapi jangan sertakan `.env` asli atau kredensial rahasia.
8. Jika tersedia kemampuan membuat file, buat satu file ZIP berisi keseluruhan project final dengan nama:

   `Sistem-Perpustakaan-Final.zip`

9. Pastikan ZIP dapat diekstrak dan struktur foldernya benar. Jangan membuat ZIP yang berisi duplikasi direktori project.
10. Sertakan juga README yang menjelaskan instalasi, konfigurasi MySQL, pengaturan environment variables, cara menjalankan project dengan satu perintah, daftar endpoint, dan pengujian Postman.

Jika tidak dapat membuat ZIP, berikan setiap file lengkap yang diperlukan, bukan sekadar contoh atau potongan kode.

## 11. Format laporan akhir

Setelah selesai, berikan laporan dengan urutan:

1. Ringkasan masalah awal.
2. Pendekatan yang dipilih untuk menjalankan project.
3. Penjelasan bagaimana Gateway memanggil service lain.
4. Daftar fitur yang berhasil dipertahankan.
5. Daftar perubahan arsitektur yang dilakukan.
6. Hasil pengujian PASS / FAIL / NOT TESTED.
7. Cara instalasi dan menjalankan project dari awal.
8. URL Gateway dan cara pengujian Postman.
9. File ZIP project final beserta file pendukung yang diperlukan.
10. Kendala atau pekerjaan yang masih belum selesai.

Mulai dengan memeriksa seluruh project. Setelah memahami arsitektur dan dependensinya, lakukan perubahan yang diperlukan, uji hasilnya, lalu hasilkan paket project final yang lengkap.
````


## Prompt penting — Prompt 7: API testing dan bukti UTS

**Konteks:** gunakan `docs/API-CONTRACT.md` dan source project yang ada; jangan membuat hasil tes atau screenshot palsu.  
**Tujuan:** menyiapkan Postman Collection/environment, skenario login, buku, pinjam, pengembalian, otorisasi, dan catatan hasil.  
**Hasil AI:** `api-test/collection.json`, `api-test/environment.json`, `api-test/README.md`, `api-test/RESULTS.md`, dan `api-test/evidence/README.md`.  
**Review manusia:** Putra Aji Pratama, Muhammad Lutfi Rifani, Shandy Aulia, Sri Maharani — impor collection, isi environment rahasia secara lokal, jalankan request, cocokkan respons dan DB, simpan screenshot asli.  
**Hasil pengujian:** collection dan environment lolos pemeriksaan struktur JSON serta syntax script yang tersedia; request HTTP terhadap backend/MySQL belum dijalankan. Semua status skenario awal ditulis `BELUM DIUJI`.

## Prompt penting — Prompt 8: Code review dan dokumentasi penggunaan AI

**Konteks:** audit source yang sudah ada dan dokumentasi UTS; pertahankan struktur project, jangan mengarang nama reviewer atau klaim pengujian.  
**Tujuan:** mengidentifikasi temuan nyata, dampak, keputusan/perbaikan, status, bukti verifikasi, dan merekam penggunaan AI.  
**Hasil AI:** `docs/CODE_REVIEW_LOG.md` ditambahkan; `docs/ai-usage.md` dan `docs/prompts.md` diperbarui. Temuan mencakup route PATCH tanpa ID, perbedaan arsitektur runtime dengan direktori service, konsistensi lintas database, rate limiting yang belum terlihat, dan assertion tes dokumentasi yang gagal.  
**Review manusia:** Putra Aji Pratama, Muhammad Lutfi Rifani, Shandy Aulia, Sri Maharani  
**Hasil pengujian:** satu run source-level menghasilkan 13 lulus dan 1 gagal karena assertion pola dokumentasi. Pengujian HTTP/MySQL end-to-end dan race condition runtime belum dilakukan.

## Prompt penting — Prompt 9: Finalisasi project UTS

**Konteks:** audit akhir menggunakan source project, `docs/PRD.md`, `docs/API-CONTRACT.md`, `docs/CODE_REVIEW_LOG.md`, dan hasil pemeriksaan yang benar-benar tersedia. Tidak boleh mengklaim pengujian runtime yang belum dilakukan.
**Tujuan:** memperjelas README dari instalasi hingga menjalankan backend, menjelaskan MySQL dan `.env.example`, Postman, struktur folder, keamanan data, dan membuat checklist kesiapan pengumpulan dengan status.
**Hasil AI:** `README.md` diperbarui dan `docs/FINAL-UTS-AUDIT.md` ditambahkan. Paket akhir dibuat tanpa `.env`, `node_modules`, dan file log.
**Review manusia:** Putra Aji Pratama, Muhammad Lutfi Rifani, Shandy Aulia, Sri Maharani
**Hasil pemeriksaan aktual saat penyusunan:** `npm run check` berhasil; `npm test` menghasilkan 18 lulus dan 2 gagal pada environment audit (assertion format dokumentasi dan tes yang gagal memuat `bcryptjs`). Tidak ada request HTTP/MySQL end-to-end dijalankan; semua skenario Postman masih `BELUM DIUJI` dan belum ada screenshot hasil aktual.
