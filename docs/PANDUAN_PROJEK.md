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
