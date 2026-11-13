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
