# PhishGuard v2: pendeteksi URL phishing berlapis yang jujur soal kemampuannya sendiri

## Sekilas

| | |
|---|---|
| Apa | Web app yang menebak apakah sebuah link itu phishing (penipuan) atau aman, lewat tiga lapis: daftar hitam live, daftar putih, lalu model machine learning |
| Untuk siapa | Orang awam yang ragu sebelum klik link, dan rekruter yang mau lihat cara Nehemiah membangun sistem ML dari ujung ke ujung |
| Status | Live dan dipakai sebagai projek portfolio. Backend v2.2, frontend versi paket 2.2.0 |
| Link live | Frontend: https://url-detection-one.vercel.app , API: https://ne-he-phisguard-api.hf.space (dokumentasi di /docs, status di /health) |
| Repo | https://github.com/ne-he/URL_Detection (repo lama ne-he/phishguard sudah dihapus) |
| Teknologi utama | Python, FastAPI, sentence-transformers (all-MiniLM-L6-v2), numpy, scikit-learn untuk training, Gradio Server di Hugging Face ZeroGPU, React 18 + Vite + TypeScript, PWA, Vercel, GitHub Actions |
| Terakhir diperbarui | Kode: 11 November 2026 (commit 7a55267). Dokumen ini: 12 November 2026 |

## 1. Projek ini tentang apa

Bayangkan satpam di pintu gedung. Ada tamu datang. Satpam pertama-tama cek daftar orang yang sudah pernah ketahuan maling. Kalau namanya ada di situ, langsung tolak, tidak perlu mikir. Kalau tidak ada, dia cek daftar tamu VIP yang sudah pasti aman. Kalau tamunya juga bukan VIP, baru satpam pakai insting: lihat penampilan, gerak-gerik, cara bicara, lalu memutuskan curiga atau tidak.

PhishGuard bekerja persis seperti satpam itu, cuma tamunya adalah link. Kamu tempel sebuah URL, sistem mengecek daftar hitam phishing yang diperbarui dari internet, lalu daftar putih situs terpercaya, dan kalau dua-duanya tidak kena, model machine learning yang menilai bentuk URL-nya. Hasilnya label PHISHING atau LEGITIMATE, plus persentase keyakinan dan keterangan lapis mana yang memutuskan.

Yang membuat projek ini menarik bukan modelnya. Modelnya sederhana. Yang menarik adalah cara projek ini dibangun ulang dari versi kelompok yang rapuh menjadi sistem yang punya test, evaluasi terukur, dan dokumentasi jujur soal di mana ia gagal.

## 2. Masalah yang mau diselesaikan

Phishing adalah halaman palsu yang menyamar jadi bank, marketplace, atau layanan login supaya korban mengetik password atau nomor kartu. Link-nya biasanya mirip asli: `paypa1.com` (angka 1, bukan huruf l), `paypal.com.attacker.net` (kata paypal di depan, padahal pemilik domainnya attacker.net), atau huruf Kiril yang bentuknya sama dengan huruf Latin.

Ada dua lapis masalah di sini.

Masalah pertama adalah masalah pengguna: orang awam tidak bisa membaca URL secara teliti. Mereka butuh jawaban cepat sebelum klik.

Masalah kedua adalah masalah teknis yang muncul di PhishGuard v1. Versi pertama adalah projek kuliah kelompok 7 orang, dan peran Nehemiah waktu itu di frontend. Versi itu masih live di hci-update.vercel.app dan sengaja dibiarkan sebagai arsip. Backend v1 punya cacat khas projek demo, yang dicatat sendiri oleh Nehemiah di README:

- CORS diset `allow_origins=["*"]` bareng `allow_credentials=True`. Kombinasi ini ditolak spesifikasi browser dan tidak aman.
- Kalau model gagal dimuat, server cuma mencetak pesan lalu tetap bilang "Ready". Dari luar kelihatan sehat, padahal setiap prediksi pasti gagal.
- Tidak ada validasi input. String apa pun langsung dimasukkan ke model.
- Threshold 0,5 ditulis mati di kode.
- Nol test, dan tidak ada metrik yang dipublikasikan.

v2 lahir untuk menutup lubang-lubang itu. Backend, dataset, model, lapisan ancaman, test, evaluasi, dan deployment v2 ditulis ulang sendiri oleh Nehemiah (sumber: bagian Credits di README.md dan LICENSE).

## 3. Cara kerjanya, langkah demi langkah

Kita ikuti satu URL contoh yang memang dites di versi live pada 11 November 2026:

```
paypa1-secure-verify.account-update.xyz/login.php
```

Alur besarnya begini:

```
Pengguna ketik URL di web
  -> Frontend React (LinkPredictor.tsx) kirim POST /predict ke Space
  -> Validasi Pydantic (schemas.py): rapikan, cek skema, cek panjang
  -> Lapis 1: blocklist feed live (OpenPhish, Phishunt)
  -> Lapis 2: allowlist host persis (threat.py)
  -> Lapis 3: model (predictor.py): MiniLM 384 dim + 20 fitur leksikal -> dense 128-64-1
  -> classify() di main.py: bandingkan dengan threshold
  -> JSON balik ke frontend: label, confidence, source
```

**Langkah 1, frontend mengirim request.** Komponen `src/app/components/LinkPredictor.tsx` mengirim `{"url": "..."}` ke `https://ne-he-phisguard-api.hf.space/predict`. Alamat itu datang dari `src/app/config.ts`. Request diberi batas 20 detik. Kalau gagal, biasanya Space-nya sedang bangun dari tidur, jadi UI menampilkan pesan itu lalu mencoba sekali lagi dengan batas 150 detik.

**Langkah 2, validasi input.** Di `backend/app/schemas.py`, kelas `URLRequest` membuang spasi di ujung, menolak string kosong, menolak URL lebih dari 2.048 karakter, dan menolak skema aneh seperti `javascript:` atau `mailto:`. URL contoh kita tidak punya skema, jadi backend menambahkan `http://` di depannya. Host dijadikan huruf kecil, path dibiarkan apa adanya. Hasilnya: `http://paypa1-secure-verify.account-update.xyz/login.php`. Input yang tidak lolos dibalas kode 422, bukan diprediksi.

**Langkah 3, cek blocklist.** `Blocklist` di `backend/app/threat.py` menyimpan daftar URL dan host dari feed OpenPhish dan Phishunt, dimuat di thread terpisah saat startup dan disegarkan tiap jam. Kalau URL atau host-nya persis ada di feed, vonis langsung PHISHING 100% dengan `source: "blocklist"`. URL contoh kita buatan sendiri, jadi tidak ada di feed.

**Langkah 4, cek allowlist.** Fungsi `in_allowlist()` membuang `www.`, userinfo, dan port, lalu mencocokkan host secara persis dengan daftar sekitar 57 domain terpercaya (kampus `.ac.id`, situs `.go.id`, bank, marketplace, dan brand global seperti google.com dan github.com). Kata kuncinya "persis". Host `binus.ac.id.evil.com` tidak ikut lolos karena host-nya berbeda. Host contoh kita juga tidak ada di daftar, jadi lanjut ke model.

**Langkah 5, model menilai.** Di `backend/app/predictor.py` terjadi tiga hal:

1. URL diubah jadi vektor 384 angka oleh `all-MiniLM-L6-v2`.
2. `backend/app/features.py` menghitung 20 fitur leksikal. Untuk URL contoh: TLD `.xyz` masuk daftar TLD berisiko, ada kata mencurigakan seperti login, secure, verify, account, dan update, ada dua tanda hubung, dan satu subdomain. Catatan kecil: fitur `brand_mismatch` tidak menyala di sini, karena yang tertulis `paypa1`, bukan `paypal`.
3. Dua bagian itu digabung jadi 404 angka, dinormalisasi pakai mean dan scale hasil training, lalu dilewatkan ke jaringan dense 128, 64, 1 neuron. Semuanya dihitung dengan numpy biasa: perkalian matriks, ReLU, lalu sigmoid. Output-nya P(legitimate), peluang URL itu aman.

**Langkah 6, keputusan.** `classify()` di `backend/app/main.py` menghitung P(phishing) = 1 dikurangi P(legitimate). Kalau hasilnya di atas threshold 0,5 (bisa diatur lewat env `PHISHING_THRESHOLD`), label jadi PHISHING. Untuk URL contoh, hasil live: **PHISHING, sumber `model`**. Angka probabilitas persisnya tidak tercatat di repo `[?]`.

Sebagai pembanding, `github.com/login` yang dites hari yang sama dibaca LEGITIMATE dengan sumber `allowlist`. Ini penting nanti di bagian batasan, karena model sendirian justru menilai URL itu phishing.

## 4. Peta kode: folder dan file penting

| Path | Isinya apa |
|---|---|
| `backend/app/main.py` | Rute API (`/`, `/health`, `/predict`, `/predict/batch`), urutan lapis keputusan, fungsi `classify()` yang jadi satu-satunya tempat aturan label hidup |
| `backend/app/predictor.py` | Muat bobot `.npz` dan MiniLM, warmup, forward pass numpy. Konvensi label dikunci di sini |
| `backend/app/features.py` | 20 fitur leksikal. Dipakai training dan runtime dengan kode yang sama, urutan fitur dikunci |
| `backend/app/threat.py` | Blocklist feed live, allowlist host, cek umur domain via RDAP (default mati) |
| `backend/app/schemas.py` | Validasi request dan bentuk response (kompatibel dengan v1) |
| `backend/app/config.py` | Semua setelan dari environment variable, tidak ada yang di-hardcode |
| `backend/app.py` | Entrypoint Space: `gradio.Server` plus fungsi dummy `@spaces.GPU` supaya ZeroGPU mau start |
| `backend/scripts/build_dataset.py` | Merakit `data_v2.csv` dari data v1, Tranco, domain Indonesia, dan feed phishing |
| `backend/scripts/train_model.py` | Training MLP scikit-learn, cek bahwa forward pass numpy sama dengan sklearn, simpan `.npz` |
| `backend/scripts/eval_report.py` | Menghasilkan `docs/EVAL.md` secara otomatis |
| `backend/scripts/adversarial_set.py` | Set URL samaran buatan per teknik, plus kelompok kontrol URL sah |
| `backend/models/` | `phishing_detection_weights.npz` (dipakai) dan `.h5` lama dari era Keras |
| `backend/tests/` | Test schema, API dengan stub, fitur, threat, dan regression orientasi label |
| `backend/training/training.ipynb` | Notebook training lama, disimpan sebagai referensi |
| `src/app/config.ts` dan `config.test.ts` | URL backend default plus test yang menguncinya |
| `src/app/components/` | UI: prediktor, analisis, globe 3D, gamifikasi, suara, PWA |
| `.github/workflows/ci.yml` | CI tiga job: frontend, api-tests, model-regression |
| `.github/workflows/keep-warm.yml` | Ping `/health` tiap 8 jam |
| `docs/EVAL.md` | Laporan evaluasi lengkap, sumber semua angka di dokumen ini |

## 5. Teknologi yang dipakai dan kenapa

**all-MiniLM-L6-v2 (sentence-transformers).** Model kecil yang mengubah teks jadi vektor 384 dimensi. Dipilih karena ringan dan jalan di CPU. Kelemahannya diakui sendiri di `docs/EVAL.md`: MiniLM dilatih untuk kalimat bahasa Inggris, bukan URL, jadi di sini ia cuma dipakai sebagai encoder string serbaguna.

**20 fitur leksikal buatan tangan.** Embedding tidak paham bahwa `.xyz` sering dipakai penipu atau bahwa tanda `@` di URL itu trik. Fitur seperti `risky_tld`, `has_at`, `has_ip`, `brand_mismatch`, dan `is_shortener` menambahkan pengetahuan domain itu secara eksplisit.

**numpy untuk inference, bukan TensorFlow.** Model awalnya Keras. Masalahnya, TensorFlow tidak jalan di hardware ZeroGPU, satu-satunya tier gratis yang tersisa. Untuk tiga layer dense, TensorFlow memang berlebihan. Jadi model v2.2 dilatih pakai `MLPClassifier` scikit-learn, bobotnya disimpan ke `.npz`, dan forward pass ditulis ulang dengan numpy. Script training sendiri mengecek bahwa selisih numpy dan sklearn harus di bawah 1e-4.

**FastAPI + Pydantic.** Validasi input otomatis, dokumentasi Swagger gratis di `/docs`, dan dependency injection yang memudahkan test pakai stub.

**Gradio Server di Hugging Face ZeroGPU.** Docker Space dan CPU basic sekarang butuh langganan PRO. Akun gratis cuma bisa ZeroGPU untuk Gradio Space. `gradio.Server` adalah subclass FastAPI, jadi rute `/predict` yang sama bisa dipasang di situ. GPU-nya sendiri tidak dipakai, embedding dipaksa CPU.

**React + Vite + PWA di Vercel.** Frontend warisan v1 (bagian yang dulu dikerjakan Nehemiah), sekarang diarahkan ke backend v2. Bisa dipasang seperti aplikasi di HP.

**GitHub Actions.** Untuk CI dan untuk menjaga Space tetap bangun. Semua stack ini gratis, sesuai budget Rp 0.

## 6. Angka dan bukti

Semua angka di bawah diambil dari file di repo, bukan dari ingatan.

**Holdout ketat** (1.000 URL yang tidak pernah masuk training, 500 phishing dan 500 legitimate, threshold 0,5). Sumber: `docs/EVAL.md` Bagian 1, dihasilkan `eval_report.py` pada 2 Agustus 2026.

| Metrik (kelas positif = phishing) | Test split internal (n=3.000) | Holdout ketat (n=1.000) |
|---|---|---|
| Accuracy | 95,87% | 95,70% |
| Precision | 95,93% | 95,61% |
| Recall | 95,80% | 95,80% |
| F1 | 95,86% | 95,70% |
| ROC-AUC | 0,9846 | 0,9828 |

README.md membulatkan ROC-AUC holdout jadi 0,983. Angka "sekitar 0,985" yang beredar di catatan lama sebenarnya milik test split internal (0,9846), bukan holdout.

**Confusion matrix holdout** (sumber: `docs/EVAL.md`): 479 phishing tertangkap, **21 phishing lolos**, 22 situs sah salah dituduh, 478 situs sah benar.

**Set adversarial** (sumber: `docs/EVAL.md` Bagian 2): 49 dari 50 URL phishing samaran tertangkap. Satu-satunya yang lolos adalah homograph `bсa.co.id` dengan huruf Kiril.

**Kelompok kontrol 15 URL login sah** (sumber yang sama): model sendirian cuma benar 3 dari 15. Setelah allowlist ikut bekerja, pipeline masih salah tuduh 9 dari 15, termasuk `accounts.google.com`, `www.paypal.com/signin`, dan `ibank.klikbca.com`.

**Dataset** (sumber: `backend/README.md`): `data_v2.csv` berisi 132.742 baris (68.944 phishing, 63.798 legitimate), dirakit 20 Juli 2026. Model dilatih pada subsample seimbang 20.000 URL (seed 42), dibagi 85/15.

**Test** (sumber: README.md): 37 test, yaitu 33 test backend dan 4 test frontend. Saya tidak menjalankan ulang test untuk dokumen ini. Lockfile 11 November dicatat lolos test dan build (sumber: pesan commit 7a55267).

## 7. Keputusan desain penting

**Lapis berurutan: blocklist, allowlist, baru model.** Blocklist menang paling depan karena satu halaman phishing bisa saja numpang di domain sah yang dibobol. Fakta di feed lebih bisa dipercaya daripada tebakan model. Trade-off-nya, allowlist ternyata jadi penopang utama, bukan pelengkap (lihat bagian 9).

**Allowlist pakai host persis, bukan "mengandung".** Aman dari trik subdomain seperti `paypal.com.attacker.net`. Ongkosnya: `student.binus.ac.id/login` tidak ikut terlindungi walaupun `binus.ac.id` ada di daftar, dan memang tercatat sebagai false positive di EVAL.

**Fail loud, run degraded.** Kalau model gagal dimuat, proses tetap hidup, tapi `/health` membalas 503 beserta alasan error aslinya, dan `/` melaporkan `degraded`. Ini kebalikan langsung dari v1 yang bilang "Ready" padahal rusak.

**Predictor sebagai protocol.** `main.py` tidak tahu soal torch atau bobot. Test API memakai stub, jadi bisa jalan di mana saja dalam hitungan detik tanpa memasang paket ML yang berat.

**Orientasi label dikunci test.** Di data, `ClassLabel` 1 berarti legitimate dan 0 berarti phishing, dan sigmoid mengeluarkan P(legitimate). Kalau suatu hari model dilatih ulang dengan encoder label yang terbalik, semua vonis ikut terbalik tanpa ada error. `backend/tests/test_label_orientation.py` mencegah itu dengan dua URL jangkar: `https://www.google.com` wajib dinilai aman dan `http://58.23.215.31:8765/wzoptup.exe` wajib dinilai phishing. Test ini butuh model asli, dan kalau model tidak tersedia ia di-skip. Masalahnya, skip membuat pytest tetap keluar dengan kode sukses. Jadi job `model-regression` di CI sengaja mencari tulisan "passed" di output dan menggagalkan build kalau tidak ketemu.

**Threshold dari env.** Tabel di `docs/EVAL.md` menunjukkan efeknya. Threshold 0,7 menaikkan recall ke 96,80% tapi false positive naik dari 22 ke 34. Ini keputusan operasional, jadi tempatnya di konfigurasi.

**Recall diutamakan.** Phishing yang lolos bisa berujung password dicuri. Salah tuduh cuma bikin jengkel. Karena itu recall ditebalkan di README, dengan catatan bahwa false positive tetap bukan gratis.

## 8. Update terbaru

| Tanggal | Commit | Isi |
|---|---|---|
| 27 Mei 2026 | 702917f | Commit terakhir era v1 di riwayat repo ini |
| 15 Jul 2026 | 3852a07 | Backend v2 ditulis ulang: health jujur, validasi ketat, test orientasi label |
| 18 Jul 2026 | 2d6c66d sampai 54e15e7 | Frontend digabung ke repo ini. Perjalanan deploy ke HF: Docker ternyata terkunci PRO, pindah ke Gradio, TensorFlow dibuang, inference numpy, ZeroGPU dibereskan |
| 20 Jul 2026 | 49d9c20 | v2.2: detektor berlapis (MiniLM + fitur leksikal + allowlist/blocklist), dataset baru |
| 3 Agu 2026 | cada62a | Laporan evaluasi v2.2, set adversarial, CI yang tidak bisa hijau diam-diam |
| 6 Agu 2026 | 4d7ffee, bde7f74 | Default API frontend diarahkan ke Space sendiri dan dikunci test. Dokumentasi deploy |
| 7 sampai 8 Agu 2026 | 6a93b89, 3d389a6 | URL frontend live dicatat, halaman About, penanganan cold start |
| 13 Agu 2026 | abad6d3 | Kepemilikan projek dipertegas di About, README, LICENSE, package.json |
| 28 Sep 2026 | ce85ba5 | Em dash dibuang dari komentar, docstring, dan teks UI |
| 11 Nov 2026 | 7a55267 | Lockfile disegarkan untuk menutup 4 advisory dependency |

Detail update 11 November 2026: `npm audit` menandai react-router (high), lodash (high, lewat recharts dan workbox-build), fflate (moderate), dan yaml (moderate). Keempatnya punya perbaikan di dalam rentang versi yang sudah ada, jadi yang berubah cuma `package-lock.json`. Test frontend lolos, build sukses, halaman Home dan About dicek tampil tanpa error dan tersambung ke API live. Prediksi live juga dites: `github.com/login` dibaca LEGITIMATE (sumber allowlist) dan `paypa1-secure-verify.account-update.xyz/login.php` dibaca PHISHING (sumber model).

Satu catatan sejarah yang layak diingat: sebelum 6 Agustus, default URL backend di frontend menunjuk ke Space milik kolaborator v1 yang menjalankan model v1. Build yang lupa mengisi env diam-diam mengirim URL pengunjung ke server orang lain. Sekarang default itu dikunci `src/app/config.test.ts`.

## 9. Batasan jujur dan yang belum dikerjakan

**Model terlalu curiga pada halaman login sah.** Ini batasan paling serius. Model sendirian menilai `github.com/login` dengan P(legitimate) 0,000. Dugaan penyebabnya ada di data: kelas legitimate didominasi domain telanjang dari Tranco tanpa path, sedangkan phishing hampir selalu punya path. Model jadi belajar "ada path berarti phishing". Skor adversarial yang bagus sebagian besar ikut terangkat oleh bias itu, bukan karena model benar-benar mengenali penyamaran.

**Allowlist tulisan tangan tidak bisa membesar mengikuti internet.** Sekitar 57 domain, dan subdomain seperti `student.binus.ac.id` tidak tercakup.

**Holdout berasal dari snapshot yang sama.** Feed phishing diambil satu hari, 20 Juli 2026. Angka 95,70% menjawab "bisa mengenali kampanye yang ada di data", bukan "bisa mengenali kampanye baru tadi pagi". Evaluasi berbasis waktu belum dibuat.

**Asal-usul dataset v1 tidak tercatat.** `data.csv` (80.974 baris) diwarisi dari tugas kelompok, dan sumber, tanggal, serta lisensinya tidak diketahui.

**Angka tidak bisa direproduksi dari repo saja.** Dataset penuh tidak di-commit. Yang ada cuma `sample_100.csv`, itu pun potongan data v1.

**Model hanya melihat string URL.** Tidak ada isi halaman, sertifikat, atau WHOIS.

**CORS di Space belum ketat.** `gradio.Server` memantulkan Origin apa saja, jadi `FRONTEND_ORIGINS` praktis tidak berlaku di sana. Dampaknya rendah karena API tidak memakai cookie atau login, tapi tetap tidak sesuai yang diklaim konfigurasi.

**Keep-warm bukan jaminan.** GitHub mematikan workflow terjadwal di repo yang 60 hari tanpa commit.

**Belum dikerjakan** (roadmap README): data legitimate dengan path asli, retraining terjadwal, logging prediksi dan monitoring drift, serta fingerprint dataset di dalam file model.

**Dokumen yang sudah basi di repo.** `docs/ARCHITECTURE.md` masih menggambar predictor Keras `.h5`, dan `flow/flow.md` masih menyebut "PhishGuard v3.0", model Keras, dan akurasi training 97,08%. Keduanya tidak mencerminkan kode sekarang. Yang benar adalah kode, README, dan `docs/EVAL.md`.
