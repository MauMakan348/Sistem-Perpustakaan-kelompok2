# Dokumentasi Penggunaan AI Coding Tool
woii kerjaaa
**AI Coding Tool yang digunakan:** Claude (Anthropic), diakses melalui claude.ai

## Bagaimana AI Membantu Proses Pengembangan

1. **Perancangan arsitektur** — AI diminta mengusulkan pemisahan menjadi minimal
   2 microservice berdasarkan User Story & Acceptance Criteria yang sudah ada
   dari praktikum sebelumnya. AI mengusulkan pemisahan berdasarkan domain:
   Book Service (data buku) dan Loan Service (proses peminjaman).

2. **Implementasi kode** — AI menuliskan kode awal untuk kedua service
   (routing, komunikasi antar-service via HTTP, penyimpanan data JSON)
   berdasarkan rancangan arsitektur yang sudah disetujui.

3. **Penyesuaian teknis** — Saat proses `npm install` gagal karena keterbatasan
   akses jaringan, AI mengusulkan dan menulis ulang kedua service menggunakan
   modul bawaan Node.js (`http`, `fs`) tanpa dependency eksternal (Express/Axios),
   sehingga proyek tetap bisa dijalankan tanpa instalasi tambahan.

4. **Pengujian** — AI menjalankan pengujian alur end-to-end (login → lihat buku →
   pinjam → cek limit 3 buku → cek buku tidak tersedia untuk user lain)
   menggunakan `curl` untuk memverifikasi komunikasi antar-service benar-benar
   berjalan, bukan hanya berdasarkan pembacaan kode.

## Masalah/Kesalahan yang Ditemukan dari Hasil AI

- **Kegagalan instalasi dependency**: percobaan pertama menggunakan Express,
  CORS, dan Axios sebagai dependency, namun `npm install` gagal di lingkungan
  pengujian (akses registry npm diblokir). Ini bukan kesalahan logika AI,
  tapi menunjukkan pentingnya memverifikasi bahwa kode benar-benar bisa
  dijalankan di lingkungan yang tersedia, bukan hanya "terlihat benar" di kode.
  Solusi: kode ditulis ulang tanpa dependency eksternal.
- **Konsistensi data antar-service**: pada rancangan awal, AI belum menyertakan
  mekanisme rollback jika pemanggilan `PATCH /books/:id/status` ke Book Service
  gagal setelah peminjaman sudah tercatat di Loan Service. Hal ini berpotensi
  membuat data antar-service tidak konsisten (peminjaman tercatat, tapi status
  buku tidak berubah). Kelompok meminta AI menambahkan langkah rollback
  (menghapus catatan peminjaman) apabila update ke Book Service gagal.

## Prinsip yang Diterapkan
Kode hasil AI tidak langsung digunakan mentah-mentah — setiap service diuji
secara end-to-end dengan `curl` untuk memastikan komunikasi antar-service dan
aturan bisnis (maksimal 3 buku aktif, buku tidak bisa dipinjam dua kali)
benar-benar berjalan, bukan hanya diasumsikan benar dari membaca kode.
