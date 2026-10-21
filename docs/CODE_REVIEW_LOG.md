# Code Review Log — Sistem Perpustakaan

Tanggal review: 19 Oktober 2026  
Ruang lingkup: pembacaan source code dan tes source-level yang tersedia pada paket kerja.  
Reviewer manusia: Putra Aji Pratama, Muhammad Lutfi rifani, Shandy Aulia, Sri Maharani, Lia Saripah.
Reviewer AI: ChatGPT digunakan sebagai alat bantu analisis; hasilnya tetap perlu divalidasi anggota kelompok.

## Batasan review

Review ini dilakukan dengan membaca kode dan menjalankan sebagian tes `node:test` yang tidak membutuhkan koneksi MySQL. Ini **bukan** pengujian integrasi HTTP dengan server dan MySQL aktif. Status “Ditemukan dari kode” berarti masalah terlihat langsung pada source; status “Perlu verifikasi manusia/runtime” berarti belum dibuktikan lewat pengujian operasional.

## Temuan

### CR-01 — Route PATCH tanpa ID membaca segmen URL yang tidak ada

1. **File/fungsi:** `backend/server.js`, handler `PATCH` untuk status buku.
2. **Masalah:** Kondisi route menerima `PATCH /api/books` maupun `PATCH /api/books/:id/status`, tetapi handler mengambil ID dengan `pathname.split('/')[3]`. Pada path persis `/api/books`, segmen tersebut tidak ada, sehingga konversi ID menjadi `NaN` dan request dikembalikan sebagai `400`.
3. **Dampak:** Route yang tampak tersedia sebenarnya tidak bisa dipakai; kontrak API berpotensi membingungkan pemanggil.
4. **Perbaikan/keputusan:** Gunakan endpoint yang memiliki ID, yaitu `PATCH /api/books/:id/status`. Cabang `PATCH /api/books` dicatat sebagai defect yang belum diperbaiki pada review ini; jangan gunakan route tersebut. Perbaikan kode sebaiknya dilakukan terpisah dan disertai tes route.
5. **Status perbaikan:** **Belum diperbaiki — workaround/keputusan terdokumentasi.**
6. **Bukti verifikasi:** Dapat diturunkan langsung dari kondisi route dan pemakaian `pathname.split('/')[3]` pada `backend/server.js`; juga telah disebut dalam `docs/API-CONTRACT.md`. Belum diuji lewat HTTP runtime.

### CR-02 — Struktur direktori microservice tidak sama dengan arsitektur yang benar-benar dijalankan

1. **File/fungsi:** `package.json` (`scripts.start`), `backend/server.js`, `docs/architecture.md`, direktori `api-gateway/`, `book-service/`, `loan-service/`.
2. **Masalah:** Perintah `npm start` menjalankan `node backend/server.js`. Backend ini mengakses `book_db` dan `loan_db` langsung dari satu proses dan tidak mengirim request runtime ke service pada port 4001/4002. Direktori service lama masih ada dalam repository.
3. **Dampak:** Penguji dapat salah menyimpulkan bahwa request runtime melewati API Gateway dan dua service terpisah, padahal jalur eksekusi aktif adalah backend tunggal. Dua set implementasi juga menambah beban pemeliharaan dan risiko dokumentasi tidak sinkron.
4. **Perbaikan/keputusan:** README dan `docs/architecture.md` harus secara jelas menyebut backend tunggal sebagai jalur aktif untuk paket ini dan menandai service lama sebagai artefak/implementasi yang tidak dijalankan oleh `npm start`. Jika penilaian UTS mewajibkan microservice aktif, anggota kelompok perlu memutuskan apakah mengembalikan jalur gateway→service atau meminta persetujuan atas perubahan arsitektur.
5. **Status perbaikan:** **Didokumentasikan; keputusan kesesuaian terhadap rubrik UTS perlu dikonfirmasi manusia.**
6. **Bukti verifikasi:** `package.json` memuat `"start": "node backend/server.js"`; `backend/server.js` menggunakan dua pool DB; `docs/architecture.md` menyatakan backend tunggal. Belum dilakukan review dosen/rubrik oleh anggota kelompok.

### CR-03 — Pembaruan buku dan transaksi pinjaman bukan satu transaksi ACID lintas database

1. **File/fungsi:** `backend/server.js`, handler `POST /api/loans` dan `POST /api/loans/:id/return`.
2. **Masalah:** Data buku ada di `book_db`, sedangkan pinjaman ada di `loan_db`. Transaksi MySQL hanya membungkus operasi pada koneksi `loanPool`; perubahan status buku dilakukan melalui `bookPool` terpisah. Kode menggunakan kompensasi untuk mencoba mengembalikan status buku bila langkah transaksi gagal.
3. **Dampak:** Bila proses mati atau koneksi gagal pada waktu yang tidak menguntungkan, kompensasi dapat tidak berjalan atau gagal. Status buku dan status pinjaman bisa tidak sinkron dan membutuhkan rekonsiliasi.
4. **Perbaikan/keputusan:** Untuk arsitektur/database terpisah, pertahankan conditional update dan kompensasi sebagai mitigasi awal, catat kegagalan kompensasi, dan sediakan prosedur rekonsiliasi. Sebelum produksi, tambahkan tes integrasi untuk kegagalan pada setiap tahap; pertimbangkan pola saga/outbox hanya jika kompleksitasnya dibutuhkan. Jangan mengklaim transaksi lintas database bersifat atomik.
5. **Status perbaikan:** **Mitigasi ada di kode; risiko arsitektural masih terbuka.**
6. **Bukti verifikasi:** Source berisi `bookReserved`, `bookMadeAvailable`, rollback dan upaya kompensasi; tes source-level memeriksa conditional update/lock. Tidak ada tes kegagalan koneksi atau MySQL end-to-end yang dijalankan.

### CR-04 — Belum ada pembatasan percobaan login/registrasi di level aplikasi

1. **File/fungsi:** `backend/server.js`, route `POST /api/login` dan `POST /api/register`.
2. **Masalah:** Route memvalidasi format input dan menggunakan bcrypt untuk memverifikasi/meng-hash password, tetapi tidak terlihat mekanisme rate limiting, penundaan progresif, atau lockout percobaan login.
3. **Dampak:** Endpoint login dapat menjadi sasaran percobaan password berulang dan endpoint publik registrasi dapat menerima spam. Ini adalah risiko yang terlihat dari cakupan handler, bukan bukti bahwa sistem telah diserang.
4. **Perbaikan/keputusan:** Sebelum deployment publik, tambahkan rate limiting yang sesuai pada login/registrasi di lapisan yang tepat, logging aman untuk percobaan gagal, dan pengujian agar tidak membocorkan apakah username tertentu terdaftar. Hindari menyimpan password/token ke log.
5. **Status perbaikan:** **Belum diperbaiki; perlu keputusan dan implementasi anggota kelompok.**
6. **Bukti verifikasi:** Pembacaan route menunjukkan tidak ada limiter pada handler tersebut. Belum ada pengujian beban/serangan yang dilakukan.

### CR-05 — Satu tes source-level gagal karena pola tes tidak cocok dengan format kontrak API

1. **File/fungsi:** `backend/test/loan-flow-audit.test.js`, tes “kontrak API mencatat endpoint dan status business rule pinjam/kembali”; sumber yang diperiksa `docs/API-CONTRACT.md`.
2. **Masalah:** Tes mencari pola Markdown tertentu (`| POST | ...`) yang tidak cocok dengan cara endpoint dijelaskan dalam dokumen kontrak saat ini. Pada run review, assertion ini gagal walaupun bagian endpoint ada dalam dokumen dengan format lain.
3. **Dampak:** Suite menjadi merah karena assertion dokumentasi yang terlalu rapuh; kegagalan ini tidak dengan sendirinya membuktikan route peminjaman rusak.
4. **Perbaikan/keputusan:** Perbarui assertion agar memeriksa konten aktual yang stabil, atau susun tabel kontrak secara konsisten. Setelah diperbaiki, jalankan kembali semua tes dan catat hasil baru.
5. **Status perbaikan:** **Belum diperbaiki pada review ini.**
6. **Bukti verifikasi:** Perintah `node --test backend/test/source-audit.test.js backend/test/database-auth-audit.test.js backend/test/loan-flow-audit.test.js` pada run terdahulu menghasilkan **13 lulus, 1 gagal**. Pada audit akhir Prompt 9, `npm test` (yang juga memasukkan tes lama di `loan-service/test/`) menghasilkan **18 lulus, 2 gagal**: assertion format kontrak dan tes auth yang tidak dapat memuat `bcryptjs` di environment audit. Tes yang gagal adalah assertion format dokumen pada `backend/test/loan-flow-audit.test.js`; bukan uji HTTP/DB runtime.

## Pemeriksaan yang hasilnya cukup baik berdasarkan source

- **Password:** registrasi memakai `bcrypt.hash(..., 12)` dan login memakai `bcrypt.compare`; respons registrasi/login tidak mengirim `password_hash`.
- **SQL injection dasar:** nilai input utama dikirim melalui placeholder `?` pada query `execute`; tetap lakukan pemeriksaan semua query saat perubahan berikutnya.
- **Validasi input:** username, panjang password, judul/penulis, ID buku, ID pinjaman, JSON body, dan ukuran body memiliki validasi yang terlihat pada kode.
- **Otorisasi riwayat/pengembalian:** riwayat dibandingkan dengan username JWT; pengembalian memeriksa pemilik transaksi dan status.
- **Batas peminjaman/duplikasi:** kode mengunci baris pengguna `FOR UPDATE`, memeriksa jumlah pinjaman aktif di transaksi, dan mengubah status buku secara kondisional. Ini adalah mitigasi yang baik pada source, tetapi belum membuktikan perilaku saat beban bersamaan tanpa tes integrasi.
- **Secret:** `JWT_SECRET` diperiksa saat startup dengan panjang minimal 32 byte; `.env` asli tidak dimasukkan ke paket. Pastikan nilai rahasia tetap tidak dibagikan.

## Tes dan bukti

| Pemeriksaan | Hasil pada review ini | Catatan |
|---|---|---|
| `node --test backend/test/source-audit.test.js backend/test/database-auth-audit.test.js backend/test/loan-flow-audit.test.js` | **FAIL: 13 lulus, 1 gagal** | Assertion format dokumen pada `loan-flow-audit.test.js` tidak cocok dengan format `API-CONTRACT.md`. |
| Tes regresi pinjam/kembali source-level yang dijalankan di atas | Sebagian lulus | Assertion lock, conditional status update, durasi 7 hari, dan ownership terlihat lulus; satu assertion kontrak gagal. |
| `node --check backend/server.js` | Belum dijalankan sebagai bagian run khusus log ini | Jalankan ulang sebelum pengumpulan. |
| Integrasi HTTP dengan MySQL aktif | **BELUM DIUJI** | Perlu MySQL, dependency lengkap, dan backend berjalan. |
| Uji race condition dua request bersamaan | **BELUM DIUJI** | Tes source-level bukan simulasi konkurensi runtime. |
| Review manusia oleh anggota kelompok | **[PERLU DIISI OLEH ANGGOTA KELOMPOK]** | Catat nama/tanggal/hasil hanya setelah benar-benar dilakukan. |

## Tindak lanjut sebelum pengumpulan UTS

- [ ] Anggota kelompok meninjau CR-01 sampai CR-05 dan mengisi keputusan.
- [ ] Perbaiki atau hapus route `PATCH /api/books` tanpa ID.
- [ ] Pastikan arsitektur yang dinilai dosen sesuai dengan jalur runtime yang dijalankan.
- [ ] Perbaiki assertion tes kontrak yang gagal, kemudian jalankan suite ulang.
- [ ] Jalankan tes Postman dan MySQL end-to-end; simpan bukti asli tanpa secret.
- [ ] Catat hasil review manusia pada bagian yang disediakan; jangan menandai selesai sebelum dilakukan.


## Tindak lanjut Prompt 2 — konsolidasi backend/database

- **CR-01 (PATCH /api/books tanpa ID): DIPERBAIKI pada backend utama.** Route PATCH sekarang hanya menerima `/api/books/:id/status`; `PATCH /api/books` tidak lagi masuk handler status. Runtime HTTP masih perlu diuji.
- **CR-02 (backend tunggal vs service legacy): DIJELASKAN.** `npm start` tetap hanya menjalankan `backend/server.js`. Folder service lama dipertahankan untuk referensi/pemulihan dan tidak dipanggil backend utama. Root `npm test` hanya menjalankan tes source backend utama; tes legacy tidak dihitung sebagai tes runtime aktif.
- **CR-03 (data lintas dua database): DESAIN DIPERBAIKI DI SOURCE.** Backend utama menggunakan satu pool/database `DB_NAME`; pinjam/kembali mengubah buku dan transaksi pada transaksi MySQL yang sama. Ini belum dibuktikan dengan server MySQL aktif.
- **Migrasi data lama:** `backend/migrate.js` membaca database sumber `LEGACY_BOOK_DB_NAME` dan `LEGACY_LOAN_DB_NAME`, membuat schema target, dan menyalin data dengan `INSERT IGNORE`. Database sumber tidak diubah. Konflik ID/username dapat menyebabkan baris dilewati dan wajib diperiksa dari log; lakukan backup sebelum migrasi.
- **Verifikasi Prompt 2:** `npm run check` lulus; `npm test` source-level lulus 14/14. `npm ci` pada lingkungan audit berakhir karena transport timeout; `node_modules` tidak tersedia saat pengujian, sehingga aplikasi tidak dapat dijalankan untuk uji HTTP/MySQL di sini. Postman belum dijalankan.


## Code review Prompt 4 — pemeriksaan source aktual (20 Oktober 2026)

Pemeriksaan ini dilakukan pada `backend/server.js`, `backend/migrate.js`, `package.json`, `api-test/collection.json`, `api-test/environment.json`, serta dokumentasi. Temuan berikut dibedakan antara kondisi yang terlihat di source dan hasil runtime yang belum diuji.

### CR-P4-01 — Root route mendahulukan file frontend daripada JSON index
- **Lokasi:** `backend/server.js`, urutan `serveFrontend(req, res, pathname)` sebelum handler `GET /` JSON.
- **Masalah:** untuk `GET /`, `serveFrontend` mengembalikan `true` jika membaca `frontend/index.html`, sehingga handler JSON root berikutnya tidak pernah berjalan.
- **Dampak:** root URL menampilkan frontend, bukan JSON daftar endpoint. Ini bukan defect bila root memang dimaksudkan sebagai halaman web, tetapi dokumentasi harus menjelaskan perilaku aktual.
- **Tindakan:** README/API Contract menjelaskan bahwa `/` menyajikan frontend; health check resmi adalah `/health`.
- **Status:** didokumentasikan; runtime HTTP belum diverifikasi.

### CR-P4-02 — Akun admin tidak dapat dibuat melalui registrasi publik
- **Lokasi:** `backend/server.js`, `POST /api/register` insert hanya `username` dan `password_hash`; `POST /api/books` mensyaratkan `user.role === 'admin'`; `backend/migrate.js` default role `user`.
- **Masalah:** tidak ada endpoint role promotion/admin bootstrap pada backend utama.
- **Dampak:** endpoint tambah buku tidak dapat digunakan oleh akun registrasi biasa; perlu prosedur lokal yang aman jika demonstrasi fitur ini termasuk rubrik.
- **Tindakan:** README dan API Contract menjelaskan tidak ada akun admin/password bawaan dan tidak menyarankan membuka registrasi role admin.
- **Status:** risiko operasional didokumentasikan, belum ada fitur admin baru ditambahkan. Runtime belum diuji.

### CR-P4-03 — Batas keamanan CORS masih permisif
- **Lokasi:** `backend/server.js`, `corsHeaders` menetapkan `Access-Control-Allow-Origin: *`.
- **Masalah:** semua origin browser diizinkan mengirim request; autentikasi tetap diperlukan oleh route, tetapi kebijakan origin tidak dibatasi.
- **Dampak:** deployment publik memiliki konfigurasi lintas-origin yang lebih luas daripada yang dibutuhkan untuk frontend same-origin.
- **Tindakan:** dicatat sebagai risiko residual; tidak diubah pada tahap sinkronisasi dokumentasi karena tujuan tahap ini adalah audit dan konsistensi, bukan perubahan runtime yang tidak diuji.
- **Status:** belum diperbaiki; runtime security testing NOT TESTED.

### CR-P4-04 — Validasi JSON body mengembalikan pesan generik
- **Lokasi:** `backend/server.js`, outer `catch` memetakan error dengan `error.status` ke pesan `Body JSON tidak valid.` kecuali 413.
- **Masalah:** error bertanda status selain 413 akan diberi pesan JSON tidak valid; saat ini `readBody` menggunakan 400/413, sehingga tidak terlihat bug pada jalur yang ada tetapi mapping bergantung pada implementasi helper.
- **Dampak:** bila helper di masa depan menambahkan status lain, pesan error bisa tidak sesuai.
- **Tindakan:** dicatat sebagai risiko maintainability; tidak diubah tanpa tes runtime.
- **Status:** risiko residual; tidak ada uji HTTP malformed-body pada environment ini.

### Pemeriksaan perubahan dokumentasi dan Postman
- Collection memakai base URL `{{baseUrl}}`, token JWT dan API Key sebagai variabel lokal; environment template tidak memuat nilai rahasia.
- Route yang disertakan cocok dengan route aktif `backend/server.js`, termasuk `POST /api/loans/:id/return` dan `PATCH /api/books/:id/status`.
- Skenario limit 3, unavailable book, due date +7×24 jam, dan status setelah pinjam/kembali memiliki assertion dan prasyarat. Skenario tersebut belum dieksekusi; tidak boleh dilabeli PASS.
- `npm test` PASS 24/24 source-level, `npm run check` PASS, `node --check frontend/script.js` PASS. Dependency runtime hilang, `.env` tidak ada, dan `mysql` CLI tidak ditemukan, sehingga HTTP/MySQL/Postman tetap NOT TESTED.
