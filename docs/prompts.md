# Prompt yang Digunakan

## 1. Prompt Perancangan Arsitektur

```
Kembangkan proyek Sistem Peminjaman Buku Perpustakaan (single-page app dengan
localStorage) yang sudah ada menjadi arsitektur microservice, minimal 2 service.
Gunakan kembali User Story dan Acceptance Criteria yang sudah dibuat sebelumnya.
Setiap service harus punya fungsi yang jelas, dan harus ada minimal 1 alur fitur
yang melibatkan komunikasi antar-service via API.
```

## 2. Prompt Implementasi Book Service & Loan Service

```
Buatkan Book Service (mengelola data buku & status ketersediaan) dan Loan Service
(mengelola login, peminjaman, dan aturan bisnis: maksimal 3 buku aktif, masa pinjam
7 hari). Loan Service harus memanggil Book Service via HTTP API untuk mengecek dan
mengubah status buku saat proses peminjaman terjadi. Gunakan Node.js + Express,
data disimpan di file JSON.
```

## 3. Prompt Perbaikan Saat Instalasi Dependency Gagal

```
npm install gagal (403 Forbidden) karena akses registry npm diblokir di
lingkungan ini. Tulis ulang kedua service tanpa dependency eksternal
(tanpa Express, tanpa Axios, tanpa CORS package), hanya menggunakan modul
bawaan Node.js (http, fs), tapi tetap mempertahankan seluruh endpoint dan
aturan bisnis yang sama.
```

## 4. Prompt Pengujian End-to-End

```
Jalankan kedua service ini secara bersamaan dan uji alur lengkap berikut
menggunakan curl:
1. Lihat daftar buku
2. Login sebagai mahasiswa
3. Pinjam 1 buku, pastikan status buku berubah menjadi "dipinjam"
4. Pinjam sampai 3 buku, lalu coba pinjam buku ke-4 -> harus ditolak
5. Mahasiswa lain mencoba pinjam buku yang sedang dipinjam -> harus ditolak
Tunjukkan hasil setiap langkah.
```

## Catatan
Prompt-prompt requirement engineering (User Story, Acceptance Criteria,
AI Requirement Analysis, dsb.) yang menjadi dasar proyek ini sudah didokumentasikan
sebelumnya di laporan Praktikum RE dengan AI (Pertemuan 2) dan tidak diulang di sini,
sesuai instruksi untuk menggunakan kembali (reuse) hasil yang sudah ada.
