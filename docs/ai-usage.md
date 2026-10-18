# Dokumentasi Penggunaan AI Coding Tool

## 1. Tool dan ruang lingkup

ChatGPT digunakan sebagai AI Coding Tool untuk membantu analisis requirement, perencanaan perubahan, penyusunan dan review kode, penyusunan skenario Postman, serta pembaruan dokumentasi. Output AI diperlakukan sebagai usulan yang perlu dibandingkan dengan implementasi, bukan sebagai bukti otomatis bahwa fitur berjalan.

## 2. Bagian yang dibantu

- Analisis Acceptance Criteria terkait tombol peminjaman dan batas maksimal tiga pinjaman aktif.
- Perencanaan konversi project HTML yang sudah ada menjadi microservice Node.js.
- Migrasi persistence dari JSON ke PostgreSQL pada tahap antara, kemudian perubahan requirement/migrasi ke MySQL.
- Pemisahan ownership database: Book Service mengelola `book_db`, Loan Service mengelola `loan_db`.
- Implementasi API Gateway, routing HTTP, API Key, JWT, registrasi/login, penambahan buku, peminjaman dan pengembalian.
- Penyesuaian frontend agar memakai Gateway, serta pembuatan/penyesuaian Postman Collection.
- Pemeriksaan keamanan Gateway, syntax check, tes source-level regresi, dan dokumentasi.

## 3. Pemeriksaan manusia

Hal yang harus diperiksa developer sebelum menggabungkan perubahan:

- apakah route, method, body, response, dan aturan akses sesuai dengan source code aktual;
- apakah service hanya mengakses database miliknya;
- apakah secret tidak dimasukkan ke frontend, collection publik, atau repository;
- apakah migration menjaga data lama dan menambah kolom yang dibutuhkan;
- apakah alur lintas-service memiliki penanganan kegagalan dan kompensasi;
- apakah dokumentasi membedakan skenario yang direncanakan dari tes yang benar-benar dieksekusi.

## 4. Ketidaksesuaian yang ditemukan dan perbaikannya

### Dokumentasi dan collection tidak selalu sesuai dengan implementasi terbaru

Dokumentasi/collection sebelumnya memuat informasi dari tahap project yang lebih awal, termasuk route yang belum mencakup pengembalian dan asumsi autentikasi yang sudah berubah. Dokumentasi diperbarui berdasarkan route aktual. Collection yang ada dipertahankan, lalu request login, tambah buku, pinjam, dan return diselaraskan dengan aturan JWT/API Key.

### Secret di client

API Key tidak boleh berada pada frontend public. Implementasi akhir memeriksa API Key di Gateway dan tidak meneruskannya ke service internal. Collection menggunakan variable Postman; environment yang dibagikan hanya berisi placeholder kosong untuk `apiKey`, bukan secret nyata.

### Migration kolom pengembalian

Audit menemukan bahwa migration pada versi gabungan perlu menjamin kolom `status` dan `returned_at` tersedia untuk tabel `loans` yang telah dibuat sebelumnya. Migration diperbaiki untuk menambah kolom yang belum ada tanpa menghapus baris lama.

### Race condition pada status buku

Audit menemukan bahwa memeriksa status buku lalu memperbaruinya dalam dua langkah dapat memungkinkan dua request meminjam buku yang sama. Book Service diperbaiki agar update status hanya berhasil jika status saat ini sesuai dengan status asal yang diharapkan; request yang kalah menerima `409`. Loan Service melakukan reservasi status sebelum insert transaksi dan mencoba kompensasi bila insert gagal.

### Dependency dan verifikasi runtime

Tes autentikasi Loan Service tidak berhasil dijalankan pada environment audit karena modul `bcryptjs` tidak tersedia. Percobaan instalasi dependency timeout. Karena itu tes tersebut dicatat sebagai gagal/terhambat, bukan lulus. Tes MySQL end-to-end juga belum dilakukan di environment audit karena service dan database aktif tidak tersedia.

## 5. Hasil pengujian yang benar-benar tercatat

Pada patch audit terakhir:

| Pemeriksaan | Hasil |
|---|---|
| `node --check` pada Book Service, Loan Service, migration, dan script frontend | Lulus |
| `node --test /tmp/perpus-audit/loan-service/test/regression-audit.test.js` | 4 lulus, 0 gagal; tes memeriksa pola source, bukan simulasi DB/concurrency runtime |
| `node --test /tmp/perpus-audit/api-gateway/test/security-audit.test.js` | 6 lulus, 0 gagal |
| `node --test /tmp/perpus-audit/loan-service/test/auth.test.js` | Gagal dijalankan karena `Cannot find module 'bcryptjs'` |
| `npm install --ignore-scripts --no-audit --no-fund` pada Loan Service | Timeout; dependency tidak berhasil disiapkan pada percobaan itu |
| End-to-end dengan MySQL aktif | Belum dijalankan |

Hasil ini tidak membuktikan seluruh fitur lulus pengujian runtime. Tes source-level membantu memeriksa struktur kode, tetapi tidak menggantikan tes integrasi dengan Node.js dependency lengkap, tiga service hidup, dan MySQL.

## 6. Prinsip penggunaan AI

AI membantu mempercepat analisis dan penyusunan perubahan. Developer tetap bertanggung jawab memastikan hasil sesuai source code aktual, menjalankan tes yang tersedia, melaporkan tes yang gagal/terhambat, dan tidak mengklaim fitur sudah tervalidasi jika pengujian runtime belum dilakukan.

## 7. Perubahan untuk satu perintah startup

Untuk memenuhi kebutuhan menjalankan backend dari root dengan `npm start`, ditambahkan `scripts/start-all.js`. Runner menyalakan Book Service dan Loan Service sebagai child process, menunggu port tersedia, kemudian memulai API Gateway. Ini pendekatan process runner setara dengan script multi-service; kode tetap terpisah dan tidak menjadi monolith. Runner memberi prefix pada log, menghentikan proses yang telah dijalankan jika startup gagal, dan menangani Ctrl+C/SIGTERM.

Environment utama dibaca dari `.env` root dan diwariskan ke child process. Karena semua proses mewarisi environment yang sama, konfigurasi database dipisah menjadi `BOOK_DB_NAME` dan `LOAN_DB_NAME`, dan port layanan menggunakan `GATEWAY_PORT`, `BOOK_PORT`, serta `LOAN_PORT`. File `.env.example` hanya berisi placeholder.

## 8. Pemeriksaan tambahan

Saat meninjau migration buku, ditemukan upsert data seed sebelumnya ikut memperbarui kolom status. Menjalankan migration kembali dapat mengembalikan status buku yang sedang dipinjam ke nilai awal dari JSON. Upsert diperbaiki agar pada ID yang sudah ada hanya memperbarui judul dan penulis, sementara status ketersediaan yang aktif dipertahankan. Satu tes source-level regresi ditambahkan untuk aturan tersebut.

Pemeriksaan terbaru pada paket final: `npm run check` lulus; tes source-level Gateway dan regresi lulus 11/11. Instalasi dependency root dicoba tetapi timeout karena registry package tidak terjangkau pada lingkungan pembuatan, sehingga tes hashing/JWT yang memerlukan `bcryptjs` belum dapat dijalankan di lingkungan ini. MySQL end-to-end dan lifecycle runner dengan seluruh service hidup juga belum dijalankan; keduanya tetap perlu diverifikasi setelah `npm install` dan MySQL tersedia.
