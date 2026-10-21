# Final UTS Audit — Prompt 4

Tanggal audit: 20 Oktober 2026. Audit ini membaca source, schema/migrator, tes otomatis, collection/environment, dan dokumentasi aktual pada paket. Status PASS hanya digunakan untuk hal yang benar-benar diperiksa; keberadaan handler tidak dianggap bukti keberhasilan runtime.

## Ringkasan runtime

- Entry point aktif: `npm start` → `node backend/server.js`.
- Frontend disajikan oleh backend pada `http://localhost:4000/`; health check `GET /health`.
- API base URL: `http://localhost:4000`.
- Database runtime: satu MySQL database `DB_NAME` (default `perpustakaan_db`) dengan tabel `users`, `books`, `loans`.
- Folder `api-gateway/`, `book-service/`, `loan-service/`, dan `scripts/start-all.js` tetap ada sebagai legacy; bukan entry point `npm start`.

## Status setiap kebutuhan UTS

| Ketentuan | Status | Bukti aktual / alasan |
|---|---|---|
| Backend utama satu entry point | PASS | `package.json` menjalankan `node backend/server.js`; source diperiksa. |
| Frontend memakai base URL API yang konsisten | PASS | Frontend disajikan same-origin oleh backend; source frontend diperiksa. Browser runtime belum diuji. |
| Registrasi menyimpan hash password | PASS (source only) | Handler memakai `bcrypt.hash`; belum diuji dengan database aktif. |
| Login valid menerbitkan JWT dan login salah ditolak | NOT TESTED | Source memakai `bcrypt.compare` dan `jwt.sign`; dependency runtime tidak tersedia sehingga request tidak dijalankan. |
| Daftar buku dan detail buku | NOT TESTED | Route dan validasi terlihat pada source; tidak ada request HTTP aktual. |
| Tambah buku | NOT TESTED | Handler tersedia tetapi hanya untuk role `admin`; registrasi publik membuat role `user` dan tidak ada akun admin bawaan. |
| Peminjaman menyimpan transaksi ke MySQL | NOT TESTED | Transaksi source-level diperiksa; MySQL tidak tersedia. |
| Maksimal tiga pinjaman aktif | PASS (source only) | Lock akun dan hitung active loan terlihat; belum diuji lewat request bersamaan/DB aktif. |
| Buku tidak tersedia ditolak | PASS (source only) | Conditional update status dan `409` terlihat; belum diuji runtime. |
| Due date tujuh hari | PASS (source only) | Source menghitung 7×24 jam; assertion source-level ada. Nilai runtime belum diuji. |
| Status buku berubah saat pinjam/kembali | NOT TESTED | Handler mengubah status dalam transaksi; tidak diverifikasi lewat query database aktual. |
| Pengembalian hanya pemilik transaksi | PASS (source only) | Handler membandingkan username JWT dengan pemilik transaksi; belum diuji HTTP. |
| Pengembalian berulang ditolak | PASS (source only) | Handler mengembalikan `409` untuk status `returned`; belum diuji HTTP. |
| Rollback mencegah perubahan parsial | NOT TESTED | `beginTransaction`/`rollback` terlihat pada source; tidak ada uji kegagalan MySQL aktual. |
| Migrator membuat schema dan menyalin legacy tanpa menghapus sumber | NOT TESTED | Source migrator diperiksa; migrasi tidak dijalankan terhadap database. |
| API Contract sesuai route aktual | PASS (source review) | Endpoint utama dibandingkan dengan `backend/server.js`; tidak berarti endpoint lulus runtime. |
| Postman collection/environment sesuai route | PASS (file/schema review) | JSON valid dan route disusun dari source; request belum dijalankan. |
| Tidak ada secret dalam environment template | PASS (file review) | `.env.example`/environment export memakai placeholder kosong; `.env` tidak ada. Ini bukan scan menyeluruh terhadap seluruh isi dan riwayat git. |
| Code review memuat temuan nyata | PASS (source review) | Temuan CR-P4-01 s.d. CR-P4-04 menunjuk lokasi source; risiko runtime masih belum diuji. |
| Tes otomatis source-level | PASS | `npm test`: 24 pass, 0 fail. |
| Syntax checks | PASS | `npm run check` dan `node --check frontend/script.js` keluar status 0. |
| HTTP/MySQL/Postman end-to-end | NOT TESTED | Dependency runtime hilang, `.env` tidak ada, `mysql` CLI tidak ditemukan. |
| Review manusia oleh anggota kelompok | NOT TESTED | Harus diisi anggota kelompok setelah review nyata; tidak diisi oleh AI. |

## Hasil perintah aktual

| Perintah/pemeriksaan | Hasil | Status |
|---|---|---|
| `npm test` | 24 tes, 24 lulus, 0 gagal | PASS |
| `npm run check` | Keluar status 0 | PASS |
| `node --check frontend/script.js` | Keluar status 0 | PASS |
| Resolusi `mysql2/promise`, `bcryptjs`, `jsonwebtoken`, `dotenv` | Keempatnya `MISSING` | NOT TESTED untuk runtime |
| `mysql --version` | `mysql: command not found` | NOT TESTED untuk DB |
| Keberadaan `.env` | Tidak ada | NOT TESTED untuk runtime |
| Migrasi / `npm start` / `GET /health` | Tidak dijalankan | NOT TESTED |
| Postman HTTP requests | Tidak dijalankan | NOT TESTED |

Tes source-level memeriksa pola kode dan kontrak. Tes ini tidak menjalankan MySQL, tidak mengirim HTTP, tidak menguji perubahan row database, dan tidak mensimulasikan konkurensi.

## Temuan/risiko tersisa

1. **Integrasi belum diverifikasi.** Instal dependency pada mesin kelompok, siapkan MySQL dan `.env`, jalankan migrasi pada database uji, lalu jalankan semua request Postman dan query read-only.
2. **Tambah buku memerlukan role admin.** Registrasi publik selalu membuat role `user`; tidak ada akun admin/password default. Siapkan akun admin melalui prosedur database lokal yang aman bila fitur ini perlu didemonstrasikan. Jangan membuka self-registration admin.
3. **CORS masih `*`.** `backend/server.js` mengizinkan semua origin; pertimbangkan membatasi origin sebelum deployment publik.
4. **Migrasi konflik.** `INSERT IGNORE` dapat melewati baris yang bertabrakan. Backup database lama, baca log migrasi, bandingkan jumlah row, dan rekonsiliasi konflik sebelum menyatakan migrasi lengkap.
5. **Arsitektur runtime bukan microservice aktif.** Jika rubrik UTS mewajibkan Gateway→Book Service→Loan Service benar-benar berjalan, perlu konfirmasi dosen/kelompok karena paket ini menggunakan backend tunggal.
6. **Tidak ada screenshot runtime.** Folder evidence tidak dianggap berisi hasil yang belum diambil. Tambahkan screenshot asli hanya setelah menjalankan Postman.

## Perintah untuk anggota kelompok

```bash
# dari root proyek
npm ci
cp .env.example .env
# edit .env: DB credentials, API_KEY, JWT_SECRET minimal 32 byte
npm run migrate
npm run check
npm test
node --check frontend/script.js
npm start
# di Postman: GET http://localhost:4000/health
```

Sebelum migrasi pada data penting, buat backup. Jalankan migrasi dan Postman lebih dahulu pada database lokal khusus pengujian. Perbarui `api-test/RESULTS.md` hanya dengan hasil yang benar-benar terlihat.

## Review manusia (diisi kelompok)

- Reviewer: Putra Aji Pratama, Muhammad Lutfi Ripani, Shandy Aulia, Sri Maharani
- Tanggal: 20 oktober 2026
- Hasil integrasi MySQL/Postman: berhasil
