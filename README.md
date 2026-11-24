# Engineering Economics Solver

Aplikasi web pembantu perhitungan Ekonomi Teknik. Versi awal berjalan di browser dan tidak membutuhkan API berbayar.

## Fitur v1.0
- Single Payment (P/F)
- Uniform Series (P/A, A/P, F/A, A/F)
- Arithmetic Gradient (P/G dan F/G)
- Net Present Value (NPV)
- Annual Equivalent (AE)
- Nominal dan effective interest
- Input narasi dengan parser heuristik yang hasilnya wajib dikonfirmasi
- Tabel arus kas, langkah penyelesaian, salin jawaban, dan cetak

## Deploy langsung lewat GitHub + Vercel

1. Buat repository baru di GitHub.
2. Ekstrak ZIP ini di komputer.
3. Buka folder hasil ekstrak. Pastikan terlihat `index.html`, `package.json`, `vite.config.js`, dan folder `src`.
4. Di repository GitHub, pilih **Add file → Upload files**.
5. Masuk ke folder hasil ekstrak, pilih SEMUA ISI folder (termasuk folder `src`), lalu seret ke halaman Upload files GitHub.
6. Klik **Commit changes**.
7. Di Vercel, pilih **Add New → Project**, import repository tersebut, lalu gunakan:
   - Framework Preset: Vite
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
8. Klik **Deploy**.

PENTING: Jangan upload folder pembungkus `engineering-economics-solver` sebagai satu folder bersarang. Isi proyek harus berada langsung di root repository. Folder `src` tetap harus utuh dan berisi empat file sumber.

## Menjalankan di komputer (opsional)

Butuh Node.js 18 atau lebih baru:

```bash
npm install
npm run dev
```

## Catatan metode dan asumsi
- Semua arus kas NPV/AE terjadi pada akhir periode; tahun 0 tidak didiskontokan.
- Nominal positif = penerimaan; negatif = pengeluaran.
- Uniform Series menganggap pembayaran terjadi pada akhir periode.
- Gradient murni diasumsikan 0 pada periode pertama, G pada periode kedua.
- Tingkat bunga harus dinyatakan per periode yang sama dengan arus kas.
- Pada soal cicilan bulanan, masukkan bunga per bulan setelah menentukan konversi yang tepat dari bunga tahunan.
- AE menggunakan satu umur analisis yang diberikan. Perbandingan umur alternatif yang berbeda memerlukan pemilihan periode studi atau asumsi pengulangan/penggantian.
- Parser narasi hanya membantu menemukan kandidat angka dan indikasi metode. Ia bukan AI dan tidak menjamin pemetaan parameter benar. Konfirmasi data secara manual.
- Versi ini belum mencakup IRR, BCR, depresiasi, pajak, replacement, payback, sensitivitas, dan break-even.
