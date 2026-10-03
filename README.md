# Arus yang Berpindah: Wajah Demografi dan Arus Migrasi Penduduk Indonesia

**Jejak Perpindahan** adalah web story interaktif tentang struktur demografi 514 kabupaten/kota (SUPAS 2025) dan arus migrasi risen antarprovinsi (Long Form Sensus Penduduk 2020 dan SUPAS 2025). Data utama bersumber dari **Badan Pusat Statistik (BPS)**.

- **Laman web:** https://kessyades.github.io/projectUASvisdat2026/
- **Repositori:** https://github.com/kessyades/projectUASvisdat2026

Proyek UAS Visualisasi Data dan Informasi, Politeknik Statistika STIS, 2026.
Kessya Desyka Ayliyanda (222313163), kelas 3SD2.

## Isi web story

Web story memenuhi empat dari enam topik visualisasi pada soal: **geospasial, aliran, multivariat, dan hierarki**.

| Bagian (menu) | Topik | Teknik visualisasi | Interaksi |
|---|---|---|---|
| Hero | – | Peta Indonesia dengan partikel di 150 arus migrasi terbesar | Animasi (berhenti otomatis bila pengguna memilih *reduced motion*) |
| Demografi | Geospasial, 514 kab/kota, 2025 | Choropleth, peta simbol proporsional, peta bivariat (TFR × % umur 20–39), hotspot LISA, tabel indikator | Kartu cerita dengan tombol ‹ › atau geser (peta berubah per kartu), pilihan indikator dan jenis peta, klasifikasi kuantil/interval sama, legenda yang bisa diklik untuk menyaring, tooltip, zoom/pan, pencarian kab/kota, panel detail struktur umur dengan pembanding, tabel yang bisa diurutkan, disaring, dan diunduh (CSV) |
| Arus Migrasi | Aliran, 34 provinsi, 2020 | Flow map berpartikel (ketebalan = jumlah migran, panah dan partikel = arah), matriks asal–tujuan, diagram chord berarah | Kartu cerita bertombol/geser, pilihan provinsi, arah masuk/keluar, jumlah arus terbesar, zoom/pan, jeda animasi, ketiga tampilan saling menyorot |
| Magnet 2025 | Penghubung, 38 provinsi | Grafik kupu-kupu migran keluar vs masuk, peta migrasi neto (palet divergen), slope chart peringkat 2020 (34 provinsi) → 2025 (38 provinsi) | Urutan neto/abjad, sorotan terhubung antara grafik dan peta, tooltip jumlah orang |
| Tipologi | Multivariat, 11 variabel, 37 provinsi | PCA biplot, peta kelompok, radar chart "provinsi kembaran", heatmap terklaster dengan dendrogram | Brushing di biplot, klik titik/provinsi/baris heatmap, kartu kelompok, pilihan provinsi kembaran; semua tampilan saling terhubung |
| Hierarki | Hierarki, pulau → provinsi → kab/kota | Treemap dan sunburst (ukuran = penduduk, warna = indikator) | Drill-down, penunjuk posisi (breadcrumb), pilihan variabel warna |
| Eksplor Daerahmu | – | Kartu cerita otomatis per kab/kota | Pencarian, acak |
| Sumber Data | – | 14 kartu metadata sumber dan catatan keterbatasan | Tautan langsung ke setiap tabel/publikasi |

Palet warna aman buta warna: ColorBrewer YlGnBu dan PuOr, pasangan biru #2166AC / oranye #E08214 untuk masuk/keluar dan magnet/pelepas, serta Okabe–Ito untuk kelompok provinsi (dibedakan juga dengan bentuk simbol). Tampilan responsif untuk laptop dan ponsel.

## Struktur folder

```
index.html              halaman utama
css/style.css           gaya tampilan (responsif laptop dan ponsel)
js/core.js              utilitas bersama: format angka, palet, tooltip, nama tipe provinsi
js/hero.js              animasi hero
js/carousel.js          kartu cerita bertombol dan bisa digeser
js/ch1_map.js           Demografi: peta 514 kab/kota, panel detail, tabel
js/ch2_flow.js          Arus Migrasi: flow map, matriks asal–tujuan, chord
js/ch3_magnet.js        Magnet 2025: grafik kupu-kupu, peta neto, slope chart
js/ch4_typology.js      Tipologi: PCA biplot, peta kelompok, radar, heatmap
js/ch5_hier.js          Hierarki: treemap dan sunburst
js/ch6_explore.js       Eksplor Daerahmu: kartu cerita otomatis
js/ch7_meta.js          Sumber Data: kartu metadata
js/main.js              inisialisasi, navigasi, menu ponsel
lib/d3.v7.min.js        pustaka D3.js v7.9.0 (lisensi ISC)
data/data.js            seluruh data terolah dalam satu berkas (dibaca oleh halaman)
data/*.json             data terolah per bagian, termasuk geometri TopoJSON
data/csv/               data terolah dalam format CSV
data/raw/               data mentah: kompilasi tabel BPS (Data_compile.xlsx) dan centroid 34 provinsi
scripts/                skrip pengolahan data (Python)
```

## Sumber data

Daftar lengkap (judul tabel/publikasi, tahun data, URL, tanggal akses) ada di `data/csv/sumber_data.csv` dan di bagian **Sumber Data** pada laman web. Ringkasnya:

- **BPS, SUPAS 2025:** TFR dan angka kematian bayi menurut kab/kota; penduduk menurut kab/kota, kelompok umur, dan jenis kelamin; persentase dan jumlah migran masuk, keluar, dan neto risen antarprovinsi 2025; angka kematian bayi dan rasio ketergantungan provinsi; publikasi *Penduduk dan Indikator Kependudukan Hasil SUPAS 2025* (laju pertumbuhan dan rasio jenis kelamin provinsi).
- **BPS, Tabel Statistik:** kepadatan penduduk provinsi (luas wilayah 2025).
- **BPS, Susenas September 2025:** Gini ratio provinsi (perkotaan + perdesaan).
- **BPS, Statistik Migrasi Indonesia Hasil Long Form SP2020, Tabel 5.3:** arus migrasi risen antarprovinsi (34 provinsi).
- **Data pendukung non-BPS:** batas administrasi kab/kota dan provinsi 2024 (LapakGIS, turunan BIG); centroid 34 provinsi dibuat di QGIS.

## Metode singkat

- **Penggabungan data:** tabel BPS dan batas wilayah digabung memakai nama provinsi dan kab/kota yang dinormalkan (huruf kecil, tanpa spasi dan tanda baca); 514 dari 514 kab/kota cocok.
- **Variabel turunan:** % umur 0–14, 15–64, 20–39, dan 65+ (jumlah kelompok umur / total × 100); rasio ketergantungan = (0–14 + 65+) / 15–64 × 100; rasio jenis kelamin = laki-laki / perempuan × 100. Umur 20–39 adalah variabel analitik penelitian ini (kelompok umur dengan migrasi risen terbanyak), bukan indikator baku BPS.
- **Klasifikasi peta:** 5 kelas kuantil (bawaan) atau interval sama; rasio jenis kelamin memakai kelas divergen di sekitar 100; peta bivariat memakai tertil 3 × 3.
- **LISA:** Local Moran's I, bobot 6 tetangga terdekat (centroid, standardisasi baris), 999 permutasi bersyarat, p < 0,05. Uji sensitivitas 4–10 tetangga menghasilkan pola yang sama (Moran's I TFR 0,59–0,66).
- **Arus 2020:** migrasi neto = (migran masuk − migran keluar antarprovinsi) / penduduk 5 tahun ke atas × 100, dihitung dari matriks Tabel 5.3. Diagonal (pindah di dalam provinsi) dan arus luar negeri tidak digambar.
- **Perbandingan 2020 → 2025:** memakai peringkat, bukan angka, karena periode, metode (sensus vs survei), dan jumlah provinsi berbeda. Papua dan Papua Barat ditandai karena wilayahnya berubah setelah pemekaran 2022; Papua Pegunungan ditempatkan di peringkat 38 karena neto 2025 tidak tersedia.
- **Multivariat:** 11 variabel distandardisasi (kepadatan dalam log10); PCA (PC1 43,9%, PC2 18,1% variansi); klaster hierarki Ward dengan k = 4. Lima kriteria (silhouette, Calinski–Harabasz, Davies–Bouldin, gap statistic, lompatan dendrogram) tidak menunjukkan satu optimum yang sama; k = 4 dipilih karena memisahkan provinsi berkarakter *frontier* dan didukung lompatan dendrogram terbesar kedua. Silhouette < 0,30, sehingga hasilnya diperlakukan sebagai tipologi deskriptif. Papua Pegunungan dikeluarkan karena migran masuk tidak tersedia (RSE > 50%).
- **Provinsi kembaran:** jarak Euclid terdekat pada 11 variabel terstandardisasi; radar chart menampilkan z-score kedua provinsi.
- **Hierarki:** warna tingkat pulau dan provinsi adalah rata-rata tertimbang penduduk dari nilai kab/kota (pendekatan, bukan angka resmi provinsi).

## Keterbatasan

- Arus asal–tujuan berasal dari LF SP2020 (34 provinsi), sedangkan indikator lain dari SUPAS 2025 (38 provinsi); keduanya tidak dihitung silang.
- Migrasi 2025 hanya tersedia per provinsi; status magnet atau pelepas provinsi tidak otomatis berlaku untuk setiap kab/kotanya (*ecological fallacy*).
- SUPAS adalah survei sampel; nilai kab/kota kecil memiliki galat sampling lebih besar.
- Hubungan antarvariabel dibaca sebagai asosiasi, bukan sebab-akibat.
- Batas wilayah disederhanakan (Douglas–Peucker, toleransi sekitar 450 m) dan pulau sangat kecil dihapus agar ringan di ponsel; peta tidak untuk keperluan batas resmi.

## Reproduksi pengolahan data

```bash
pip install -r requirements.txt
# 1. Sederhanakan batas wilayah (GeoJSON hasil ekspor QGIS, EPSG:4326)
RES=0.0005 EPS=0.004 MINI=0.03 python scripts/build_topology.py kabkota_38prov.geojson data/kabkota.topo.json
RES=0.0005 EPS=0.004 MINI=0.03 python scripts/build_topology.py provinsi_38.geojson data/provinsi.topo.json
# 2. Gabung data BPS, hitung variabel turunan, LISA, PCA, klaster, dan arus migrasi
python scripts/prep_data.py data/raw
# 3. Satukan menjadi data/data.js
python scripts/make_bundle.py
```

GeoJSON asli (sekitar 370 MB dan 280 MB) tidak disertakan karena melebihi batas ukuran GitHub; hasil penyederhanaannya ada di `data/*.topo.json`.

## Menjalankan dan deploy

Buka `index.html` langsung di browser (tidak perlu server), atau jalankan `python -m http.server 8000` lalu buka `http://localhost:8000`. Untuk GitHub Pages: unggah seluruh isi folder ini ke akar repositori, lalu buka **Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save**. Laman aktif di `https://kessyades.github.io/projectUASvisdat2026/` dalam beberapa menit.

## Penggunaan AI

Claude dipakai sebagai alat bantu untuk skrip pengolahan. Seluruh data, angka, dan interpretasi diperiksa ulang oleh penulis.
