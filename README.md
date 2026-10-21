# Sistem Peminjaman Buku Perpustakaan — UTS Vibe Coding

## Deskripsi dan teknologi

Aplikasi web sederhana untuk registrasi/login, katalog buku, peminjaman, riwayat transaksi, dan pengembalian. Jalur runtime pada paket ini adalah **satu backend Node.js** (`backend/server.js`) dengan HTTP API, frontend statis (`frontend/`), serta satu database MySQL berisi tabel `users`, `books`, dan `loans`. Folder `api-gateway/`, `book-service/`, dan `loan-service/` adalah implementasi/artefak legacy yang dipertahankan; `npm start` tidak menjalankannya.

Teknologi utama: Node.js, HTTP server bawaan Node, MySQL, `mysql2`, `bcryptjs`, `jsonwebtoken`, `dotenv`, HTML, CSS, JavaScript, dan Postman.

## Persyaratan

- Node.js yang mendukung sintaks yang digunakan (disarankan Node.js LTS modern).
- npm.
- MySQL aktif dan akun database yang boleh membuat database/tabel serta membaca database lama bila migrasi legacy diperlukan.
- Postman (opsional, untuk pengujian API manual).

## Instalasi dan konfigurasi environment

Dari direktori root repository:

```bash
npm ci
cp .env.example .env
```

Edit `.env` secara lokal; jangan commit atau membagikannya. Contoh variabel yang perlu disesuaikan:

```dotenv
PORT=4000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=perpustakaan_db
LEGACY_BOOK_DB_NAME=book_db
LEGACY_LOAN_DB_NAME=loan_db
API_KEY=ganti-dengan-api-key-random
JWT_SECRET=ganti-dengan-secret-random-minimal-32-byte
JWT_EXPIRES_IN=2h
```

Isi `DB_PASSWORD` dengan password MySQL lokal yang benar. `JWT_SECRET` harus minimal 32 byte. `API_KEY` harus berupa nilai acak lokal. `LEGACY_BOOK_DB_NAME` dan `LEGACY_LOAN_DB_NAME` hanya digunakan oleh migrator; backend runtime menggunakan `DB_NAME`.

## Menyiapkan database

Pastikan MySQL server berjalan, lalu dari root proyek jalankan:

```bash
npm run migrate
```

Migrator membuat schema `users`, `books`, `loans` pada `DB_NAME`. Jika database legacy tersedia, migrator mencoba menyalin data dari database sumber yang dikonfigurasi; database sumber tidak dihapus atau diubah. `INSERT IGNORE` dapat melewati konflik ID/username, jadi periksa log dan rekonsiliasi jumlah baris. Buat backup sebelum migrasi database yang berisi data penting. Jangan jalankan migrasi pertama kali pada database produksi tanpa rencana pemulihan.

Akun baru dibuat melalui `POST /api/register`; tidak ada akun/password admin bawaan. Endpoint tambah buku `POST /api/books` hanya menerima token akun dengan role `admin`, sementara registrasi normal membuat role `user`. Jangan mengubah role atau data produksi hanya untuk membuat tes lulus; gunakan database lokal terpisah.

## Menjalankan aplikasi

Satu perintah untuk backend utama:

```bash
npm start
```

Backend menguji koneksi MySQL saat startup dan gagal memulai jika database tidak dapat diakses atau `JWT_SECRET` tidak valid. Setelah berjalan:

- Frontend: <http://localhost:4000/>
- Health check: <http://localhost:4000/health>
- Base URL API: `http://localhost:4000`

Frontend disajikan oleh backend utama dan memanggil API dengan path same-origin.

## API utama

- `POST /api/register`
- `POST /api/login`
- `GET /api/books`
- `GET /api/books/:id`
- `POST /api/books` (JWT role admin)
- `PATCH /api/books/:id/status` (API Key internal)
- `POST /api/loans`
- `GET /api/loans/:username` (hanya pemilik JWT)
- `POST /api/loans/:id/return` (hanya pemilik transaksi)

Untuk detail header, request, response, validasi, dan status HTTP, baca [`docs/API-CONTRACT.md`](docs/API-CONTRACT.md). Identitas peminjam diambil dari JWT; `username` dari body bukan bukti otorisasi. Batas aktif adalah tiga peminjaman, status buku harus `tersedia`, dan jatuh tempo dihitung tujuh kali 24 jam dari tanggal pinjam.

## Postman

1. Jalankan MySQL, migrasi, dan backend.
2. Import `api-test/collection.json` dan `api-test/environment.json` ke Postman.
3. Pilih environment `Sistem Perpustakaan - Local Test (safe template)`.
4. Isi variabel lokal `apiKey`, `password`, `wrongPassword`, `otherUsername`, dan ID data uji yang diperlukan. Jangan simpan secret asli dalam file yang dikomit.
5. Jalankan health, register, login, daftar/detail buku, pinjam, status setelah pinjam, return, dan status setelah return sesuai prasyarat pada `api-test/README.md`.
6. Skenario batas tiga pinjaman membutuhkan akun yang memiliki tepat tiga pinjaman aktif dan buku keempat tersedia. Skenario buku tidak tersedia memerlukan ID buku berstatus `dipinjam`. Skenario lain yang memerlukan ID tak ditemukan perlu memakai ID positif yang benar-benar tidak ada.
7. Catat hasil aktual di `api-test/RESULTS.md`. Jangan tandai PASS sebelum request benar-benar dijalankan dan response serta perubahan database diperiksa. Screenshot contoh belum disediakan karena belum ada eksekusi Postman yang dapat dibuktikan pada environment penyusunan paket.

## Pengujian otomatis

```bash
npm run check
npm test
node --check frontend/script.js
```

Tes saat ini memeriksa source/kontrak dan tidak menjalankan server HTTP atau MySQL. Tes integrasi harus dilakukan pada lingkungan dengan dependency dan database aktif. `npm test` yang lulus tidak boleh dilaporkan sebagai bukti bahwa seluruh endpoint lulus runtime.

## Status verifikasi paket ini

Pada audit dokumen ini, `npm test` lulus **24/24 source-level tests**; `npm run check` dan `node --check frontend/script.js` juga lulus. Dependency runtime (`mysql2`, `bcryptjs`, `jsonwebtoken`, `dotenv`) tidak tersedia pada environment audit, `mysql` CLI tidak tersedia, dan `.env` lokal tidak ada. Karena itu migrasi MySQL, `npm start`, request HTTP, Postman, perubahan database, dan concurrency runtime berstatus **NOT TESTED**. Rincian ada di [`docs/FINAL-UTS-AUDIT.md`](docs/FINAL-UTS-AUDIT.md) dan [`api-test/RESULTS.md`](api-test/RESULTS.md).

## Dokumentasi utama

- [`docs/architecture.md`](docs/architecture.md) — arsitektur runtime.
- [`docs/PRD.md`](docs/PRD.md) — kebutuhan produk.
- [`docs/API-CONTRACT.md`](docs/API-CONTRACT.md) — kontrak API aktual.
- [`docs/CODE_REVIEW_LOG.md`](docs/CODE_REVIEW_LOG.md) — temuan code review.
- [`docs/e2e-loan-flow.md`](docs/e2e-loan-flow.md) — alur pinjam/kembali.
- [`docs/ai-usage.md`](docs/ai-usage.md) — penggunaan AI dan batas verifikasi.
- [`docs/FILE-CHANGELOG.md`](docs/FILE-CHANGELOG.md) — daftar perubahan lintas tahap.
- [`docs/FINAL-UTS-AUDIT.md`](docs/FINAL-UTS-AUDIT.md) — audit final.
