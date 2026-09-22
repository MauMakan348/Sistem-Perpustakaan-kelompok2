# Sistem Peminjaman Buku Perpustakaan — Microservice

Pengembangan dari proyek Praktikum RE dengan AI (aplikasi single-page dengan localStorage)
menjadi arsitektur **microservice** dengan 2 service yang berkomunikasi lewat REST API.

## Anggota Kelompok
- Shandy Aulia (2441919027)
- Sri maharani (2441919028)
- Putra Aji Pratama (2441919011).
- Muhammad Lutfi Rivani (2441919037)
- Lia Saripah (2441919012).


## Arsitektur

```
┌─────────────┐        HTTP/JSON        ┌──────────────┐        HTTP/JSON        ┌───────────────┐
│  Frontend   │ ──────────────────────▶│ Loan Service │ ──────────────────────▶│ Book Service  │
│ (HTML/JS)   │◀────────────────────── │  (port 4002) │◀────────────────────── │  (port 4001)  │
└─────────────┘                         └──────────────┘                         └───────────────┘
                                          - login                                  - daftar buku
                                          - pinjam buku                            - status ketersediaan
                                          - cek limit 3 buku aktif                 - update status buku
                                          - hitung jatuh tempo (7 hari)
```

Lihat penjelasan lebih detail di [`docs/architecture.md`](docs/architecture.md).

## Technology yang Digunakan
| Bagian | Teknologi | Keterangan |
|---|---|---|
| Book Service | Node.js (modul `http`, `fs` bawaan) | Tanpa framework/dependency eksternal |
| Loan Service | Node.js (modul `http`, `fs` bawaan) | Memanggil Book Service via `http.request` |
| Penyimpanan data | File JSON per service | `books.json`, `loans.json` |
| Frontend | HTML5, CSS3, Vanilla JavaScript | Memanggil kedua service via `fetch()` |
| AI Coding Tool | Claude (Anthropic) | Lihat [`docs/ai-usage.md`](docs/ai-usage.md) |

> Sengaja tidak memakai Express/Axios agar proyek bisa langsung dijalankan dengan
> `node server.js` tanpa proses `npm install`, menghindari kendala saat demo.

## Struktur Folder
```
perpustakaan-microservice/
├── book-service/
│   ├── server.js
│   ├── books.json
│   └── package.json
├── loan-service/
│   ├── server.js
│   ├── loans.json
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── docs/
│   ├── architecture.md
│   ├── ai-usage.md
│   └── prompts.md
└── README.md
```

## Cara Menjalankan

**1. Jalankan Book Service** (terminal 1):
```bash
cd book-service
node server.js
```
Akan berjalan di `http://localhost:4001`

**2. Jalankan Loan Service** (terminal 2, biarkan Book Service tetap jalan):
```bash
cd loan-service
node server.js
```
Akan berjalan di `http://localhost:4002`

**3. Buka Frontend**
Buka file `frontend/index.html` langsung di browser (double click), atau jalankan
live server sederhana:
```bash
cd frontend
npx serve .
```

## API Endpoints

### Book Service (`:4001`)
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/books` | Daftar semua buku |
| GET | `/books/:id` | Detail satu buku |
| PATCH | `/books/:id/status` | Ubah status (`tersedia`/`dipinjam`) |

### Loan Service (`:4002`)
| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/login` | Login (body: `{ "username": "..." }`) |
| GET | `/loans/:username` | Daftar peminjaman aktif mahasiswa |
| POST | `/loans` | Pinjam buku (body: `{ "username", "bookId" }`) |

## Alur Fitur Utama (melibatkan 2 service)
1. Frontend memanggil `POST /loans` ke **Loan Service**.
2. **Loan Service** mengecek jumlah buku aktif mahasiswa (data sendiri)..
3. **Loan Service** memanggil `GET /books/:id` ke **Book Service** untuk memastikan buku tersedia.
4. Jika lolos, Loan Service mencatat peminjaman lalu memanggil `PATCH /books/:id/status`
   ke Book Service untuk mengubah status buku menjadi `dipinjam`.
5. Jika update Book Service gagal, Loan Service melakukan rollback pencatatan peminjaman
   (menjaga konsistensi data antar-service).

## User Story & Acceptance Criteria
Menggunakan ulang User Story dan Acceptance Criteria dari Praktikum RE dengan AI
sebelumnya (US-01, US-02, US-03, AC-01, AC-02, AC-03).
| ID | User Story |
|---|---|
| US-01 | Sebagai mahasiswa, saya ingin meminjam buku informatika dasar sehingga dapat memahami ilmu informatika. |
| US-02 | Sebagai mahasiswa, saya ingin melihat buku sistem informasi yang masih tersedia sehingga saya bisa menetukan buku yang ingin dipinjam. |
| US-03 | Sebagai mahasiswa, saya ingin meminjam buku programming sehingga dapat memahami dan melakukan pemrograman. |

| No | Given / Kondisi | When / Aksi | Then / Hasil |
|---|---|---|---|
| AC-01 | Mahasiswa sudah login dan buku berstatus tersedia	 | Mahasiswa memilih tombol pinjam | Buku berhasil dipinjam dan statusnya berubah menjadi dipinjam |
| AC-02 | Mahasiswa sudah memiliki 3 buku aktif	| Mahasiswa mencoba meminjam buku lain | Peminjaman ditolak oleh sistem |
| AC-03 | Buku berstatus sedang dipinjam mahasiswa lain	| Mahasiswa mencoba meminjam buku tersebut | Peminjaman ditolak oleh sistem |

## Dokumentasi Penggunaan AI Coding Tool
Lihat [`docs/ai-usage.md`](docs/ai-usage.md) dan [`docs/prompts.md`](docs/prompts.md)
untuk penjelasan bagaimana AI digunakan dalam pengembangan, serta masalah yang
ditemukan dan diperbaiki dari hasil AI.
