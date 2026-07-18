# PhishGuard v3.0 (Phishing URL Detection System)

Projek ini bernama **PhishGuard v3.0** (atau **Phishing URL Detection System**). Ini adalah sistem pendeteksi URL phishing berbasis Deep Learning berkinerja tinggi yang dikemas dalam arsitektur kontainer (Docker) dan dioptimalkan untuk CPU agar dapat berjalan dengan cepat dan ringan di perangkat lokal.

Berikut adalah penjelasan lengkap mengenai projek ini, fitur-fiturnya (web dan backend), teknologi yang digunakan, serta metrik dan struktur dataset yang digunakan.

---

## 1. 🛡️ Tentang Projek (Overview)
Projek ini bertujuan untuk mendeteksi apakah suatu URL aman (*Legitimate*) atau berbahaya (*Phishing*). Sistem ini mengombinasikan kekuatan Natural Language Processing (NLP) menggunakan model sentence embedding (`all-MiniLM-L6-v2`) untuk mengubah teks URL mentah menjadi representasi vektor numerik, yang kemudian diklasifikasikan oleh arsitektur Neural Network (Keras DL).

---

## 2. ✨ Fitur Lengkap Sistem

### A. Fitur Web Dashboard (Frontend)
Frontend dikembangkan menggunakan React + Vite dengan antarmuka bertema cyberpunk/futuristic (neon HUD, scanlines, dan efek glitch) yang sangat interaktif:

* **URL Predictor**: Input URL manual untuk dianalisis oleh sistem secara instan.
* **Voice Assistant (Speech Recognition & Synth)**:
  * Menggunakan tombol voice di [LinkPredictor.tsx](file:///c:/Users/wilhe/OneDrive/Documents/nemi/cv/prujek/End/Product/Url_detector/src/app/components/LinkPredictor.tsx) untuk mendeteksi URL melalui suara (*speech-to-text*).
  * Bersuara otomatis untuk membacakan hasil deteksi (*verdict*) model ke pengguna (*text-to-speech*).
* **QR & Barcode Scanner**: Memindai QR Code dari kamera langsung atau melalui unggahan berkas gambar untuk mendeteksi URL di dalamnya menggunakan library `html5-qrcode`.
* **D3.js Neural Network Visualizer (Cara Kerja Model)**: Visualisasi grafis struktur syaraf buatan interaktif di [NeuralNetModal.tsx](file:///c:/Users/wilhe/OneDrive/Documents/nemi/cv/prujek/End/Product/Url_detector/src/app/components/analysis/NeuralNetModal.tsx) yang menunjukkan bagaimana fitur-fitur URL memengaruhi hasil deteksi akhir.
* **URL Character Heatmap**: Analisis tingkat risiko tiap karakter dalam URL yang diuji, menyoroti bagian yang mencurigakan (misalnya alamat IP atau karakter khusus) dengan warna merah/neon di [featureExtractor.ts](file:///c:/Users/wilhe/OneDrive/Documents/nemi/cv/prujek/End/Product/Url_detector/src/app/components/analysis/featureExtractor.ts).
* **3D Threat Globe**: Globe 3D berputar interaktif menggunakan Three.js di [ThreatGlobe.tsx](file:///c:/Users/wilhe/OneDrive/Documents/nemi/cv/prujek/End/Product/Url_detector/src/app/components/globe/ThreatGlobe.tsx) yang memetakan asal-usul geografis URL phishing yang terdeteksi (menggunakan API geolocation IP).
* **Cyber Terminal Logs**: Panel log simulasi terminal bergaya retro untuk menampilkan proses analitis langkah demi langkah (Encoding URL, Vectorization, Model Inference, dll.).
* **Gamification System (Badges & Levels)**: Memberikan poin, level (dari Script Kiddie hingga Neo), serta badges pencapaian kepada pengguna setelah melakukan pemindaian URL di [GamificationContext.tsx](file:///c:/Users/wilhe/OneDrive/Documents/nemi/cv/prujek/End/Product/Url_detector/src/app/context/GamificationContext.tsx).
* **Scan History & Stats Widget**: Menyimpan riwayat prediksi secara lokal menggunakan localStorage beserta tingkat keakuratannya.

### B. Fitur Backend (API)
Backend dikembangkan menggunakan FastAPI di [app.py](file:///c:/Users/wilhe/OneDrive/Documents/nemi/cv/prujek/End/Product/Url_detector/backend/app.py) dengan fitur utama:

* **Endpoint POST `/predict`**: Menerima request URL mentah, mengekstrak representasi vektor numerik menggunakan transformer, mengevaluasi di model Keras `.h5`, dan mengembalikan JSON berisi status keamanan URL:
  * `label`: `PHISHING` atau `LEGITIMATE`.
  * `confidence`: Tingkat kepercayaan model dalam persentase (%).
  * `legitimate_chance`: Peluang URL tersebut aman dalam persentase (%).
  * `is_dangerous`: Status bahaya (boolean).
* **CPU Optimization**: Dikonfigurasi dengan pustaka `tensorflow-cpu` dan `torch+cpu` untuk mempercepat pemuatan model dan mengurangi ukuran Docker Image tanpa memerlukan GPU.
* **Auto Documentations**: Dukungan otomatis API docs menggunakan OpenAPI / Swagger UI di endpoint `/docs`.

---

## 3. 🛠️ Teknologi yang Digunakan (Tech Stack)

| Sektor | Teknologi | Kegunaan |
| :--- | :--- | :--- |
| **Frontend Core** | React, Vite, TypeScript | Framework utama & build tool cepat. |
| **Styling & Animasi** | Tailwind CSS, CSS Vanilla, Framer Motion | Tampilan antarmuka cyberpunk & animasi transisi. |
| **3D & Visualisasi** | Three.js, React Three Fiber, D3.js | Globe 3D interaktif & grafis Neural Network. |
| **Backend API** | FastAPI, Uvicorn | Web server Python berkecepatan tinggi. |
| **Data & Deep Learning** | TensorFlow CPU, PyTorch CPU | Engine eksekusi model Deep Learning. |
| **NLP (Embedding)** | Sentence-Transformers (all-MiniLM-L6-v2) | Mengubah URL string menjadi vektor 384 dimensi. |
| **Analisis Data** | Scikit-learn, Pandas, Numpy | Pemrosesan dataset dan pipeline pelatihan model. |
| **Lain-lain** | Confetti, Lucide Icons, html5-qrcode, Howler.js | Audio, pemindaian kamera QR, dan dekorasi visual. |

---

## 4. 📊 Dataset & Bentuk Datanya
Dataset disimpan di berkas CSV lokal [data.csv](file:///c:/Users/wilhe/OneDrive/Documents/nemi/cv/prujek/End/Product/Url_detector/backend/data/data.csv) yang memiliki ukuran 8.2 MB dengan total 80.975 baris data.

Setiap baris data memiliki kolom-kolom sebagai berikut:
* **URL**: Teks alamat URL yang diperiksa (contoh: `https://www.womensweekly.com.sg`).
* **url_length**: Panjang karakter URL.
* **has_ip_address**: Apakah domain berupa alamat IP (1 jika ya, 0 jika tidak).
* **dot_count**: Jumlah karakter titik (.).
* **https_flag**: Apakah protokolnya HTTPS (1) atau HTTP (0).
* **url_entropy**: Shannon Entropy dari teks URL untuk melihat keacakan karakter.
* **token_count**: Jumlah token pemisah dalam URL.
* **subdomain_count**: Jumlah subdomain yang terdeteksi.
* **query_param_count**: Jumlah parameter kueri.
* **tld_length**: Panjang Top-Level Domain (misal .com panjangnya 3).
* **path_length**: Panjang bagian path URL.
* **has_hyphen_in_domain**: Apakah domain memiliki tanda hubung (-).
* **number_of_digits**: Jumlah angka numerik dalam URL.
* **tld_popularity**: Indeks popularitas TLD.
* **suspicious_file_extension**: Apakah diakhiri ekstensi mencurigakan (seperti .exe, .bat, .lnk).
* **domain_name_length**: Panjang nama domain utama.
* **percentage_numeric_chars**: Persentase karakter angka dibanding panjang URL.
* **ClassLabel**: Target kelas klasifikasi (0.0 = PHISHING, 1.0 = LEGITIMATE).

> [!NOTE]
> Meskipun dataset berisi banyak fitur ekstraksi heuristik (panjang URL, jumlah titik, dll.), pada proses pelatihan di [training.ipynb](file:///c:/Users/wilhe/OneDrive/Documents/nemi/cv/prujek/End/Product/Url_detector/backend/notebooks/training.ipynb), model hanya menggunakan teks mentah kolom URL yang kemudian dikonversi menjadi dense vector representation berkekuatan 384 dimensi menggunakan model embedding `all-MiniLM-L6-v2`. Kolom heuristik lainnya digunakan di bagian frontend untuk analisis rincian visual.

---

## 5. 📈 Metrik Pelatihan Model (Metrics)
Proses pemodelan yang dilakukan dalam [training.ipynb](file:///c:/Users/wilhe/OneDrive/Documents/nemi/cv/prujek/End/Product/Url_detector/backend/notebooks/training.ipynb) menggunakan struktur Neural Network sebagai berikut:

**Arsitektur Model:**
* **Input layer**: 384 Unit (berdasarkan output Sentence Transformer).
* **Dense Layer**: 128 Unit dengan fungsi aktivasi relu.
* **Dropout Layer**: 0.3 (untuk mencegah overfitting).
* **Dense Layer**: 64 Unit dengan fungsi aktivasi relu.
* **Dropout Layer**: 0.2 (untuk mencegah overfitting).
* **Output Layer**: 1 Unit dengan fungsi aktivasi sigmoid (mengembalikan probabilitas legitimate 0 s.d 1).

**Metrik & Evaluasi Model:**
* **Loss Function**: `binary_crossentropy` (karena klasifikasi biner).
* **Optimizer**: `adam`.
* **Accuracy**: Pada proses training, akurasi model mencapai 97.08% pada epoch ke-11.
* **Callback**: Menggunakan `EarlyStopping` dengan parameter `patience=3` untuk menghentikan latihan otomatis jika nilai loss tidak lagi menurun guna meminimalisir overfitting.
