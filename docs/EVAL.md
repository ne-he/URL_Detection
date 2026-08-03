# PhishGuard v2.2: hasil evaluasi

Dihasilkan otomatis oleh `backend/scripts/eval_report.py` pada 2026-08-02.
Semua angka di halaman ini keluar dari satu kali run di data yang ada di mesin,
bukan disalin dari catatan lama. Untuk membuat ulang:

```bash
cd backend
PYTHONPATH=. python scripts/eval_report.py --holdout 500
```

Model yang diukur: `models/phishing_detection_weights.npz` (`v2.2-minilm-lexical`),
yaitu MiniLM `all-MiniLM-L6-v2` (384 dim) digabung 20 fitur leksikal, lalu MLP 128-64-1.
Ambang produksi: `PHISHING_THRESHOLD=0.5`, artinya vonis PHISHING kalau
P(legitimate) < 0.5 (aturan yang sama persis dengan `app/main.classify`).

---

## Yang perlu dibaca duluan: recall lebih penting daripada accuracy

Untuk detektor phishing, dua jenis kesalahan tidak setara.

- **False negative** (situs phishing divonis aman) berujung pada orang memasukkan
  password atau nomor kartu ke halaman penipu. Kerugiannya nyata, langsung, dan
  sering tidak bisa dibatalkan.
- **False positive** (situs aman divonis phishing) berujung pada peringatan yang
  mengganggu. Penggunanya jengkel, lalu membuka halamannya juga.

Karena itu angka yang paling menentukan di sini adalah **recall kelas phishing**,
yaitu berapa persen situs phishing yang berhasil ditangkap. Accuracy tunggal bisa
menyesatkan: pada data yang seimbang sekalipun, accuracy mencampur dua jenis
kesalahan yang harganya jauh berbeda menjadi satu angka.

Konsekuensinya untuk pembacaan tabel di bawah: kolom yang harus dilihat pertama
adalah **recall** dan kolom **lolos** di confusion matrix, bukan accuracy.

Satu catatan supaya tidak berlebihan: mengutamakan recall bukan berarti false positive
gratis. Bagian 2 di bawah menunjukkan modelnya sudah kelewat curiga, dan itu masalah
tersendiri.

---

## Temuan utama: modelnya bias ke PHISHING

Ini kesimpulan terpenting dari Bagian 2, dan tidak kelihatan kalau cuma melihat
angka adversarial.

Di set adversarial, 49 dari 50 URL phishing samaran tertangkap
(cuma 1 yang lolos). Kelihatannya bagus. Tapi di kelompok kontrol yang isinya
URL **sah**, model sendirian cuma benar **3 dari 15**. Halaman login
asli seperti `accounts.google.com`, `login.microsoftonline.com`, `www.paypal.com/signin`,
dan `ibank.klikbca.com` semuanya divonis PHISHING dengan P(legitimate) di bawah 0.1.

Artinya angka adversarial tadi sebagian besar **bukan** bukti model bisa mengenali
penyamaran. Model cenderung menjawab PHISHING untuk hampir semua URL yang punya path,
kata seperti login/verify, atau subdomain. URL samaran kebetulan berbentuk seperti itu,
jadi ikut tertangkap. Detektor yang menjawab "phishing" untuk semua hal juga akan
mendapat skor adversarial sempurna.

Yang menahan false positive di produksi ternyata **allowlist tulisan tangan di
`app/threat.py`**, bukan modelnya: 3 dari 15 URL kontrol
selamat semata-mata karena host-nya kebetulan terdaftar di sana. `github.com/login`
dapat P(legitimate) 0.000 dari model dan hanya lolos karena allowlist.

Kenapa ini terjadi, dugaan paling masuk akal ada di komposisi data latih: kelas
legitimate didominasi domain Tranco dalam bentuk telanjang (`https://www.contoh.com`,
tanpa path), sedangkan kelas phishing hampir selalu punya path dan query. Model
akhirnya belajar "ada path berarti phishing", yang kebetulan benar di data latih
dan salah di dunia nyata.

Konsekuensi praktisnya: **recall 95.8% di holdout tidak bisa
dibaca sebagai "aman dipakai"**. Yang perlu diperbaiki duluan bukan recall, melainkan
komposisi kelas legitimate di dataset. Rencananya ada di bagian
"Dataset and its limitations" pada `backend/README.md`.

---

## Bagian 1: evaluasi standar

### Dari mana datanya

- Sumber: `backend/data/data_v2.csv`, dataset yang dirakit `scripts/build_dataset.py`.
- Model dilatih pada subsample seimbang 20000 URL dari file itu (seed tetap 42).
- **Test split internal**: 15% dari subsample training, disisihkan `train_test_split`
  di `scripts/train_model.py`. Bobot model tidak pernah di-fit di baris ini, tapi baris ini
  berasal dari populasi yang sama dengan data latih.
- **Holdout ketat**: 500 URL per kelas yang diambil dari baris `data_v2.csv`
  yang **tidak pernah masuk subsample training sama sekali**, jadi tidak ikut mem-fit
  bobot maupun StandardScaler. Ini angka yang lebih jujur dari dua-duanya.

**Batasan data yang harus disebut:** yang ikut ke dalam repo cuma
`backend/data/sample_100.csv`, 100 baris, dan itu pun potongan dari dataset **v1**
(`data.csv`, 18 kolom fitur numerik), bukan dari `data_v2.csv` yang dipakai melatih
model sekarang. 100 baris terlalu sedikit untuk mengukur apa pun: satu URL saja sudah
menggeser accuracy satu poin penuh. Angka di halaman ini dihitung dari `data_v2.csv`
lengkap yang **ada di mesin lokal tapi sengaja tidak di-commit** (lihat `.gitignore`).
Siapa pun yang meng-clone repo ini harus menjalankan `scripts/build_dataset.py` dulu
untuk membangun ulang dataset sebelum bisa mereproduksi angka-angka ini, dan hasilnya
tidak akan identik karena feed phishing yang jadi bahan sudah berganti isi.

### Metrik

| Metrik (kelas positif = phishing) | Test split internal (n=3000) | Holdout ketat (n=1000) |
|---|---|---|
| Accuracy | 95.87% | 95.70% |
| Precision (phishing) | 95.93% | 95.61% |
| Recall (phishing) | 95.80% | 95.80% |
| F1 (phishing) | 95.86% | 95.70% |
| ROC-AUC | 0.9846 | 0.9828 |

### Confusion matrix (holdout ketat, n=1000, threshold 0.5)

|  | diprediksi phishing | diprediksi legitimate |
|---|---|---|
| **asli phishing** | 479 | 21  <- lolos |
| **asli legitimate** | 22  <- salah tuduh | 478 |

![Confusion matrix](confusion_matrix.png)

Angka yang paling mahal adalah **21 URL phishing yang lolos** dari 500
URL phishing di holdout. Angka **22 false positive** dari 500 URL sah
adalah ongkos yang dibayar untuk itu.

### Kalau ambangnya digeser

Threshold bukan keputusan kode, melainkan keputusan operasional (`PHISHING_THRESHOLD`).
Tabel ini menunjukkan pertukarannya di holdout yang sama.

| Threshold P(legit) | Recall phishing | Precision phishing | F1 phishing | Accuracy | Phishing lolos | False positive |
|---|---|---|---|---|---|---|
| 0.3 | 94.80% | 97.13% | 95.95% | 96.00% | 26 | 14 |
| 0.4 | 95.60% | 96.96% | 96.27% | 96.30% | 22 | 15 |
| 0.5  (dipakai produksi) | 95.80% | 95.61% | 95.70% | 95.70% | 21 | 22 |
| 0.6 | 96.00% | 94.30% | 95.14% | 95.10% | 20 | 29 |
| 0.7 | 96.80% | 93.44% | 95.09% | 95.00% | 16 | 34 |

---

## Bagian 2: set adversarial

Set kecil berisi URL phishing yang sengaja disamarkan, dikelompokkan per teknik
penyamaran, ditambah satu kelompok kontrol berisi URL sah yang penampakannya
mencurigakan. Semua URL adversarial di sini **buatan** dan tidak menunjuk ke situs
sungguhan; definisinya ada di `backend/scripts/adversarial_set.py`.

Kenapa diukur per kategori dan bukan digabung: satu angka gabungan akan menutupi
kategori yang jebol total dengan kategori yang kebetulan aman. Yang berguna untuk
diperbaiki justru kategori yang jebolnya.

Kenapa ada kelompok kontrol: tanpa itu, "deteksi 100%" tidak berarti apa-apa, sebab
model yang menjawab PHISHING untuk semua URL juga mendapat 100%.

Blocklist publik (OpenPhish/Phishunt) **tidak diaktifkan** saat pengukuran ini karena
URL-nya buatan dan tidak akan pernah ada di feed mana pun. Allowlist tetap diterapkan
persis seperti di produksi, dan pengaruhnya cuma ke kelompok kontrol.

| Kategori | Jumlah | Benar | Salah (pipeline) | Rasio salah | Salah (model saja) | Median P(legit) | Status |
|---|---|---|---|---|---|---|---|
| `typosquatting` | 12 | 12 | 0 | **0%** | 0 (0%) | 0.005 | aman |
| `homograph` | 8 | 7 | 1 | **12%** | 1 (12%) | 0.010 | sebagian besar tertangkap |
| `punycode` | 8 | 8 | 0 | **0%** | 0 (0%) | 0.001 | aman |
| `shortener` | 8 | 8 | 0 | **0%** | 0 (0%) | 0.023 | aman |
| `subdomain_spoof` | 8 | 8 | 0 | **0%** | 0 (0%) | 0.003 | aman |
| `userinfo_obfuscation` | 6 | 6 | 0 | **0%** | 0 (0%) | 0.000 | aman |
| `control_benign` | 15 | 6 | 9 | **60%** | 12 (80%) | 0.034 | n/a |

### Catatan per kategori

- **`typosquatting`**: aman, 0/12 salah. Domainnya ASCII biasa dan panjangnya wajar, jadi tidak ada sinyal leksikal yang jelas. Yang membuatnya tertangkap kemungkinan besar bukan kemampuan mengenali salah eja brand, melainkan kecenderungan umum model menjawab PHISHING untuk URL berpath (lihat Temuan utama).
- **`homograph`**: sebagian besar tertangkap, 1/8 salah. Huruf Kiril menjadi token asing yang tidak pernah muncul di data latih, sehingga URL keluar dari distribusi yang dikenal model. Satu yang lolos justru yang paling pendek dan paling mirip domain sah.
- **`punycode`**: aman, 0/8 salah. Bentuk `xn--` membuat host terlihat acak dan panjang, mirip pola domain sampah di data latih. Ini kategori yang paling wajar tertangkap.
- **`shortener`**: aman, 0/8 salah. Ada fitur leksikal `is_shortener`. Tapi hasil ini justru perlu dibaca terbalik: mayoritas tautan bit.ly di dunia nyata TIDAK berbahaya, jadi memvonis PHISHING untuk semua shortener adalah perilaku yang salah, bukan prestasi.
- **`subdomain_spoof`**: aman, 0/8 salah. Fitur `brand_mismatch` dan `n_subdomain` memang dirancang untuk pola ini, dan host-nya panjang dengan TLD berisiko. Kategori dengan alasan teknis paling kuat untuk tertangkap.
- **`userinfo_obfuscation`**: aman, 0/6 salah. Fitur `has_at` menangkap tanda @, dan host aslinya sering berupa IP atau TLD berisiko.
- **`control_benign`**: kontrol, 9/15 salah. Kelompok kontrol: semuanya sah. Angka 'salah' di sini adalah false positive, yaitu situs aman yang diberi label PHISHING. Ini kategori terpenting di tabel.

### Rincian per URL

<details>
<summary><code>typosquatting</code>: lolos deteksi 0/12 (0%)</summary>

| URL | P(legitimate) | vonis | benar? |
|---|---|---|---|
| `http://goggle.com/accounts/signin` | 0.009 | PHISHING | benar |
| `http://paypa1.com/login` | 0.005 | PHISHING | benar |
| `https://faceb00k.com/login.php` | 0.007 | PHISHING | benar |
| `http://arnazon-security.com/verify` | 0.001 | PHISHING | benar |
| `https://micros0ft-update.com/office365` | 0.000 | PHISHING | benar |
| `http://netfl1x-billing.com/account` | 0.002 | PHISHING | benar |
| `https://whatsapp-web.co/login` | 0.001 | PHISHING | benar |
| `http://1inkedin.com/uas/login` | 0.003 | PHISHING | benar |
| `https://tokopedla.com/masuk` | 0.182 | PHISHING | benar |
| `http://klikbca-co.id/login` | 0.133 | PHISHING | benar |
| `https://instagrarn.com/accounts/login` | 0.005 | PHISHING | benar |
| `http://binancce.com/en/my/settings` | 0.173 | PHISHING | benar |

</details>
<details>
<summary><code>homograph</code>: lolos deteksi 1/8 (12%)</summary>

| URL | P(legitimate) | vonis | benar? |
|---|---|---|---|
| `https://раypal.com/signin` | 0.062 | PHISHING | benar |
| `https://gооgle.com/accounts/login` | 0.001 | PHISHING | benar |
| `https://аpple.com/id/verify` | 0.005 | PHISHING | benar |
| `https://micrоsoft.com/office/login` | 0.002 | PHISHING | benar |
| `https://аmazon.com/ap/signin` | 0.015 | PHISHING | benar |
| `https://fаcebook.com/login.php` | 0.006 | PHISHING | benar |
| `https://netflіx.com/billing` | 0.074 | PHISHING | benar |
| `https://bсa.co.id/klikbca` | 0.869 | LEGITIMATE | salah |

</details>
<details>
<summary><code>punycode</code>: lolos deteksi 0/8 (0%)</summary>

| URL | P(legitimate) | vonis | benar? |
|---|---|---|---|
| `https://xn--ypal-43d9g.com/signin` | 0.002 | PHISHING | benar |
| `https://xn--ggle-55da.com/accounts/login` | 0.000 | PHISHING | benar |
| `https://xn--pple-43d.com/id/verify` | 0.000 | PHISHING | benar |
| `https://xn--micrsoft-qbh.com/office/login` | 0.001 | PHISHING | benar |
| `https://xn--mazon-3ve.com/ap/signin` | 0.001 | PHISHING | benar |
| `https://xn--fcebook-2fg.com/login.php` | 0.001 | PHISHING | benar |
| `https://xn--netflx-tvf.com/billing` | 0.005 | PHISHING | benar |
| `https://xn--ba-omc.co.id/klikbca` | 0.058 | PHISHING | benar |

</details>
<details>
<summary><code>shortener</code>: lolos deteksi 0/8 (0%)</summary>

| URL | P(legitimate) | vonis | benar? |
|---|---|---|---|
| `https://bit.ly/3xK9pQrZ` | 0.024 | PHISHING | benar |
| `http://tinyurl.com/y7mn2ksd` | 0.010 | PHISHING | benar |
| `https://t.co/aB9cD1e2Fg` | 0.023 | PHISHING | benar |
| `https://cutt.ly/verify-account` | 0.001 | PHISHING | benar |
| `https://is.gd/9kLm2p` | 0.241 | PHISHING | benar |
| `https://rb.gy/x8q2vt` | 0.023 | PHISHING | benar |
| `http://ow.ly/Jk4p30sPq1` | 0.010 | PHISHING | benar |
| `https://shorturl.at/aBmZ7` | 0.062 | PHISHING | benar |

</details>
<details>
<summary><code>subdomain_spoof</code>: lolos deteksi 0/8 (0%)</summary>

| URL | P(legitimate) | vonis | benar? |
|---|---|---|---|
| `http://paypal.com.attacker.net/login` | 0.004 | PHISHING | benar |
| `https://accounts.google.com.secure-verify.ru/signin` | 0.000 | PHISHING | benar |
| `http://login.microsoftonline.com.session-check.top/` | 0.000 | PHISHING | benar |
| `https://www.bca.co.id.verifikasi-akun.xyz/login` | 0.004 | PHISHING | benar |
| `http://appleid.apple.com.icloud-find.info/locate` | 0.140 | PHISHING | benar |
| `https://binus.ac.id.student-portal.online/login` | 0.020 | PHISHING | benar |
| `http://www.netflix.com.billing-update.cf/account` | 0.000 | PHISHING | benar |
| `https://secure.tokopedia.com.promo-hadiah.click/klaim` | 0.002 | PHISHING | benar |

</details>
<details>
<summary><code>userinfo_obfuscation</code>: lolos deteksi 0/6 (0%)</summary>

| URL | P(legitimate) | vonis | benar? |
|---|---|---|---|
| `http://www.google.com@193.169.255.12/login` | 0.000 | PHISHING | benar |
| `https://accounts.google.com@evil-host.tk/signin` | 0.000 | PHISHING | benar |
| `http://paypal.com:secure@45.147.230.9/webscr` | 0.000 | PHISHING | benar |
| `https://www.bca.co.id@0x2e:8080/klikbca` | 0.033 | PHISHING | benar |
| `http://microsoft.com@login-verify.gq/office` | 0.000 | PHISHING | benar |
| `https://apple.com%2Fverify@icloud-lock.icu/find` | 0.002 | PHISHING | benar |

</details>
<details>
<summary><code>control_benign</code>: false positive 9/15 (60%)</summary>

| URL | P(legitimate) | vonis | benar? |
|---|---|---|---|
| `https://accounts.google.com/signin/v2/identifier` | 0.006 | PHISHING | salah |
| `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` | 0.001 | PHISHING | salah |
| `https://www.paypal.com/signin` | 0.095 | PHISHING | salah |
| `https://appleid.apple.com/sign-in` | 0.042 | PHISHING | salah |
| `https://www.netflix.com/login` | 0.892 | LEGITIMATE (allowlist) | benar |
| `https://myaccount.google.com/security-checkup` | 0.034 | PHISHING | salah |
| `https://support.microsoft.com/en-us/account-billing` | 0.008 | PHISHING | salah |
| `https://klikbca.com/` | 0.988 | LEGITIMATE | benar |
| `https://ibank.klikbca.com/authentication.do` | 0.001 | PHISHING | salah |
| `https://www.google.com/search?q=paypal+login+verify+account` | 0.002 | LEGITIMATE (allowlist) | benar |
| `https://binus.ac.id/` | 0.352 | LEGITIMATE (allowlist) | benar |
| `https://student.binus.ac.id/login` | 0.058 | PHISHING | salah |
| `https://www.kemenkeu.go.id/informasi-publik` | 0.823 | LEGITIMATE (allowlist) | benar |
| `https://github.com/login?return_to=%2Fsettings%2Fbilling` | 0.000 | LEGITIMATE (allowlist) | benar |
| `https://id.shopee.co.id/buyer/login` | 0.012 | PHISHING | salah |

</details>

---

## Limitasi yang diketahui

1. **Model terlalu curiga terhadap URL sah yang berbentuk halaman login.** Ini
   limitasi paling serius yang ditemukan pengukuran ini; angkanya ada di bagian
   Temuan utama. Akibat praktisnya: allowlist di `app/threat.py` sekarang bukan
   pelengkap, melainkan penopang utama yang menahan false positive, dan allowlist
   tulisan tangan tidak bisa ikut membesar mengikuti internet.
2. **Modelnya cuma melihat string URL.** Tidak ada isi halaman, sertifikat, WHOIS,
   maupun reputasi hosting. Semua teknik penyamaran yang membuat string URL terlihat
   normal otomatis jadi titik buta, dan itu terlihat di tabel adversarial di atas.
3. **MiniLM bukan encoder URL.** Model itu dilatih untuk kalimat bahasa Inggris.
   Di sini dipakai sebagai encoder string serbaguna: praktis, tapi bukan pilihan optimal.
   Kemiripan visual antar-karakter (`1` vs `l`, `rn` vs `m`, Kiril vs Latin) bukan
   sesuatu yang dipelajari model ini.
4. **Set adversarialnya kecil dan buatan tangan.** Ukurannya puluhan URL per kategori,
   jadi satu URL menggeser persentase beberapa poin. Angkanya menunjukkan arah, bukan
   presisi. Anggap ini uji perilaku, bukan tolok ukur statistik.
5. **Holdout berasal dari distribusi yang sama dengan data latih.** Sumber phishing-nya
   feed yang sama, sumber legitimate-nya daftar Tranco yang sama. Angka di halaman ini
   adalah batas atas; performa terhadap kampanye phishing baru akan lebih rendah.
   Alasan lengkapnya ada di bagian "Dataset dan limitasinya" pada `backend/README.md`.
6. **Threshold tunggal untuk semua jenis URL.** Shortener, domain baru, dan domain
   mapan diperlakukan sama, padahal ongkos kesalahannya berbeda.
7. **Angka di halaman ini tidak bisa direproduksi dari isi repo saja**, karena dataset
   penuhnya tidak di-commit (lihat batasan data di Bagian 1).

## Catatan teknis pengukuran

- Embedding dihitung lewat: **sentence-transformers**.
  Jalur resminya terpakai, jadi angka di atas tidak bergantung pada implementasi
  pengganti apa pun. Catatan lingkungan: di mesin ini `import torch` gagal dengan
  `OSError: [WinError 1114]` kalau berdiri sendiri, dan baru berhasil kalau
  `sklearn` di-import lebih dulu di proses yang sama (torch gagal memuat runtime
  OpenMP-nya sendiri). Script eval memang mengimpor sklearn duluan, makanya lolos.
  Encoder numpy pengganti itu bukan barang yang dipercaya begitu saja:
  `scripts/verify_encoder.py` membandingkan keluarannya dengan `data/_emb_cache.npy`,
  yaitu embedding yang dulu benar-benar dihasilkan `sentence-transformers` waktu
  training, dan selisih maksimumnya ada di orde 1e-7 (jauh di bawah toleransi 1e-4).
  Jadi dipakai jalur mana pun, angka evaluasinya sama.
- Fitur leksikal dihitung dengan `app/features.py` yang sama persis dengan runtime,
  jadi tidak ada risiko training/serving skew di sisi fitur.

