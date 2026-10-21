# Dokumentasi Penggunaan AI Coding Tool

## Ruang lingkup bantuan

ChatGPT digunakan untuk membantu analisis requirement UTS, review source, penyesuaian implementasi, penyusunan tes source-level, Postman collection, serta sinkronisasi dokumentasi. Output AI diperlakukan sebagai usulan yang harus diverifikasi, bukan bukti bahwa aplikasi berjalan.

## Kondisi arsitektur yang diaudit pada versi ini

Runtime yang aktif dalam paket ini adalah satu backend (`backend/server.js`) pada port `4000`, satu database MySQL (`DB_NAME`) dengan tabel `users`, `books`, dan `loans`, serta frontend statis yang disajikan backend. Folder `api-gateway/`, `book-service/`, `loan-service/`, dan `scripts/start-all.js` dipertahankan sebagai legacy/reference dan tidak dijalankan oleh `npm start`. Dokumentasi lama yang menggambarkan Gateway dan dua service terpisah adalah riwayat tahapan pengembangan, bukan arsitektur runtime paket ini.

## Area yang dibantu AI

- Penyesuaian autentikasi username/password dengan bcrypt dan JWT.
- Validasi input, aturan tiga pinjaman aktif, deadline tujuh hari, status buku, ownership transaksi, dan rollback.
- Konsolidasi database MySQL dan migrator non-destruktif.
- Pemeriksaan route aktif dan penyelarasan API Contract, Postman, README, audit, dan changelog.

## Batas verifikasi

Tes otomatis yang dijalankan pada Prompt 4 adalah tes source/kontrak. Hasil `npm test` 24/24, `npm run check`, dan `node --check frontend/script.js` lulus. Namun dependency runtime `mysql2`, `bcryptjs`, `jsonwebtoken`, dan `dotenv` tidak tersedia di environment audit, `.env` tidak ada, dan klien MySQL tidak tersedia. Oleh karena itu, `npm start`, migrasi MySQL, request HTTP, Postman, transaksi database aktual, dan uji konkurensi berstatus `NOT TESTED`.

Tidak ada screenshot Postman atau respons runtime yang dibuat-buat. `api-test/RESULTS.md` memisahkan ekspektasi dari hasil aktual.

## Review manusia

Anggota kelompok tetap harus menjalankan instalasi dan pengujian pada mesin mereka, memeriksa query database, mengaudit secret sebelum commit, serta mengisi nama/tanggal reviewer hanya setelah review manusia sungguh dilakukan. Jangan mengisi identitas atau keputusan review atas nama AI.
