# File Changelog — Prompt 2: Backend Tunggal dan Konsolidasi Database

Tanggal: 19 Oktober 2026.

| Path file | Status | Alasan perubahan | Ringkasan perubahan | Dampak fitur | Pengujian terkait |
|---|---|---|---|---|---|
| `backend/server.js` | Diubah | Menghapus dua pool database dari runtime dan membuat perubahan buku/transaksi atomik. | Satu pool memakai `DB_NAME`; peminjaman/pengembalian menggunakan transaksi koneksi yang sama; route `PATCH /api/books` tanpa ID dihapus. | Auth, katalog, tambah buku, peminjaman, riwayat, dan pengembalian tetap di backend utama; konsistensi DB membaik pada source. | `npm run check`; `npm test`; runtime DB belum diuji. |
| `backend/migrate.js` | Dibuat | Menyiapkan satu schema dan memindahkan data lama tanpa menghapus sumber. | Membuat database/tabel `users`, `books`, `loans`; membaca database legacy; menyalin dengan `INSERT IGNORE`; seed JSON sebagai fallback. | Memungkinkan konsolidasi data lama ke database tunggal. Konflik data perlu direkonsiliasi. | `node --check backend/migrate.js`; tes source migration; migrasi MySQL belum diuji. |
| `.env.example` | Diubah | Konfigurasi runtime harus mengarah ke satu database. | Menambahkan `DB_NAME` dan variabel `LEGACY_*` yang hanya dipakai migration; menghapus variabel runtime dua database lama. | Startup dan migration menggunakan konfigurasi yang jelas. | Tes source environment; `.env` lokal belum dijalankan. |
| `package.json` | Diubah | Menetapkan startup dan migration resmi. | `start` tetap `node backend/server.js`; `migrate` menjadi `node backend/migrate.js`; `test` hanya menjalankan tes source backend aktif; `check` mencakup migrator. | Satu perintah startup dan migrasi terpusat. | `npm run check` PASS; `npm test` PASS 14/14. |
| `package-lock.json` | Diubah | Menyamakan metadata paket dengan `package.json`. | Mengubah nama paket root; daftar dependensi tidak sengaja diubah. | Tidak mengubah API runtime. | JSON parse PASS; `npm ci` belum selesai karena timeout. |
| `frontend/index.html` | Diubah | Menghapus asumsi URL API Gateway dari frontend. | Meta config menjadi `api-base-url` kosong (same-origin); judul tidak lagi menyebut microservice. | Frontend diarahkan ke backend yang menyajikan halaman itu sendiri. | `node --check frontend/script.js`; browser belum diuji. |
| `frontend/script.js` | Diubah | Menggunakan API same-origin dan nama variabel sesuai arsitektur. | `API_GATEWAY` diganti `API_BASE_URL`; komentar diperbarui. | Semua request frontend tetap memakai path API yang ada. | Sintaks JS PASS; request browser belum diuji. |
| `backend/test/source-audit.test.js` | Diubah | Menegaskan satu database dan route PATCH yang benar. | Assertion disesuaikan ke `DB_NAME`, satu pool, dan route status dengan ID. | Menangkap regresi source arsitektur. | PASS sebagai bagian dari 14/14. |
| `backend/test/database-auth-audit.test.js` | Diubah | Tes migrasi harus mengacu pada migrator aktif, bukan migrator service lama. | Pemeriksaan non-destruktif dan schema dialihkan ke `backend/migrate.js`. | Tes lebih relevan dengan runtime baru. | PASS sebagai bagian dari 14/14. |
| `backend/test/loan-flow-audit.test.js` | Diubah | Assertion harus mengikuti transaksi satu database dan dokumentasi terkini. | Memeriksa update buku di dalam transaksi serta teks kontrak aktual. | Melindungi aturan peminjaman/pengembalian pada level source. | PASS sebagai bagian dari 14/14. |
| `README.md` | Diubah | Instruksi setup lama menyebut dua database sebagai runtime. | Diagram, `.env`, migration, verifikasi DB, dan panduan test diperbarui. | Memudahkan setup arsitektur tunggal. | Review teks; langkah runtime belum dijalankan. |
| `docs/architecture.md` | Diubah | Menggambarkan arsitektur aktual setelah konsolidasi. | Diagram satu backend/satu DB; status folder legacy dan variabel environment dijelaskan. | Menghindari klaim tiga service runtime. | Review source/dokumentasi. |
| `docs/FINAL-UTS-AUDIT.md` | Diubah | Memperbarui audit sesuai hasil Prompt 2. | Status fitur, temuan, rencana migrasi, daftar file legacy, dan hasil tes aktual dicatat. | Transparansi kesiapan UTS. | Berdasarkan perintah yang benar-benar dijalankan. |
| `docs/FILE-CHANGELOG.md` | Dibuat | Mencatat seluruh perubahan Prompt 2. | Path, status, alasan, dampak fitur, dan tes terkait. | Jejak perubahan yang dapat direview kelompok. | Pemeriksaan daftar perubahan. |
| `docs/API-CONTRACT.md` | Diubah | Menyesuaikan konfigurasi DB dan status route PATCH. | Base config, DB tunggal, route `PATCH /api/books` tanpa ID ditandai tidak didukung. | Kontrak lebih konsisten dengan handler. | Assertion kontrak PASS; runtime belum diuji. |
| `docs/database-auth-audit.md` | Diubah | Memperbarui struktur database dan prosedur migrasi. | Dokumentasi satu DB, migrator baru, autentikasi dan batas verifikasi. | Panduan setup dan review database konsisten. | Review source/dokumentasi. |
| `docs/e2e-loan-flow.md` | Diubah | Memperbarui alur transaksi lintas tabel dalam satu database. | Dokumentasi transaksi MySQL tunggal untuk pinjam/kembali. | Memperjelas perilaku atomik yang diharapkan. | Source-level tests PASS; runtime belum diuji. |
| `docs/loan-feature-implementation.md` | Diubah | Menghapus klaim kompensasi lintas dua DB sebagai desain aktif. | Menjelaskan satu pool, transaksi bersama, dan service lama nonaktif. | Dokumentasi implementasi sesuai source. | Review source/dokumentasi. |
| `docs/postman-testing.md` | Diubah | Setup Postman harus menyiapkan DB baru. | Mengarahkan ke `npm run migrate` dan `DB_NAME`. | Pengujian manual mengarah ke backend baru. | Postman belum dijalankan. |
| `api-test/README.md` | Diubah | Instruksi tes harus memakai database tunggal. | Setup migrasi dan environment diperbarui. | Memudahkan tes API di komputer kelompok. | JSON collection/environment valid; request belum dijalankan. |
| `api-test/RESULTS.md` | Diubah | Query verifikasi harus menunjuk tabel target konsolidasi. | Query contoh diarahkan ke `perpustakaan_db`; semua skenario tetap `BELUM DIUJI`. | Mengurangi risiko memeriksa database lama yang salah. | JSON/data statis dicek; Postman belum dijalankan. |
| `docs/PRD.md` | Diubah | PRD menyebut arsitektur lama tanpa penjelasan status. | Ditambahkan catatan bahwa deskripsi dua DB/service bersifat historis dan runtime telah dikonsolidasikan. | Mempertahankan konteks requirement lama sambil menghindari kontradiksi. | Review dokumen. |
| `docs/CODE_REVIEW_LOG.md` | Diubah | Catatan review lama perlu ditindaklanjuti. | Ditambahkan status perbaikan route, satu pool, migration, dan keterbatasan verifikasi. | Jejak review tetap mempertahankan temuan historis dan keputusan terbaru. | Source tests PASS; runtime belum diuji. |

## File yang sengaja tidak dihapus

`api-gateway/`, `book-service/`, `loan-service/`, `scripts/start-all.js`, file schema/migrasi lama, `books.json`, `loans.json`, serta `postman/` tetap dipertahankan. File-file tersebut tidak menjadi entry point runtime dari `npm start`; seed JSON masih menjadi fallback untuk instalasi baru. Tidak ada file yang dipindahkan atau dihapus pada Prompt 2.

## Batas verifikasi

`npm run check` lulus; `npm test` lulus 14/14 tes source-level; sintaks frontend dan parse JSON lulus. `npm ci` tidak selesai karena transport timeout, perintah klien MySQL tidak tersedia, dan MySQL/Postman/browser belum dijalankan. Karena itu, changelog ini tidak menyatakan migrasi data atau integrasi runtime berhasil.

# File Changelog — Prompt 3: Perbaikan Fitur, Database, dan API

Tanggal: 19 Oktober 2026.

| Path file | Status | Alasan perubahan | Ringkasan perubahan | Dampak fitur | Pengujian terkait |
|---|---|---|---|---|---|
| `backend/server.js` | Diubah | ID transaksi dibuat dengan timestamp/random sehingga tetap berpotensi tabrakan. | Insert pinjaman tidak lagi menentukan ID secara manual; `insertId` dari MySQL dipakai sebagai ID transaksi. Mekanisme transaksi, lock pengguna/buku, validasi kepemilikan, status, dan rollback tetap dipertahankan. | ID lebih aman untuk request bersamaan; peminjaman/pengembalian tetap atomik pada satu database. | `node --check backend/server.js` PASS; source-contract tests PASS; runtime MySQL NOT TESTED. |
| `backend/migrate.js` | Diubah | Tabel `loans` yang sudah ada tidak otomatis berubah ketika memakai `CREATE TABLE IF NOT EXISTS`. | Kolom `loans.id` pada schema baru memakai `AUTO_INCREMENT`; migrator juga menjalankan `ALTER TABLE loans MODIFY id BIGINT NOT NULL AUTO_INCREMENT` untuk schema target yang sudah ada. | Backend dapat menggunakan ID yang dialokasikan database setelah migrasi. | `node --check backend/migrate.js` PASS; tes source migration PASS; migrasi aktual NOT TESTED. |
| `loan-service/schema.sql` | Diubah | Schema historis harus konsisten dengan cara ID transaksi baru dibuat. | `loans.id` ditandai `AUTO_INCREMENT`; file tetap legacy dan bukan schema runtime utama. | Mengurangi ketidaksesuaian jika schema legacy dipakai untuk pemulihan. | Pemeriksaan source-contract PASS; tidak dieksekusi terhadap database. |
| `backend/test/functional-contract.test.js` | Dibuat | Perlu cakupan eksplisit untuk seluruh aturan wajib pada source aktif. | Menambah 10 tes kontrak source untuk login, katalog, identitas token, batas aktif, stok, tenggat, ID transaksi, ownership, return berulang, rollback, dan pelepasan koneksi. | Menangkap regresi aturan bisnis di source. Tes ini bukan pengganti integrasi HTTP/MySQL. | PASS sebagai bagian dari `npm test` 24/24. |
| `backend/test/loan-flow-audit.test.js` | Diubah | Assertion insert harus sesuai dengan ID yang dibuat MySQL. | Memperbarui pola SQL insert pinjaman tanpa kolom `id`. | Tes tidak lagi mengharapkan ID buatan aplikasi. | PASS sebagai bagian dari `npm test` 24/24. |
| `package.json` | Diubah | Tes kontrak baru harus ikut berjalan pada perintah tes standar. | `npm test` menjalankan semua `backend/test/*.test.js`. | Satu perintah tes mencakup audit source dan aturan fungsional. | `npm test` PASS 24/24. |
| `docs/FILE-CHANGELOG.md` | Diubah | Mencatat seluruh perubahan Prompt 3. | Menambahkan bagian Prompt 3 dan status pengujian aktual. | Jejak perubahan proyek tetap dapat diaudit. | Pemeriksaan dokumen. |
| `docs/FINAL-UTS-AUDIT.md` | Diubah | Status implementasi perlu dibedakan dari validasi runtime. | Menambahkan temuan Prompt 3, file yang berubah, hasil PASS/FAIL/NOT TESTED, serta batas bahwa tes source bukan tes integrasi. | Menghindari klaim berlebihan tentang database atau endpoint yang belum dijalankan. | Dokumen diselaraskan dengan hasil aktual sesi ini. |

Tidak ada file yang dipindahkan atau dihapus pada Prompt 3. Tes baru merupakan pemeriksaan kontrak source; ia tidak membuktikan bahwa HTTP, MySQL, transaksi, dan skenario konkurensi benar-benar berhasil di runtime.


# File Changelog — Prompt 4: Sinkronisasi Dokumentasi, Postman, dan Final Audit

Tanggal: 20 Oktober 2026. Berikut hanya file yang berubah pada tahap Prompt 4. File yang berubah pada tahap sebelumnya tetap tercatat di bagian sebelumnya. Tidak ada file dipindahkan atau dihapus pada Prompt 4.

| File | Status perubahan | Alasan | Ringkasan perubahan | Verifikasi |
|---|---|---|---|---|
| `README.md` | Diubah | Instruksi harus bisa diikuti anggota kelompok dari source aktual. | Menjelaskan teknologi, setup MySQL/env, migrasi, satu perintah startup, frontend/base URL, endpoint, Postman, dan batas tes. | Review source/docs; belum diuji setup dari nol. |
| `docs/API-CONTRACT.md` | Diubah | Kontrak harus cocok dengan route aktif dan menyebut header/status secara ringkas. | Ditambah tabel endpoint, auth/header, parameter, status HTTP, dan catatan tes runtime. | Source review; tidak ada HTTP runtime. |
| `api-test/collection.json` | Diubah | Collection lama perlu konsisten dengan backend utama dan skenario bisnis. | Dibuat collection Postman v2.1 dengan register/login, katalog, pinjam, limit, unavailable, riwayat, return, status buku, dan kasus gagal. | JSON parse/schema file; request NOT TESTED. |
| `api-test/environment.json` | Diubah | Variabel token, API key, kredensial, ID data uji harus konsisten tanpa secret asli. | Template lokal dengan baseUrl, token, username/password kosong, API key kosong, serta ID data uji. | JSON parse; tidak ada secret terisi. |
| `api-test/README.md` | Diubah | Menjelaskan urutan dan prasyarat skenario collection. | Petunjuk import, pengisian variabel, setup DB, prasyarat limit 3 dan buku tidak tersedia. | Review dokumen; Postman belum dijalankan. |
| `api-test/RESULTS.md` | Diubah | Memisahkan hasil aktual dari ekspektasi skenario. | Mencatat 24/24 source tests, syntax checks, serta seluruh request Postman sebagai NOT TESTED. | Diselaraskan dengan perintah aktual. |
| `postman/Sistem-Perpustakaan.postman_collection.json` | Diubah | Menghindari salinan collection lama yang berbeda dari `api-test`. | Disinkronkan dengan collection aktif. | JSON parse; request NOT TESTED. |
| `postman/Sistem-Perpustakaan.postman_environment.json` | Diubah | Menghindari environment lama yang tidak konsisten. | Disinkronkan dengan template aman. | JSON parse; tidak ada secret terisi. |
| `docs/postman-testing.md` | Diubah | Menyamakan panduan Postman dengan collection/environment aktual. | Menunjuk file aktif dan menjelaskan prasyarat/NOT TESTED. | Review dokumen. |
| `docs/ai-usage.md` | Diubah | Menghapus klaim historis yang berlawanan dengan arsitektur runtime saat ini. | Menjelaskan backend tunggal aktual dan membedakan tes source dari runtime. | Review source/docs. |
| `docs/architecture.md` | Diubah | Menambahkan perilaku root, status verifikasi, dan kendala admin. | Catatan endpoint dan hasil audit terbaru. | Review source/docs; runtime belum diuji. |
| `docs/e2e-loan-flow.md` | Diubah | Membedakan alur yang didokumentasikan dengan eksekusi nyata. | Menambah status NOT TESTED untuk HTTP/DB. | Review source/docs. |
| `docs/PRD.md` | Diubah | PRD perlu merujuk status audit terbaru tanpa mengganti requirement lama yang masih benar. | Menambahkan catatan bahwa acceptance criteria belum dianggap teruji sampai runtime diverifikasi. | Review dokumen. |
| `docs/CODE_REVIEW_LOG.md` | Diubah | Mencatat temuan Prompt 4 yang benar-benar terlihat pada source. | Menambahkan CR-P4-01 root route, CR-P4-02 admin bootstrap, CR-P4-03 CORS wildcard, CR-P4-04 mapping error generik. | Temuan ditautkan ke source; runtime security tests NOT TESTED. |
| `docs/FINAL-UTS-AUDIT.md` | Diubah | Audit harus menilai tiap requirement dengan PASS/FAIL/NOT TESTED berdasarkan bukti. | Tabel status fitur, hasil perintah aktual, risiko tersisa, perintah setup, dan kolom review manusia. | Berdasarkan source dan command run pada 20 Okt 2026. |

## Rekap kumulatif lintas tahap

Daftar perubahan tahap Prompt 2 dan Prompt 3 tercatat pada bagian terdahulu dokumen ini. Tidak ada klaim bahwa file legacy telah dipindahkan atau dihapus. Pada Prompt 4, file yang diubah hanya daftar di atas.
