# Hasil Pengujian API — Prompt 4

Tanggal audit dokumen: 20 Oktober 2026.

## Hasil yang benar-benar dijalankan pada environment penyusunan

| Pemeriksaan | Hasil aktual | Status | Catatan |
|---|---|---|---|
| `npm test` | 24 tes lulus, 0 gagal | PASS | Semua tes adalah tes source/kontrak; bukan HTTP/MySQL integration. |
| `npm run check` | Keluar dengan status 0 | PASS | Pemeriksaan sintaks backend, migrator, dan file service legacy yang tercakup. |
| `node --check frontend/script.js` | Keluar dengan status 0 | PASS | Pemeriksaan sintaks frontend. |
| Parse JSON collection/environment dan package manifests | Seluruh 6 file JSON berhasil diparse | PASS | Pemeriksaan Python `json.load`; ini memvalidasi format JSON, bukan impor/eksekusi Postman. |
| `npm start` dan `GET /health` | Tidak dijalankan | NOT TESTED | Dependency runtime tidak tersedia dan `.env` tidak ada. |
| Migrasi MySQL | Tidak dijalankan | NOT TESTED | `mysql` CLI tidak tersedia dan tidak ada koneksi database aktif. |
| Request Postman | Tidak dijalankan | NOT TESTED | Tidak ada backend/database runtime aktif; tidak ada screenshot aktual. |

## Matriks skenario Postman

Semua skenario berikut berstatus **NOT TESTED** sampai dijalankan pada backend dan database lokal. Assertion yang tertulis dalam collection adalah ekspektasi otomatis, bukan bukti hasil eksekusi.

| ID | Skenario | Hasil yang diharapkan | Hasil aktual | Status | Prasyarat/catatan |
|---|---|---|---|---|---|
| P-00 | Health check | `200`, `status: ok` | Belum dijalankan | NOT TESTED | Backend harus aktif. |
| P-01 | Registrasi pengguna uji | `201`; `409` bila username duplikat | Belum dijalankan | NOT TESTED | Password lokal minimal 8 karakter; username unik. |
| P-02 | Login valid | `200`, token Bearer | Belum dijalankan | NOT TESTED | Akun terdaftar. |
| P-03 | Login password salah | `401` | Belum dijalankan | NOT TESTED | Username ada, password salah. |
| P-04 | Registrasi username invalid | `400` | Belum dijalankan | NOT TESTED | Mengirim username `x`. |
| P-05 | Daftar buku | `200` array | Belum dijalankan | NOT TESTED | JWT valid atau API key valid. |
| P-06 | Detail buku | `200` | Belum dijalankan | NOT TESTED | ID valid. |
| P-07 | Detail buku dengan ID nonnumerik | `400` | Belum dijalankan | NOT TESTED | JWT valid. |
| P-08 | Peminjaman buku tersedia | `201`, status `active`, dueDate tepat +7×24 jam | Belum dijalankan | NOT TESTED | Buku tersedia; pinjaman aktif kurang dari 3. |
| P-09 | Status setelah pinjam | `200`, status `dipinjam` | Belum dijalankan | NOT TESTED | Jalankan setelah P-08. |
| P-10 | Meminjam buku tidak tersedia | `409` | Belum dijalankan | NOT TESTED | ID buku harus berstatus `dipinjam`. |
| P-11 | Peminjaman keempat | `409`, batas 3 aktif | Belum dijalankan | NOT TESTED | Tepat 3 pinjaman aktif dan buku keempat tersedia. |
| P-12 | Riwayat sendiri | `200` array | Belum dijalankan | NOT TESTED | JWT valid. |
| P-13 | Riwayat pengguna lain | `403` | Belum dijalankan | NOT TESTED | Username target berbeda dari pemilik JWT. |
| P-14 | Pengembalian transaksi sendiri | `200`, status `returned` | Belum dijalankan | NOT TESTED | Transaksi aktif milik pengguna. |
| P-15 | Status buku setelah kembali | `200`, status `tersedia` | Belum dijalankan | NOT TESTED | Jalankan setelah P-14. |
| P-16 | Pengembalian berulang | `409` | Belum dijalankan | NOT TESTED | Jalankan setelah P-14. |
| P-17 | Peminjaman tanpa JWT | `401` | Belum dijalankan | NOT TESTED | Tidak mengirim Authorization. |
| P-18 | `bookId` hilang | `400` | Belum dijalankan | NOT TESTED | JWT valid. |
| P-19 | Transaksi tidak ditemukan | `404` | Belum dijalankan | NOT TESTED | Gunakan ID positif yang dipastikan tidak ada. |

## Query verifikasi database (jalankan hanya di database uji)

Ganti placeholder dengan nilai aktual; jangan jalankan placeholder apa adanya.

```sql
SELECT id, username, book_id, book_title, borrow_date, due_date, status, returned_at
FROM perpustakaan_db.loans WHERE id = <ID_TRANSAKSI>;

SELECT id, title, author, status
FROM perpustakaan_db.books WHERE id = <ID_BUKU>;
```

Jangan menyimpan password, JWT, API key, hash password, atau data pribadi pada hasil/screenshot. Status PASS hanya boleh dicatat setelah response aktual dan perubahan database yang relevan diperiksa.
