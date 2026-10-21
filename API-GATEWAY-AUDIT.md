# API Gateway security audit

Gateway publik menggunakan `GATEWAY_PORT` (default `4000`; `PORT` tetap didukung sebagai fallback saat service dijalankan individual). URL service internal dikonfigurasi dengan `BOOK_SERVICE_HOST`, `BOOK_SERVICE_PORT`, `LOAN_SERVICE_HOST`, dan `LOAN_SERVICE_PORT`. `API_KEY` adalah kredensial untuk klien tepercaya/operator dan `JWT_SECRET` dipakai Gateway untuk memverifikasi JWT; keduanya wajib di environment, bukan di frontend.

| Method | Path publik | Service | API Key | JWT pengguna | Role |
|---|---|---|---|---|---|
| POST | `/api/register` | Loan Service | Tidak | Tidak | Publik; role default user |
| POST | `/api/login` | Loan Service | Tidak | Tidak | Publik; kredensial diverifikasi Loan Service |
| GET | `/api/books` | Book Service | API Key atau JWT | Salah satu | Pengguna terautentikasi atau klien tepercaya |
| GET | `/api/books/:id` | Book Service | API Key atau JWT | Salah satu | Pengguna terautentikasi atau klien tepercaya |
| POST | `/api/books` | Book Service | Tidak cukup sendiri | Ya | `admin` saja |
| PATCH | `/api/books/:id/status` | Book Service | Ya | Tidak menggantikan API Key | Klien tepercaya/operator; API Key Gateway |
| POST | `/api/loans` | Loan Service | Tidak cukup sendiri | Ya | Pengguna login; Loan Service mengambil username dari JWT |
| GET | `/api/loans/:username` | Loan Service | Tidak cukup sendiri | Ya | Pemilik transaksi; Loan Service memeriksa kecocokan username |
| POST | `/api/loans/:id/return` | Loan Service | Tidak cukup sendiri | Ya | Pemilik transaksi; Loan Service memeriksa kepemilikan |

Gateway hanya melakukan routing dan pemeriksaan credential/role untuk batas akses; aturan transaksi, validasi buku, kepemilikan pinjaman, dan persistensi tetap pada service pemiliknya. Query string, method, body, dan header relevan (`Content-Type`, `Accept`, `Authorization`, header cache kondisional) diteruskan. `X-API-Key` diverifikasi di Gateway dan sengaja tidak diteruskan ke service internal. Response status/body service diteruskan, dengan hanya header response terpilih. Error koneksi internal disanitasi menjadi 502/504.

## Tes yang dijalankan

Jalankan `node --test api-gateway/test/security-audit.test.js` untuk pemeriksaan regresi kebijakan pada source Gateway. Tes ini bukan pengganti pengujian integrasi dengan service dan database aktif.
