# Dokumentasi Penggunaan AI Coding Tool

## 1. AI Coding Tool yang Digunakan

AI assistant yang digunakan selama proses pengembangan dan penyusunan project adalah **ChatGPT**.

AI digunakan sebagai alat bantu untuk analisis requirement, perancangan perubahan, penulisan kode, pemeriksaan struktur, debugging, pembuatan dokumentasi, dan penyusunan skenario testing. Kode tidak dianggap benar hanya karena dihasilkan oleh AI; hasilnya diperiksa terhadap requirement dan struktur project.

## 2. Bagian yang Dibantu AI

AI membantu pada beberapa tahap berikut:

1. **Analisis Acceptance Criteria**
   - Menganalisis masalah pada aturan maksimal 3 peminjaman aktif.
   - Menjelaskan lokasi logika yang menentukan status tombol peminjaman.

2. **Perancangan microservice**
   - Memisahkan tanggung jawab Book Service dan Loan Service.
   - Menentukan kebutuhan komunikasi Loan Service -> Book Service melalui API.
   - Merancang API Gateway sebagai entry point client.

3. **Migrasi persistence**
   - Menganalisis struktur `books.json` dan `loans.json`.
   - Menyusun schema MySQL.
   - Menambahkan koneksi `mysql2`, konfigurasi `dotenv`, dan script migration.
   - Mempertahankan JSON sebagai sumber data migrasi dan tidak menghapus data lama.

4. **API Gateway**
   - Menambahkan Gateway port `4000` menggunakan Node.js native HTTP.
   - Menambahkan routing public `/api/books`, `/api/loans`, dan `/api/login`.
   - Menambahkan forwarding request/response dan error `502` untuk service internal yang tidak tersedia.

5. **API Key authentication**
   - Menambahkan validasi `X-API-Key` di Gateway.
   - Memindahkan API key ke environment variable.
   - Memastikan frontend tidak menyimpan API key rahasia.

6. **End-to-end loan flow**
   - Memastikan Loan Service meminta data buku melalui Book Service API.
   - Memastikan Loan Service menyimpan transaksi di Loan Database sendiri.
   - Memastikan perubahan status buku dilakukan melalui Book Service.
   - Menambahkan rollback jika update status buku gagal setelah loan dibuat.

7. **Postman testing**
   - Menyusun skenario testing untuk endpoint yang memang tersedia.
   - Membuat Postman Collection JSON yang menggunakan variable `baseUrl` dan `apiKey`.

8. **Dokumentasi**
   - Membantu memperbarui README, arsitektur, dokumentasi penggunaan AI, prompt, E2E flow, dan Postman testing berdasarkan implementasi akhir.

## 3. Bagian yang Diperiksa Manusia

Pemeriksaan manusia tetap diperlukan untuk:

- memastikan requirement tugas tidak berubah;
- memastikan pembagian tanggung jawab service sesuai tugas;
- memastikan tidak ada akses langsung Loan Service ke Book Database;
- memastikan frontend tidak menggunakan port `4001` atau `4002`;
- memastikan API Key tidak ditulis di source code atau frontend;
- memeriksa struktur database dan environment variable;
- memeriksa response/error yang diharapkan;
- menentukan apakah perubahan AI benar-benar diperlukan dan tidak menambah fitur di luar requirement.

## 4. Masalah/Kesalahan atau Ketidaksesuaian yang Ditemukan

### Dokumentasi lama tidak sesuai implementasi terbaru

Dokumentasi project sebelumnya masih menyebut:

- JSON sebagai persistence utama;
- frontend mengakses service internal secara langsung; dan
- AI Coding Tool yang digunakan adalah Claude.

Dokumentasi tersebut kemudian diperbarui agar sesuai dengan implementasi yang benar-benar digunakan pada tahap akhir project ini.

### API key pada frontend

Pada tahap implementasi API Gateway, ditemukan bahwa frontend sempat memiliki API key secara hardcoded. Hal ini tidak sesuai dengan requirement bahwa secret API key tidak diletakkan pada frontend public.

Perbaikannya adalah menghapus API key dari frontend. Authentication API Gateway kemudian diuji melalui Postman.

### Persistence

Implementasi awal project menggunakan file JSON. Requirement terbaru meminta database persistence, sehingga Book Service dan Loan Service kemudian menggunakan MySQL dengan database ownership terpisah.

## 5. Perbaikan yang Dilakukan

Perbaikan utama yang diterapkan:

- JSON persistence diganti menjadi MySQL sebagai persistence aktif.
- Migration script dibuat untuk memindahkan data JSON lama ke MySQL tanpa menghapus file JSON sumber.
- Book Service dan Loan Service tetap terpisah.
- Loan Service berkomunikasi dengan Book Service melalui HTTP API.
- API Gateway ditambahkan pada port `4000`.
- API Key authentication ditambahkan pada Gateway.
- API Key dipindahkan ke `.env` dan `.env` dimasukkan ke `.gitignore`.
- Frontend diarahkan hanya ke Gateway.
- API Key dihapus dari frontend public.
- Error handling ditambahkan untuk service internal dan request/database error.
- Rollback loan ditambahkan jika update status buku gagal.
- Postman Collection dan dokumentasi testing dibuat menggunakan endpoint existing.

## 6. Testing yang Dilakukan

Pemeriksaan yang dilakukan selama pengembangan meliputi:

- syntax check pada source Node.js utama;
- pemeriksaan route public dan route internal;
- pemeriksaan bahwa frontend hanya menggunakan `http://localhost:4000`;
- pemeriksaan bahwa Loan Service tidak mengimpor atau menggunakan koneksi Book Database;
- validasi struktur Postman Collection sebagai JSON;
- pengujian perilaku API Key pada Gateway untuk key benar, salah, dan tidak dikirim;
- pengujian routing/forwarding menggunakan service lokal sementara pada tahap verifikasi Gateway;
- review alur E2E peminjaman dan rollback berdasarkan kode.

Pengujian database MySQL penuh tidak dijalankan pada environment pengembangan ini ketika MySQL server/kredensial yang diperlukan tidak tersedia. Oleh karena itu dokumentasi tidak mengklaim hasil transaksi MySQL nyata dari environment tersebut.

## 7. Prinsip Penggunaan AI

AI digunakan sebagai alat bantu pengembangan, bukan sebagai pengganti pemeriksaan developer. Setiap perubahan dibandingkan dengan requirement dan diperiksa kembali sebelum dimasukkan ke versi project berikutnya.


## Perubahan database PostgreSQL ke MySQL

Pada tahap berikutnya, requirement berubah dari PostgreSQL menjadi MySQL. Dengan bantuan ChatGPT, implementasi koneksi, query, schema, migration, konfigurasi environment, dan dependency disesuaikan ke `mysql2`. Manusia tetap perlu menjalankan dan memeriksa migration serta alur API pada mesin yang memiliki MySQL aktif. Riwayat prompt PostgreSQL pada `prompts.md` dipertahankan sebagai catatan proses sebelumnya, bukan sebagai konfigurasi project saat ini.
