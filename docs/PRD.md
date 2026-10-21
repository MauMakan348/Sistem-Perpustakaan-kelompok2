# Product Requirements Document (PRD)
## Sistem Peminjaman Buku Perpustakaan

| Informasi | Keterangan |
|---|---|
| Nama proyek | Sistem Peminjaman Buku Perpustakaan |
| Versi | 1.0 |
| Tanggal draf | 18 Oktober 2026 |
| Repository | https://github.com/MauMakan348/Sistem-Perpustakaan-kelompok2 |
| Status dokumen | Draf kerja; wajib dicocokkan dengan kode dan hasil pengujian aktual sebelum dikumpulkan |

### Anggota Kelompok

| No. | Nama | NIM |
|---:|---|---|
| 1 | Sri Maharani | 2441919028 |
| 2 | Shandy Aulia | 2441919027 |
| 3 | Putra Aji Pratama | 2441919011 |
| 4 | Muhammad Lutfi Rivani | 2441919037 |
| 5 | Lia Saripah | 2441919012 |

## 1. Ringkasan

Sistem Peminjaman Buku Perpustakaan adalah backend API untuk membantu mahasiswa melakukan autentikasi, melihat katalog dan status ketersediaan buku, serta mengelola peminjaman dan pengembalian buku. Sistem dirancang untuk menyimpan data pengguna, buku, dan transaksi pada database MySQL serta menyediakan endpoint HTTP/JSON yang dapat diuji menggunakan Postman.

Draf repository yang menjadi dasar PRD ini menggunakan API Gateway dan dua service. Struktur akhir harus diperiksa dan disesuaikan dengan ketentuan UTS yang meminta satu backend service utama.

## 2. Tujuan

1. Menghubungkan data pengguna, buku, dan transaksi dengan database relasional MySQL.
2. Menyediakan endpoint untuk registrasi/login, daftar dan detail buku, membuat peminjaman, melihat peminjaman, serta pengembalian buku.
3. Menerapkan batas maksimal tiga peminjaman aktif untuk setiap mahasiswa.
4. Menetapkan tanggal jatuh tempo tujuh hari setelah tanggal peminjaman dan memperbarui status ketersediaan buku.
5. Mendokumentasikan API serta menguji skenario berhasil dan gagal menggunakan Postman atau alat sejenis.

## 3. Pengguna dan Peran

| Peran | Kemampuan |
|---|---|
| Mahasiswa | Registrasi/login, melihat daftar dan detail buku, melihat peminjaman aktif miliknya, meminjam buku yang tersedia, serta mengembalikan buku miliknya. |
| Pengembang/penguji | Menyiapkan database, menjalankan backend, memeriksa log, menguji endpoint, dan meninjau kode. |

## 4. Ruang Lingkup

### 4.1 Termasuk dalam ruang lingkup (in scope)

- Registrasi dan login pengguna.
- Penyimpanan password dalam bentuk hash.
- Daftar buku dan detail buku beserta status ketersediaannya.
- Peminjaman dan pengembalian buku.
- Penyimpanan data pada database relasional MySQL.
- Validasi maksimal tiga buku aktif dan jatuh tempo tujuh hari.
- API Contract, pengujian API melalui Postman, dan README.

### 4.2 Di luar ruang lingkup (out of scope)

- Pembuatan frontend baru yang kompleks; pengujian API dapat dilakukan menggunakan Postman.
- Menjalankan banyak server atau port sebagai arsitektur akhir; ketentuan UTS meminta satu backend service utama.
- Fitur besar di luar kebutuhan UTS, seperti denda dan notifikasi, kecuali diminta secara terpisah.

## 5. Technology Stack

| Komponen | Pilihan | Alasan |
|---|---|---|
| Backend | Node.js native HTTP | Stack yang tercantum pada draf proyek. |
| Database | MySQL | Database relasional yang telah digunakan oleh service dalam repository. |
| Format API | HTTP/JSON | Sesuai ketentuan UTS. |
| Pengujian API | Postman | Alat pengujian yang digunakan dalam perkuliahan. |
| AI assistant | ChatGPT | Membantu menyusun requirement, membuat/meninjau kode, dan menyusun kasus uji; hasilnya harus diverifikasi manusia. |

> Catatan: kecocokan stack dan implementasi aktual perlu diperiksa kembali pada repository.

## 6. Kebutuhan Fungsional

### FR-01 — Registrasi

Pengguna dapat membuat akun menggunakan username dan password.

**Kriteria penerimaan:**
- Username wajib unik.
- Password disimpan sebagai hash, bukan teks biasa.
- Data akun tersimpan di database.
- Registrasi dengan username duplikat ditolak dengan pesan yang jelas.

### FR-02 — Login

Pengguna dapat login menggunakan username dan password.

**Kriteria penerimaan:**
- Kredensial yang benar menghasilkan token JWT jika mekanisme JWT digunakan pada implementasi.
- Kredensial yang salah ditolak dengan status HTTP 401.
- Password hash tidak dikirim dalam response.

### FR-03 — Daftar buku

Client dapat meminta daftar buku.

**Kriteria penerimaan:**
- Response berformat JSON.
- Data mencakup ID, judul, penulis jika tersedia, dan status buku.

### FR-04 — Detail buku

Client dapat meminta satu buku berdasarkan ID.

**Kriteria penerimaan:**
- ID yang tersedia menghasilkan detail buku.
- ID yang tidak ditemukan menghasilkan status HTTP 404.

### FR-05 — Membuat peminjaman

Mahasiswa dapat meminjam buku yang tersedia.

**Kriteria penerimaan:**
- Transaksi peminjaman tersimpan di database.
- Tanggal peminjaman tercatat.
- Jatuh tempo ditetapkan tujuh hari setelah tanggal peminjaman.
- Status buku berubah menjadi dipinjam/tidak tersedia.

### FR-06 — Validasi peminjaman

Sistem menolak peminjaman buku yang tidak tersedia atau peminjaman aktif keempat oleh mahasiswa yang sama.

**Kriteria penerimaan:**
- Request ditolak dengan status HTTP dan pesan kesalahan yang jelas.
- Penolakan tidak membuat transaksi peminjaman baru.
- Data buku dan transaksi tetap konsisten.

### FR-07 — Daftar peminjaman

Mahasiswa dapat melihat peminjaman aktif miliknya.

**Kriteria penerimaan:**
- Hanya transaksi milik pengguna yang terautentikasi yang ditampilkan.

### FR-08 — Pengembalian

Mahasiswa dapat mengembalikan buku yang sedang dipinjamnya.

**Kriteria penerimaan:**
- Transaksi ditandai selesai/dikembalikan.
- Status buku berubah menjadi tersedia.
- Pengguna tidak dapat mengembalikan transaksi milik orang lain atau transaksi yang sudah dikembalikan.

## 7. Business Rule

| ID | Aturan bisnis |
|---|---|
| BR-01 | Satu mahasiswa maksimal memiliki tiga peminjaman aktif yang belum dikembalikan. |
| BR-02 | Buku yang berstatus dipinjam/tidak tersedia tidak dapat dipinjam lagi. |
| BR-03 | Tanggal jatuh tempo = tanggal peminjaman + 7 hari. |
| BR-04 | Setelah buku dipinjam, status buku berubah menjadi tidak tersedia. |
| BR-05 | Setelah buku dikembalikan, status buku berubah menjadi tersedia. |
| BR-06 | Pengguna hanya dapat melihat dan mengembalikan transaksi miliknya sendiri. |
| BR-07 | Endpoint yang memerlukan autentikasi hanya boleh diakses dengan kredensial/token yang valid sesuai mekanisme aplikasi. |

## 8. Model Data

Nama tabel dan kolom berikut mengikuti draf dan harus dicocokkan dengan schema aktual.

| Tabel | Kolom utama | Relasi/catatan |
|---|---|---|
| `users` | `id` (PK), `username` (unik), `password_hash`, `created_at` | Satu pengguna dapat memiliki banyak transaksi peminjaman. |
| `books` | `id` (PK), `title`, `author`, `status` | Status minimal: tersedia atau dipinjam. |
| `loans` / `borrowings` | `id` (PK), `username`/`user_id`, `book_id`, `book_title` (opsional), `borrow_date`, `due_date`, `return_date`, `status` | Mengacu pada pengguna dan buku. Nama tabel serta kolom final mengikuti schema aktual. |

Jika data tetap berada pada database terpisah, relasi antardatabase bersifat logis dan perlu divalidasi melalui API. Struktur akhir harus mendukung seluruh business rule dan endpoint.

## 9. Rancangan API Endpoint

Daftar berikut merupakan rancangan berdasarkan draf proyek, bukan jaminan bahwa semua endpoint telah tersedia atau lulus pengujian. Path final harus dicocokkan dengan route dan handler aktual.

| Layanan/logika | Method | Endpoint | Fungsi | Autentikasi |
|---|---|---|---|---|
| Auth | `POST` | `/api/register` | Registrasi pengguna | Tidak |
| Auth | `POST` | `/api/login` | Login dan memperoleh JWT jika diterapkan | Tidak |
| Books | `GET` | `/api/books` | Daftar buku | Periksa konfigurasi aktual; API Key jika Gateway dipertahankan |
| Books | `GET` | `/api/books/:id` | Detail buku | Periksa konfigurasi aktual; API Key jika Gateway dipertahankan |
| Loans | `POST` | `/api/loans` | Membuat peminjaman | JWT pengguna dan mekanisme internal yang berlaku |
| Loans | `GET` | `/api/loans/:username` | Melihat peminjaman aktif | Harus dibatasi agar pengguna hanya melihat datanya sendiri |
| Books | `PATCH` | `/api/books/:id/status` | Mengubah status buku | Internal/administratif; tidak boleh terbuka bebas untuk mahasiswa |
| Loans | `PUT`/`PATCH` | `/api/loans/:id/return` | Mengembalikan buku | JWT pengguna; keberadaan dan perilaku endpoint harus diverifikasi |

Setiap endpoint harus didokumentasikan lebih lengkap pada `docs/API-CONTRACT.md`, termasuk base URL, header, parameter, request body, contoh response JSON, status HTTP, validasi, business rule, serta kasus berhasil dan gagal.

## 10. Rencana Pengujian API

Status di bawah ini adalah status dalam draf sumber. Karena dokumen ini harus dicocokkan kembali dengan hasil pengujian aktual, status tersebut **tidak dianggap sebagai bukti pengujian yang terverifikasi** sebelum diperiksa ulang.

| ID | Skenario | Hasil yang diharapkan | Status untuk finalisasi |
|---|---|---|---|
| T-01 | Registrasi username baru | Akun dibuat dan password tersimpan sebagai hash | Perlu diverifikasi |
| T-02 | Registrasi username duplikat | Registrasi ditolak dengan pesan validasi | Perlu diverifikasi |
| T-03 | Login dengan akun valid | Token JWT diterima jika JWT digunakan | Perlu diverifikasi |
| T-04 | Login dengan password salah | HTTP 401 Unauthorized | Perlu diverifikasi |
| T-05 | Daftar buku | HTTP 200 dan JSON berisi daftar buku | Perlu diverifikasi |
| T-06 | Detail buku tidak ditemukan | HTTP 404 Not Found | Perlu diverifikasi |
| T-07 | Meminjam buku tersedia | Transaksi tersimpan, jatuh tempo +7 hari, status buku diperbarui | Perlu diverifikasi |
| T-08 | Meminjam buku yang sedang dipinjam | Request ditolak dan tidak ada transaksi tambahan | Perlu diverifikasi |
| T-09 | Meminjam buku keempat ketika sudah memiliki 3 buku aktif | Request ditolak sesuai BR-01 | Perlu diverifikasi |
| T-10 | Mengembalikan buku | Transaksi selesai dan status buku tersedia | Perlu diverifikasi |
| T-11 | API Key salah/tidak dikirim | Route yang dilindungi ditolak jika API Key masih digunakan | Perlu diverifikasi |
| T-12 | Service yang diperlukan tidak tersedia | Respons gagal ditangani dengan benar; misalnya 502 jika Gateway dipertahankan | Perlu diverifikasi |

Bukti pengujian berupa Postman Collection dan/atau screenshot hasil aktual disimpan di `api-test/`. Jangan menyatakan skenario lulus jika belum dijalankan.

## 11. Rencana Penggunaan AI

Alur kerja: **Requirement/Context → Prompt → Output AI → Review manusia → Testing → Iterasi**.

| No. | Pekerjaan | Context untuk AI | Lokasi prompt/catatan | Review manusia |
|---:|---|---|---|---|
| 1 | Menyusun/meninjau schema database | Instruksi UTS, schema SQL, business rule | `docs/prompts.md` (jika digunakan) | Periksa kolom, tipe data, constraint, dan hasil migration sebelum digunakan. |
| 2 | Membuat/meninjau endpoint peminjaman | File backend, API Contract, aturan peminjaman | `docs/prompts.md` (jika digunakan) | Jalankan skenario berhasil dan gagal melalui Postman. |
| 3 | Menyusun dokumentasi dan kasus uji | README, endpoint, contoh response, hasil Postman | Catatan prompt proyek | Bandingkan setiap endpoint dengan kode dan hasil request aktual. |

Nama AI assistant yang dicantumkan pada draf adalah ChatGPT. Kelompok perlu menyimpan prompt penting yang benar-benar digunakan serta mencatat hasil review manusia secara jujur.

## 12. Rencana Implementasi

Pembagian tugas berikut disalin dari draf kerja dan perlu dikonfirmasi kembali oleh anggota kelompok. Status selesai tidak menggantikan bukti pemeriksaan.

| No. | Tugas | Penanggung jawab | Target hari | Status pada draf |
|---:|---|---|---|---|
| 1 | Mencocokkan requirement UTS dengan repository dan menyepakati arsitektur akhir | Seluruh anggota | 1 | Belum |
| 2 | Memeriksa database MySQL, schema, migration, dan data awal | Muhammad Lutfi Rivani | 2–3 | Selesai pada draf; verifikasi ulang |
| 3 | Memastikan registrasi/login, daftar/detail buku, dan peminjaman berfungsi | Shandy Aulia | 4–5 | Selesai pada draf; verifikasi ulang |
| 4 | Memastikan endpoint pengembalian tersedia dan memperbarui status buku | Putra Aji Pratama | 6–7 | Selesai pada draf; verifikasi ulang |
| 5 | Menyelesaikan API Contract dan README sesuai implementasi aktual | Lia Saripah | 8–9 | Selesai pada draf; verifikasi ulang |
| 6 | Menjalankan pengujian Postman dan menyimpan bukti | Sri Maharani | 10–11 | Selesai pada draf; verifikasi ulang |

Target hari pada draf melebihi durasi UTS tujuh hari yang tercantum pada template. Kelompok perlu menyesuaikan jadwal dengan waktu pengerjaan sebenarnya.

## 13. Definition of Done

Pekerjaan dianggap selesai apabila:

- Semua kriteria penerimaan telah dipenuhi dan diverifikasi.
- Endpoint diuji melalui Postman untuk kondisi berhasil dan gagal.
- Aturan maksimal tiga buku aktif dan jatuh tempo tujuh hari terbukti berjalan.
- Status buku berubah dengan benar saat dipinjam dan dikembalikan.
- Kode hasil bantuan AI ditinjau oleh anggota kelompok dan keputusan review dicatat.
- API Contract, README, collection/screenshot pengujian, dan Code Review Log diperbarui.
- Cara instalasi dan menjalankan backend dapat diikuti dari awal berdasarkan README.

## 14. Risiko dan Pertanyaan Terbuka

| Risiko/pertanyaan | Rencana penanganan |
|---|---|
| Instruksi UTS meminta satu backend service utama, sedangkan repository pada draf menggunakan Gateway dan dua service. | Konfirmasikan interpretasi kepada dosen. Jika diterapkan secara literal, rencanakan penggabungan menjadi satu service dan uji ulang semua endpoint. |
| Daftar endpoint pada README mungkin belum mencakup endpoint pengembalian. | Periksa route dan handler aktual, implementasikan bila diperlukan, lalu perbarui API Contract dan pengujian. |
| Nama tabel transaksi dapat berupa `loans` atau `borrowings`. | Tetapkan berdasarkan schema aktual dan gunakan secara konsisten dalam kode serta dokumentasi. |
| Status pengujian pada draf belum tentu mencerminkan kondisi kode terkini. | Jalankan ulang semua skenario dan simpan bukti aktual. |
| Struktur database mungkin masih terpisah antarservice. | Pastikan desain akhir memenuhi kebutuhan integrasi dan aturan bisnis UTS. |
| Informasi anggota, pembagian tugas, dan catatan review perlu dikonfirmasi. | Minta persetujuan seluruh anggota sebelum dokumen final dikumpulkan. |

## 15. Kriteria Kepatuhan terhadap UTS

Sebelum dikumpulkan, pastikan:

- [ ] Project merupakan kelanjutan dari project sebelumnya.
- [ ] Backend utama dapat dijalankan dengan instruksi yang jelas dan sesuai ketentuan satu service utama.
- [ ] API menggunakan HTTP/JSON.
- [ ] Database relasional terhubung dan menyimpan data.
- [ ] Registrasi/login, daftar/detail buku, peminjaman, dan pengembalian tersedia sesuai kebutuhan.
- [ ] Aturan maksimal tiga buku aktif, jatuh tempo tujuh hari, dan penolakan buku tidak tersedia diterapkan.
- [ ] `docs/API-CONTRACT.md` sesuai dengan endpoint aktual.
- [ ] Bukti pengujian aktual disimpan di `api-test/`.
- [ ] `docs/CODE_REVIEW_LOG.md` berisi minimal tiga temuan review nyata.
- [ ] Prompt penting penggunaan AI disimpan.
- [ ] README menjelaskan instalasi, konfigurasi database, menjalankan backend, base URL, pengujian, dan data uji.
- [ ] Semua anggota memahami alur aplikasi dan dapat menjelaskan hasil kerja kelompok.

---
