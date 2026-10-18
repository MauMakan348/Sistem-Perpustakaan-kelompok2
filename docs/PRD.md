# Mini Product Requirements Document (PRD)
## Sistem Perpustakaan — UTS Vibe Coding

> **Status dokumen:** Draf berbasis audit source code dan template UTS. Kebutuhan yang belum dibuktikan lewat pengujian runtime diberi status **BELUM DIUJI** atau **[PERLU DIKONFIRMASI]**. Dokumen ini tidak menyatakan bahwa seluruh fitur sudah lulus pengujian.

## 1. Informasi Proyek

| Item | Isi |
|---|---|
| Nama proyek | Sistem Perpustakaan |
| Mata kuliah | Vibe Coding |
| Jenis tugas | UTS Kelompok |
| Anggota (nama dan NIM) | Sri Maharani - 2441919028 Shandy Aulia - 2441919027 Putra Aji Pratama - 2441919011 Muhammad Lutfi Rivani - 2441919037 Lia Saripah - 2441919012 |
| Versi dan tanggal | Draf PRD 1.0 — 18 Oktober 2026 |
| Link repository | https://github.com/MauMakan348/Sistem-Perpustakaan-kelompok2 |
| Sumber audit | ZIP `Sistem-Perpustakaan-kelompok2-perbaikan-root.zip` dan PDF `Salinan UTS-VIBE_CODING (1).pdf` yang dilampirkan |

## 2. Ringkasan

Sistem Perpustakaan adalah aplikasi untuk membantu pengguna perpustakaan melihat katalog buku, melakukan peminjaman dan pengembalian, serta memeriksa riwayat transaksi. Data buku disimpan pada MySQL `book_db`, sedangkan akun dan transaksi peminjaman disimpan pada MySQL `loan_db`. Project yang diaudit menyediakan frontend HTML/CSS/JavaScript dan backend API berbasis Node.js yang terdiri dari API Gateway, Book Service, dan Loan Service; arsitektur ini lebih kompleks daripada arsitektur satu backend service yang disarankan dalam template UTS dan perlu dikonfirmasi terhadap arahan dosen.

## 3. Tujuan

1. Pengguna dapat mendaftar dan login menggunakan akun yang tersimpan di database; password disimpan dalam bentuk hash, bukan teks biasa.
2. Pengguna dapat melihat daftar dan detail buku beserta status ketersediaannya melalui API HTTP/JSON.
3. Sistem mendukung peminjaman dan pengembalian dengan status transaksi dan status buku yang diperbarui secara konsisten.
4. Sistem menerapkan aturan wajib UTS: maksimal tiga buku aktif per mahasiswa, buku yang tidak tersedia tidak dapat dipinjam, dan jatuh tempo tujuh hari setelah tanggal pinjam.
5. Endpoint didokumentasikan dalam API Contract dan diuji melalui Postman, termasuk skenario berhasil, gagal, autentikasi, dan business rule; hasil tes dicatat dengan bukti aktual.

## 4. Pengguna dan Peran

| Peran | Kemampuan yang diharapkan | Kondisi berdasarkan source code |
|---|---|---|
| Mahasiswa/pengguna | Registrasi, login, melihat katalog/detail buku, meminjam, mengembalikan, melihat riwayat milik sendiri | Route registrasi/login, katalog, peminjaman, pengembalian, dan riwayat ditemukan. Semua skenario perlu diuji runtime. |
| Admin perpustakaan | Kemampuan pengguna dan menambahkan buku | Gateway memeriksa JWT dengan `role: admin` pada `POST /api/books`. Pendaftaran normal menghasilkan role `user`; cara resmi pemberian role admin perlu dikonfirmasi/didokumentasikan. |
| Sistem/layanan internal | Memproses request antar-service dan memperbarui status buku/transaksi | Gateway meneruskan request; Loan Service menghubungi Book Service melalui HTTP, bukan mengakses database buku langsung. |

Tidak ditemukan bukti bahwa registrasi publik dapat memilih role admin. Pengguna baru tidak boleh dianggap sebagai admin secara otomatis.

## 5. Ruang Lingkup

### Dikerjakan (in scope)

- Registrasi dan login dengan username/password, hashing password, dan JWT yang kedaluwarsa.
- Katalog buku: daftar, detail, dan status ketersediaan.
- Penambahan buku oleh admin sebagai fitur tambahan kelompok.
- Peminjaman, pengembalian, dan riwayat transaksi.
- Penyimpanan relasional pada MySQL.
- API HTTP/JSON, API Contract, pengujian Postman, dokumentasi README, penggunaan AI yang direview, dan code review.
- Frontend yang sudah ada tetap dipertahankan sebagai antarmuka demonstrasi; deliverable UTS tetap berfokus pada backend API, database, dokumentasi, dan pengujian.

### Tidak dikerjakan (out of scope)

- Denda keterlambatan, notifikasi, pembayaran, reservasi lanjutan, dan fitur besar lain yang tidak diminta UTS.
- Mengganti frontend menjadi framework baru tanpa kebutuhan yang disepakati.
- Menambahkan infrastruktur seperti Kubernetes, message broker, atau cache yang tidak diperlukan.

### Catatan kesesuaian arsitektur UTS

Template UTS menyebut satu backend service utama cukup dan tidak mengharuskan banyak server/port. ZIP yang diaudit saat ini memiliki API Gateway pada port 4000, Book Service pada port 4001, dan Loan Service pada port 4002, serta runner `scripts/start-all.js` untuk menyalakan ketiganya. Ini adalah kondisi implementasi aktual, bukan bukti bahwa microservices diwajibkan oleh dosen. **[PERLU DIKONFIRMASI]** apakah dosen menerima arsitektur yang ada atau kelompok perlu menyederhanakannya menjadi satu backend service sebelum pengumpulan. Jangan merombak arsitektur tanpa keputusan kelompok/dosen.

## 6. Technology Stack

| Komponen | Pilihan kelompok | Alasan singkat |
|---|---|---|
| Bahasa/backend | Node.js; modul `http` native (Express.js tidak ditemukan pada dependency yang diaudit) | Menjalankan endpoint HTTP dan meneruskan request antar-service. |
| Database | MySQL dengan `mysql2` | Database relasional untuk buku, akun, dan transaksi. Koneksi berhasil dilaporkan pada log startup yang disampaikan pengguna, tetapi pengujian independen pada audit dokumen ini tidak dijalankan. |
| Konfigurasi environment | `dotenv` | Membaca konfigurasi port, database, API key, dan JWT secret dari environment. |
| Autentikasi | `bcryptjs` dan `jsonwebtoken` | Hash password dan penerbitan/verifikasi JWT. |
| Format API | HTTP/JSON | Sesuai ketentuan UTS. |
| Frontend | HTML5, CSS3, Vanilla JavaScript | Antarmuka yang sudah ada pada `frontend/`. |
| Alat uji API | Postman Collection dan Postman Environment di `postman/` | Menguji endpoint serta menyimpan token/variabel pengujian. Eksekusi semua skenario belum dibuktikan. |
| AI assistant | [PERLU DIKONFIRMASI: tuliskan nama AI Coding Tool yang digunakan anggota] | Membantu analisis, implementasi, debugging, dan dokumentasi; hasil harus direview manusia dan diuji. |

## 7. Kebutuhan Fungsional

> Kriteria berikut adalah persyaratan yang harus dipenuhi. Keberadaan route di source code tidak berarti fitur telah lulus pengujian.

### FR-01 — Registrasi dan Login

- Pengguna mendaftar dengan username dan password; username harus unik.
- Password disimpan sebagai hash menggunakan bcrypt/bcryptjs; hash tidak boleh dikembalikan ke client.
- Login valid menghasilkan JWT dengan masa berlaku; kredensial salah ditolak.
- Endpoint terlindungi menolak token yang tidak ada, tidak valid, atau kedaluwarsa.
- **Kriteria penerimaan:** registrasi sukses menghasilkan `201`; input tidak valid menghasilkan `400`; username duplikat menghasilkan `409`; login valid menghasilkan `200` dan token; kredensial salah menghasilkan `401`; request terlindungi tanpa token ditolak. Status tersebut sesuai dengan handler yang ditemukan dan tetap harus dikonfirmasi lewat tes.

### FR-02 — Daftar dan Detail Buku

- Pengguna yang memenuhi pemeriksaan akses dapat melihat daftar buku dan status ketersediaan.
- Pengguna dapat melihat detail buku berdasarkan ID.
- ID buku yang tidak ditemukan menghasilkan respons gagal yang sesuai.
- **Kriteria penerimaan:** `GET /api/books` mengembalikan daftar JSON; `GET /api/books/:id` mengembalikan detail jika ada dan `404` jika tidak ditemukan. Gateway saat ini memerlukan API Key atau JWT untuk pembacaan buku; frontend harus mengirim kredensial yang sesuai atau kebijakan akses perlu diselaraskan.

### FR-03 — Peminjaman Buku

- Pengguna yang login dapat meminjam buku yang tersedia.
- Sistem menolak buku yang tidak tersedia atau tidak ditemukan.
- Transaksi mencatat pengguna, buku, tanggal pinjam, jatuh tempo, dan status aktif di database.
- Status buku diperbarui menjadi dipinjam secara konsisten.
- **Kriteria penerimaan:** request valid menghasilkan transaksi tersimpan; buku tidak tersedia ditolak; status buku berubah; jatuh tempo tepat tujuh hari setelah tanggal pinjam; pengguna yang sudah memiliki tiga buku aktif tidak dapat meminjam buku keempat.
- **Status audit:** route peminjaman dan pengecekan jumlah pinjaman ditemukan, tetapi implementasi batas tiga buku aktif dan seluruh alur belum dinyatakan lulus tanpa pengujian end-to-end.

### FR-04 — Pengembalian Buku

- Pengguna dapat mengembalikan transaksi aktif miliknya.
- Sistem menolak transaksi yang tidak ada, milik pengguna lain, atau sudah dikembalikan.
- Status transaksi menjadi `returned`, `returned_at` diisi, dan status buku kembali tersedia.
- **Kriteria penerimaan:** pengembalian sukses memperbarui transaksi dan buku; transaksi tidak ada menghasilkan `404`; transaksi milik orang lain ditolak; pengembalian ganda ditolak (handler saat ini dirancang mengembalikan `409`).

### FR-05 — Riwayat Peminjaman

- Pengguna dapat melihat riwayat transaksi miliknya.
- Pengguna tidak dapat membaca atau mengubah riwayat milik pengguna lain.
- **Kriteria penerimaan:** `GET /api/loans/:username` memerlukan JWT dan hanya dapat menampilkan riwayat sesuai pengguna yang terautentikasi; akses lintas pengguna ditolak.

### FR-06 — Penambahan Buku oleh Admin

- Admin dapat menambahkan buku dengan judul dan penulis yang valid.
- Status awal buku ditetapkan oleh server sebagai tersedia.
- Pengguna biasa tidak dapat menambahkan buku.
- **Kriteria penerimaan:** admin valid mendapat respons sukses dan data tersimpan; input tidak valid ditolak; token pengguna biasa menghasilkan `403`; request tanpa token menghasilkan `401`.

### FR-07 — Konsistensi status buku dan transaksi

- Book Service dan Loan Service berkomunikasi melalui HTTP API; Loan Service tidak membaca database Book Service secara langsung.
- Peminjaman/pengembalian tidak boleh membuat status buku dan status transaksi saling bertentangan tanpa dilaporkan sebagai kegagalan.
- **Kriteria penerimaan:** tes end-to-end membandingkan status pada database/API sebelum dan sesudah pinjam serta kembali; kegagalan service tujuan menghasilkan error yang terdokumentasi dan tidak membuat transaksi seolah-olah berhasil.

## 8. Business Rule

| ID | Aturan | Jenis | Kriteria verifikasi |
|---|---|---|---|
| BR-01 | Satu mahasiswa maksimal memiliki 3 buku aktif yang belum dikembalikan. | Wajib UTS | Pinjaman ke-1 sampai ke-3 dapat diproses jika syarat lain terpenuhi; pinjaman ke-4 ditolak. |
| BR-02 | Buku yang tidak tersedia tidak dapat dipinjam. | Wajib UTS | Request peminjaman buku berstatus dipinjam/ tidak tersedia ditolak dan tidak membuat transaksi aktif tambahan. |
| BR-03 | Jatuh tempo adalah tanggal pinjam ditambah 7 hari. | Wajib UTS | Bandingkan `borrow_date` dan `due_date` dengan toleransi zona waktu yang disepakati. |
| BR-04 | Hanya admin yang dapat menambahkan buku. | Tambahan kelompok | Token role `user` ditolak; role `admin` diterima setelah validasi input. |
| BR-05 | Pengembalian hanya berlaku untuk transaksi aktif. | Tambahan kelompok | Transaksi returned atau tidak ditemukan tidak dapat dikembalikan lagi. |
| BR-06 | Pengguna hanya dapat mengelola transaksi miliknya. | Tambahan kelompok | Username dari token menjadi identitas utama; akses transaksi pengguna lain ditolak. |
| BR-07 | Password tidak disimpan dalam bentuk teks biasa dan JWT memiliki masa berlaku. | Keamanan | Database hanya menyimpan hash; token kedaluwarsa ditolak. |

## 9. Model Data

### Skema aktual yang ditemukan

| Tabel | Kolom utama | Relasi/catatan |
|---|---|---|
| `books` — database `book_db` | `id` (PK), `title`, `author`, `status` | Status dibatasi ke `tersedia` atau `dipinjam`. Tidak ditemukan FK ke database transaksi; Loan Service berkomunikasi dengan Book Service melalui HTTP. |
| `users` — database `loan_db` | `id` (PK), `username` (unik), `password_hash`, `role`, `created_at` | Role enum `user`/`admin`; password disimpan sebagai hash. |
| `loans` — database `loan_db` | `id`, `username`, `book_id`, `book_title`, `borrow_date`, `due_date`, `status`, `returned_at` | `status` enum `active`/`returned`; indeks username dan due date. `book_id` adalah referensi logis ke `books.id`, bukan foreign key lintas database. `username` bukan foreign key ke `users.id`. |

### Implikasi dan kebutuhan

- Data pengguna dan transaksi berada di `loan_db`, sedangkan katalog berada di `book_db`.
- Karena pemisahan database, integritas antara transaksi dan buku perlu dijaga melalui API dan pengujian end-to-end.
- **[PERLU DIKONFIRMASI]** apakah struktur terpisah ini dipertahankan atau disederhanakan untuk memenuhi arahan UTS mengenai satu backend service utama. Database dapat tetap relasional, tetapi rancangan akhir harus didokumentasikan secara konsisten.
- Jangan menambahkan tabel atau kolom baru tanpa perubahan schema/migration yang ditinjau kelompok.

## 10. Rancangan API Endpoint

**Base URL publik:** `http://localhost:4000` (API Gateway). Port internal default: Book Service `4001`, Loan Service `4002`.

| Layanan/modul | Method | Endpoint publik | Fungsi | Perlu login? | Role yang diizinkan |
|---|---|---|---|---|---|
| Auth/Loan Service | POST | `/api/register` | Membuat akun pengguna | Tidak | Publik; role baru default `user` |
| Auth/Loan Service | POST | `/api/login` | Memvalidasi kredensial dan menerbitkan JWT | Tidak | Publik |
| Buku/Book Service | GET | `/api/books` | Daftar buku | Gateway memerlukan API Key atau JWT | Pengguna bertoken atau client tepercaya dengan API Key |
| Buku/Book Service | GET | `/api/books/:id` | Detail buku | Gateway memerlukan API Key atau JWT | Pengguna bertoken atau client tepercaya dengan API Key |
| Buku/Book Service | POST | `/api/books` | Menambahkan buku | Ya | Admin JWT |
| Buku/Book Service | PATCH | `/api/books/:id/status` | Mengubah status buku untuk alur internal | Gateway memerlukan API Key | Client tepercaya/internal; bukan operasi pengguna biasa |
| Peminjaman/Loan Service | POST | `/api/loans` | Membuat peminjaman dengan `bookId` | Ya | Pengguna bertoken |
| Peminjaman/Loan Service | GET | `/api/loans/:username` | Melihat riwayat transaksi pengguna | Ya | Pemilik transaksi; akses lintas pengguna harus ditolak |
| Peminjaman/Loan Service | POST | `/api/loans/:id/return` | Mengembalikan transaksi | Ya | Pemilik transaksi |

### Catatan kontrak dan ketidaksesuaian

- Gateway menghapus prefix `/api` ketika meneruskan request buku/pinjaman ke service internal. Route autentikasi diteruskan sebagai `/register` dan `/login` ke Loan Service.
- Gateway pada ZIP yang diaudit menerima pembacaan buku hanya jika API Key atau JWT valid. Frontend `frontend/script.js` memanggil `/api/books` menggunakan helper yang menambahkan JWT jika token tersedia, tetapi tidak mengirim API Key. Karena itu, halaman katalog akan gagal bila pengguna belum login atau token tidak valid. Kebijakan akses katalog perlu diputuskan dan diuji.
- Daftar endpoint di atas berasal dari route/handler yang ditemukan. Method, body, response, dan status code lengkap untuk tiap endpoint harus ditulis di `docs/API-CONTRACT.md` sesuai handler aktual. File `docs/API-CONTRACT.md` belum ditemukan pada ZIP ini.
- Format request utama yang terlihat: registrasi/login memakai `{ "username": "...", "password": "..." }`; peminjaman memakai `{ "bookId": <id> }`; penambahan buku memakai `{ "title": "...", "author": "..." }`.
- Base URL ini adalah backend API, bukan otomatis URL frontend. Frontend tersedia pada `frontend/index.html`; metode penyajian frontend perlu dijelaskan di README dan diselaraskan dengan target satu perintah startup jika itu kebutuhan kelompok.

## 11. Rencana Pengujian API

**Status awal semua skenario: BELUM DIUJI dalam PRD ini.** Hasil tes yang sudah benar-benar dilakukan kelompok harus dicatat berdasarkan bukti Postman/log aktual, bukan perkiraan.

| ID | Skenario | Hasil yang diharapkan | Status |
|---|---|---|---|
| T-01 | Login dengan akun valid | `200`, JWT dan informasi pengguna tanpa password hash | BELUM DIUJI |
| T-02 | Login dengan username/password salah | `401`; tidak menerbitkan token | BELUM DIUJI |
| T-03 | Melihat daftar dan detail buku, termasuk ID yang tidak ada | Daftar/detail sesuai data; ID tak ada `404`; akses memenuhi aturan auth | BELUM DIUJI |
| T-04 | Meminjam buku tersedia | Transaksi tersimpan, status buku menjadi dipinjam, due date +7 hari | BELUM DIUJI |
| T-05 | Meminjam buku tidak tersedia | Request ditolak dan tidak ada transaksi aktif tambahan | BELUM DIUJI |
| T-06 | Meminjam buku keempat saat 3 buku aktif | Request ditolak sesuai BR-01 | BELUM DIUJI |
| T-07 | Mengembalikan buku aktif milik sendiri | Status transaksi `returned`, waktu kembali terisi, buku tersedia | BELUM DIUJI |
| T-08 | Memeriksa status buku sesudah pinjam dan kembali | Status berubah `tersedia` → `dipinjam` → `tersedia` | BELUM DIUJI |
| T-09 | Menambahkan buku dengan akun admin | Sukses; data tersimpan dengan status awal tersedia | BELUM DIUJI |
| T-10 | Menambahkan buku dengan akun user biasa | `403` atau respons penolakan yang sesuai; data tidak ditambahkan | BELUM DIUJI |
| T-11 | Mengakses endpoint terlindungi tanpa token | `401`; tidak ada perubahan data | BELUM DIUJI |
| T-12 | Meminjam dengan ID buku yang tidak ada | `404` atau status terdokumentasi; tidak ada transaksi aktif | BELUM DIUJI |
| T-13 | Mengembalikan transaksi yang tidak ada | `404`; data tidak berubah | BELUM DIUJI |
| T-14 | Mengembalikan transaksi yang sudah returned | `409` atau status konflik yang didokumentasikan | BELUM DIUJI |
| T-15 | Mengakses riwayat pengguna lain | Ditolak; data pengguna lain tidak bocor | BELUM DIUJI |
| T-16 | Registrasi dengan username duplikat / input tidak valid | Duplikat `409`, input tidak valid `400` | BELUM DIUJI |
| T-17 | Kegagalan Book Service atau database | Error terkontrol, tidak mengembalikan stack trace/secret; konsistensi transaksi diperiksa | BELUM DIUJI |
| T-18 | Token kedaluwarsa/tidak valid | `401`; request terlindungi tidak diteruskan sebagai sukses | BELUM DIUJI |

Bukti pengujian disimpan sebagai hasil run Postman, screenshot, atau collection pada folder yang disepakati. Template UTS menyebut `api-test/`; project saat ini memiliki `postman/`. **[PERLU DIKONFIRMASI]** apakah kelompok akan mempertahankan `postman/` atau menyalin bukti run ke `api-test/` agar sesuai instruksi dosen.

## 12. Rencana Penggunaan AI

Pola wajib: **Requirement/Context → Prompt → Output AI → Review manusia → Testing → Iterasi**.

| No. | Pekerjaan | Context yang diberikan ke AI | Prompt disimpan di | Hasil review manusia |
|---|---|---|---|---|
| 1 | Audit struktur proyek dan database | Template UTS, ZIP proyek, package, route, schema, README | `docs/prompts.md` untuk prompt historis yang tersedia; audit PRD ini perlu ditambahkan jika ingin menjadi bukti formal | Kelompok memverifikasi ulang hasil audit terhadap source code dan instruksi dosen. **[PERLU DIISI: nama reviewer/tanggal]** |
| 2 | Autentikasi, password hash, dan JWT | `loan-service/auth.js`, route registrasi/login, schema `users` | `docs/prompts.md` dan/atau `docs/authentication.md` | Periksa status code, password hash, expiry token, dan role; bukti tes aktual perlu dilampirkan. |
| 3 | Peminjaman dan business rule | `loan-service/server.js`, `book-service/server.js`, skema `loans`/`books` | `docs/prompts.md`, `docs/e2e-loan-flow.md` | Uji batas 3 buku aktif, due date 7 hari, buku tidak tersedia, dan konsistensi lintas service. |
| 4 | Pengembalian buku | Handler `POST /api/loans/:id/return`, status `returned`, `returned_at` | `docs/prompts.md`, dokumentasi alur peminjaman | Uji transaksi aktif, transaksi ganda, pemilik transaksi, dan ketersediaan buku. |
| 5 | API Contract dan Postman | Route Gateway/service, koleksi dan environment Postman | `docs/postman-testing.md`; **API Contract formal belum ada** | Cocokkan setiap request dengan handler aktual; jangan menandai lulus sebelum menjalankan collection. |
| 6 | Code review dan perbaikan | Source code, hasil test, README dan catatan audit | `docs/ai-usage.md`, `docs/prompts.md` | Review correctness, keamanan, keterbacaan, dan maintainability. **[PERLU DIISI: 3 temuan final code review yang disepakati kelompok]** |

Nama AI Coding Tool spesifik, pembagian prompt per anggota, reviewer, dan tanggal review belum dapat dipastikan hanya dari source code: **[PERLU DIKONFIRMASI oleh kelompok]**. Jangan menganggap dokumentasi prompt sebagai bukti semua output AI telah diuji.

## 13. Rencana Implementasi

Waktu mengikuti template UTS: tujuh hari. Target hari adalah rencana, bukan status selesai.

| No. | Tugas | Penanggung jawab | Target hari ke- | Selesai? |
|---|---|---|---|---|
| 1 | Audit project lama, bandingkan arsitektur dengan template, finalisasi PRD | [PERLU DIISI: anggota] | 1 | Belum dikonfirmasi |
| 2 | Verifikasi schema MySQL, konfigurasi environment, migrasi dan data uji | [PERLU DIISI: anggota] | 2 | Belum dikonfirmasi |
| 3 | Verifikasi registrasi/login, token, akses katalog, dan otorisasi admin | [PERLU DIISI: anggota] | 3 | Belum dikonfirmasi |
| 4 | Uji dan perbaiki peminjaman, batas 3 buku aktif, status buku, due date 7 hari | [PERLU DIISI: anggota] | 4 | Belum dikonfirmasi |
| 5 | Uji dan perbaiki pengembalian, kepemilikan transaksi, dan konsistensi data | [PERLU DIISI: anggota] | 5 | Belum dikonfirmasi |
| 6 | Lengkapi API Contract, jalankan Postman positif/negatif, buat bukti tes dan code review | [PERLU DIISI: anggota] | 6 | Belum dikonfirmasi |
| 7 | Perbarui README, rapikan deliverables, validasi semua requirement, persiapan presentasi | [PERLU DIISI: anggota] | 7 | Belum dikonfirmasi |

## 14. Definition of Done

Sebuah requirement/tugas dianggap selesai jika:

- Kriteria penerimaan requirement terkait terpenuhi dan dibuktikan dengan hasil yang dapat diulang.
- API diuji melalui Postman atau alat sejenis untuk kondisi berhasil dan gagal.
- Business rule wajib UTS teruji: maksimal tiga buku aktif, penolakan buku tidak tersedia, jatuh tempo tujuh hari, dan pembaruan status saat pinjam/kembali.
- Data akun, buku, dan transaksi tersimpan secara persisten pada database yang benar.
- Akses tanpa token, token invalid/kedaluwarsa, role user/admin, dan batas akses riwayat telah diuji.
- Kode hasil AI direview manusia; `docs/CODE_REVIEW_LOG.md` memiliki minimal tiga temuan sesuai instruksi UTS.
- `docs/API-CONTRACT.md` dan README diperbarui serta sesuai dengan route aktual.
- Tidak ada secret, password asli, atau token nyata dalam source code, dokumentasi, collection publik, atau repository.
- Struktur dan jumlah service telah dikonfirmasi sesuai arahan dosen; jika arsitektur multi-port dipertahankan, alasannya dicatat dan disetujui.
- Semua anggota memahami arsitektur, database, endpoint, aturan bisnis, hasil pengujian, dan bagian yang belum selesai.

## 15. Risiko dan Pertanyaan Terbuka

| Risiko / Pertanyaan | Rencana penanganan |
|---|---|
| Project menggunakan Gateway + dua service pada tiga port, sedangkan template menyatakan satu backend service utama cukup dan tidak perlu banyak port. | Konfirmasi ke dosen/kelompok sebelum perubahan besar. Jika perlu, rencanakan penyederhanaan sebagai keputusan eksplisit; jangan mengklaim arsitektur saat ini memenuhi arahan tanpa persetujuan. |
| Frontend meminta katalog tanpa mengirim API Key; Gateway mengharuskan API Key atau JWT untuk `GET /api/books`. Ini dapat membuat katalog gagal dimuat sebelum login atau ketika token tidak valid. | Putuskan apakah katalog memang publik, wajib login, atau menggunakan kebijakan lain yang aman. Selaraskan Gateway, frontend, dan API Contract; jangan menaruh API Key rahasia di browser. Uji skenario sebelum dan sesudah login. |
| Kode Gateway yang diaudit hanya meneruskan metode/rute yang secara eksplisit diizinkan; route yang tidak cocok dapat menghasilkan 405. | Cocokkan semua fetch frontend dengan route Gateway dan handler internal; tambah tes integrasi untuk tiap endpoint. |
| Aturan maksimal 3 buku aktif dan jatuh tempo 7 hari wajib UTS tetapi belum terbukti lulus end-to-end dalam audit ini. | Buat tes Postman yang deterministik dengan akun dan data uji; catat tanggal, request, response, serta status aktual. |
| Database dipisah menjadi `book_db` dan `loan_db`; relasi buku/transaksi tidak menggunakan foreign key lintas database. | Jaga konsistensi melalui API, penanganan kegagalan/kompensasi, dan tes integrasi. Dokumentasikan konsekuensi desain ini. |
| API Contract formal `docs/API-CONTRACT.md` tidak ditemukan dalam ZIP yang diaudit. | Buat dokumen sesuai Langkah 6 template, mencakup header, request/response, status code, validasi, dan contoh sukses/gagal setiap endpoint. |
| Bukti eksekusi pengujian dan `docs/CODE_REVIEW_LOG.md` belum ditemukan pada struktur ZIP. | Jalankan seluruh tes, simpan bukti pada `api-test/` atau folder yang disepakati, dan isi minimal tiga temuan code review yang benar-benar ditinjau manusia. |
| Pemberian role admin tidak tersedia melalui registrasi publik; cara provisioning admin belum dijelaskan sepenuhnya untuk operator baru. | Dokumentasikan prosedur pengaturan admin lokal yang aman dan tidak membagikan password/hash/secret. Jangan memberikan role admin otomatis pada registrasi. |
| Nama anggota, NIM, AI Coding Tool spesifik, pembagian tugas, reviewer, dan tanggal selesai belum tersedia. | Lengkapi placeholder pada Bagian 1, 6, 12, dan 13 bersama seluruh anggota sebelum pengumpulan. |
| Environment bergantung pada MySQL, kredensial lokal, API key, dan JWT secret. | Gunakan `.env` lokal yang tidak dikomit, `.env.example` tanpa secret, validasi konfigurasi saat startup, dan petunjuk instalasi yang dapat diulang. |
| Pengujian runtime lengkap belum dilakukan saat menyusun PRD ini; source-level tests tidak menggantikan tes API dan database. | Jalankan migration, startup, dan collection Postman di lingkungan kelompok; laporkan hanya hasil yang benar-benar diperoleh. |

---

## Ringkasan informasi yang harus dikonfirmasi sebelum pengumpulan

1. Nama dan NIM seluruh anggota kelompok.
2. Nama AI Coding Tool yang benar-benar digunakan dan siapa yang melakukan review manusia.
3. Apakah dosen menyetujui arsitektur Gateway + Book Service + Loan Service, atau mengharuskan satu backend service utama.
4. Kebijakan katalog buku: boleh diakses publik atau wajib login; lalu samakan frontend dengan kebijakan Gateway.
5. Bukti bahwa BR-01, BR-02, BR-03, pengembalian, dan otorisasi admin lulus pengujian.
6. Penyelesaian `docs/API-CONTRACT.md`, `docs/CODE_REVIEW_LOG.md`, serta folder bukti tes yang sesuai template (`api-test/` atau keputusan kelompok tentang `postman/`).
7. Prosedur pemberian role admin dan akun uji yang aman untuk README.

## Perbedaan penting antara template UTS dan project saat ini

- **Arsitektur:** template menyatakan satu backend service utama cukup; source code menggunakan tiga proses backend pada port 4000, 4001, dan 4002.
- **Frontend:** template mencantumkan frontend sebagai out of scope untuk UTS, tetapi project sudah memiliki frontend. Frontend dapat dipertahankan, sementara penilaian dan bukti UTS tetap dipusatkan pada API/database/Postman.
- **Dokumentasi:** project memiliki README, dokumentasi arsitektur, autentikasi, alur peminjaman, penggunaan AI, dan Postman, tetapi `docs/API-CONTRACT.md` serta `docs/CODE_REVIEW_LOG.md` belum ditemukan pada ZIP audit.
- **Pengujian:** file tes otomatis/source-level tersedia, tetapi tidak cukup untuk menyatakan seluruh endpoint dan business rule lulus. Semua skenario di Bagian 11 berstatus BELUM DIUJI sampai ada bukti runtime aktual.
