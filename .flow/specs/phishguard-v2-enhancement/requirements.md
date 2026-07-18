# Dokumen Persyaratan — PhishGuard v2 Enhancement

## Pendahuluan

PhishGuard v2 Enhancement adalah serangkaian peningkatan besar pada aplikasi web deteksi URL phishing yang sudah ada. Aplikasi saat ini memiliki frontend React + Vite + Tailwind CSS dengan fitur deteksi URL, QR scanner, riwayat scan, statistik, dan halaman About Us bertema cyberpunk. Backend menggunakan FastAPI dengan model deep learning.

Dokumen ini mendefinisikan persyaratan untuk 12 fitur baru yang akan meningkatkan pengalaman pengguna secara signifikan: sistem HUD interaktif, background WebGL shader reaktif, globe 3D dengan threat intelligence, terminal command mode, gamifikasi & progress pengguna, analisis mendalam dengan visualisasi neural network, mode kolaborasi real-time, perintah suara & speech synthesis, PWA + offline mode, threat meter animasi dengan audio feedback, micro-interactions Framer Motion, dan sistem multi-tema cyberpunk.

Semua fitur baru harus terintegrasi dengan mulus ke dalam arsitektur yang ada (React 18, Vite, Tailwind CSS, Three.js, Framer Motion, Recharts, FastAPI) tanpa merusak fungsionalitas yang sudah berjalan.

---

## Glosarium

- **PhishGuard**: Nama sistem aplikasi web deteksi URL phishing.
- **HUD (Heads-Up Display)**: Antarmuka overlay yang menampilkan informasi status sistem secara real-time.
- **Shader**: Program GPU yang berjalan di WebGL untuk menghasilkan efek visual.
- **Globe**: Komponen Three.js berbentuk bola dunia 3D yang berputar.
- **Threat Intelligence**: Data intelijen ancaman berupa lokasi geografis server URL phishing.
- **Terminal**: Antarmuka baris perintah bergaya terminal komputer.
- **Badge**: Penghargaan virtual yang diberikan kepada pengguna atas pencapaian tertentu.
- **Level**: Tingkatan kemampuan pengguna berdasarkan jumlah scan yang dilakukan.
- **Neural Network Visualization**: Representasi visual grafik node-link dari fitur-fitur model machine learning.
- **Heatmap**: Visualisasi warna pada karakter URL yang menunjukkan kontribusi tiap bagian terhadap prediksi.
- **Collaboration Mode**: Mode berbagi scan antar pengguna secara real-time melalui WebSocket atau simulasi.
- **Speech Recognition**: Kemampuan browser mengenali perintah suara pengguna via Web Speech API.
- **Speech Synthesis**: Kemampuan browser membacakan teks dengan suara sintetis via Web Speech API.
- **PWA (Progressive Web App)**: Aplikasi web yang dapat diinstal dan berjalan secara offline.
- **Service Worker**: Script background browser yang mengelola caching dan offline mode.
- **Threat Meter**: Gauge analog yang menampilkan tingkat ancaman berdasarkan confidence score.
- **Confetti**: Efek visual partikel berwarna yang jatuh sebagai perayaan.
- **Tema**: Skema warna dan efek visual yang dapat dipilih pengguna.
- **CSS Variables**: Variabel CSS yang digunakan untuk mengelola warna dan efek tema secara dinamis.
- **Scanline**: Efek garis horizontal tipis yang mensimulasikan tampilan monitor CRT lama.
- **Radar**: Komponen visual berbentuk lingkaran dengan garis berputar yang mensimulasikan radar militer.
- **Typewriter Effect**: Efek teks yang muncul karakter per karakter seperti diketik.
- **Chromatic Aberration**: Efek post-processing yang memisahkan saluran warna RGB untuk kesan glitch.
- **Workbox**: Library Google untuk membangun service worker PWA.
- **LocalStorage**: Penyimpanan data persisten di browser pengguna.
- **Confidence Score**: Nilai persentase keyakinan model terhadap prediksi phishing (0–100%).
- **Verdict**: Hasil akhir prediksi model: "PHISHING" atau "LEGITIMATE".
- **ip-api.com**: Layanan API publik untuk mendapatkan informasi geolokasi dari alamat IP atau domain.
- **canvas-confetti**: Library JavaScript untuk efek confetti berbasis canvas.
- **Howler.js**: Library JavaScript untuk manajemen audio di browser.
- **D3.js**: Library JavaScript untuk visualisasi data berbasis SVG/Canvas.
- **Pusher**: Layanan WebSocket berbasis cloud untuk komunikasi real-time.
- **vite-plugin-pwa**: Plugin Vite untuk menghasilkan manifest dan service worker PWA secara otomatis.
- **@react-three/fiber**: Renderer React untuk Three.js.
- **@react-three/drei**: Koleksi helper dan abstraksi untuk @react-three/fiber.
- **Framer Motion**: Library animasi React berbasis physics.
- **Spring Physics**: Model animasi berbasis fisika pegas yang menghasilkan gerakan natural.
- **Stagger Children**: Teknik animasi di mana elemen-elemen anak muncul secara berurutan dengan jeda.
- **Drag to Dismiss**: Interaksi di mana pengguna dapat menggeser elemen untuk menutupnya.
- **Neon Noir**: Tema default dengan warna hijau neon (#00ff9d) dan ungu di atas latar hitam.
- **Crimson Dawn**: Tema alternatif dengan warna merah dan hitam.
- **Arctic Hack**: Tema alternatif dengan warna biru neon dan putih es.

---

## Persyaratan

### Persyaratan 1: Interactive HUD (Heads-Up Display)

**User Story:** Sebagai pengguna, saya ingin antarmuka navigasi yang lebih imersif dan responsif terhadap aktivitas saya, sehingga pengalaman menggunakan PhishGuard terasa seperti mengoperasikan sistem keamanan siber profesional.

#### Kriteria Penerimaan

1. WHEN pengguna mengarahkan kursor ke tepi kiri layar atau melakukan swipe dari tepi kiri pada perangkat sentuh, THE HUD_System SHALL menampilkan panel navigasi HUD dengan animasi slide-in dalam waktu kurang dari 300ms.
2. WHEN pengguna memindahkan kursor menjauh dari area HUD, THE HUD_System SHALL menyembunyikan panel navigasi HUD dengan animasi slide-out dalam waktu kurang dari 300ms.
3. WHILE panel HUD ditampilkan, THE HUD_System SHALL menampilkan efek glow neon yang mengikuti posisi kursor di sekitar item menu.
4. THE HUD_System SHALL menampilkan scanlines halus di seluruh layar dengan opacity default 0.03.
5. WHEN proses scan URL sedang berlangsung, THE HUD_System SHALL meningkatkan opacity scanlines menjadi 0.08 untuk memberikan umpan balik visual aktivitas.
6. THE HUD_System SHALL menampilkan komponen Radar di pojok kanan atas layar dengan animasi rotasi lambat saat idle.
7. WHEN hasil prediksi menunjukkan label "PHISHING", THE HUD_System SHALL menampilkan animasi titik merah berdenyut (pulse) pada komponen Radar.
8. THE HUD_System SHALL menampilkan status terminal di bagian bawah panel HUD dengan teks: "> KERNEL ACTIVE", "> ENCRYPTION OK", "> MODEL READY".
9. IF browser pengguna tidak mendukung pointer events, THEN THE HUD_System SHALL menampilkan tombol toggle permanen untuk membuka/menutup panel HUD.
10. THE HUD_System SHALL menggantikan sidebar statis yang ada saat ini tanpa menghilangkan fungsionalitas navigasi antar halaman.

---

### Persyaratan 2: WebGL Shader Background dengan Reaksi Real-Time

**User Story:** Sebagai pengguna, saya ingin background aplikasi yang bereaksi secara visual terhadap aktivitas scan, sehingga saya mendapatkan umpan balik visual yang imersif selama proses analisis URL.

#### Kriteria Penerimaan

1. THE Shader_Background SHALL menampilkan efek gelombang data (data stream) menggunakan Three.js shader material sebagai background fullscreen.
2. THE Shader_Background SHALL diimplementasikan sebagai komponen React terpisah menggunakan @react-three/fiber dengan optimasi useFrame.
3. WHEN proses scan URL dimulai, THE Shader_Background SHALL meningkatkan intensitas dan kecepatan gelombang shader secara bertahap dalam 500ms.
4. WHEN proses scan URL selesai, THE Shader_Background SHALL mengembalikan intensitas dan kecepatan gelombang ke nilai default dalam 1000ms.
5. WHEN proses scan berlangsung, THE Shader_Background SHALL menampilkan matrix rain dengan karakter Unicode yang lebih agresif (kecepatan dan kepadatan meningkat 2x).
6. WHEN hasil prediksi tersedia, THE Shader_Background SHALL menyesuaikan intensitas efek post-processing (glow dan chromatic aberration) berdasarkan nilai Confidence Score: intensitas rendah untuk score 0–30%, sedang untuk 30–70%, tinggi untuk 70–100%.
7. THE Shader_Background SHALL mempertahankan frame rate minimal 30 FPS pada perangkat dengan GPU terintegrasi menggunakan teknik optimasi useMemo dan useCallback.
8. IF perangkat pengguna tidak mendukung WebGL, THEN THE Shader_Background SHALL menampilkan fallback berupa background warna solid dengan animasi CSS sederhana.

---

### Persyaratan 3: WebGL Globe dengan Threat Intelligence Layer

**User Story:** Sebagai pengguna, saya ingin melihat visualisasi geografis dari ancaman phishing yang terdeteksi, sehingga saya dapat memahami distribusi global serangan phishing secara intuitif.

#### Kriteria Penerimaan

1. THE Globe_Component SHALL menampilkan globe 3D yang berputar menggunakan @react-three/fiber dan @react-three/drei dengan tekstur bumi.
2. WHEN URL phishing berhasil terdeteksi, THE Globe_Component SHALL mengirim permintaan ke ip-api.com untuk mendapatkan koordinat geografis dari domain URL tersebut.
3. IF permintaan ke ip-api.com gagal atau domain tidak dapat di-resolve, THEN THE Globe_Component SHALL menggunakan data lokasi dummy yang dihasilkan secara acak dari riwayat scan di LocalStorage.
4. THE Globe_Component SHALL menampilkan titik merah berdenyut pada koordinat geografis server URL phishing yang terdeteksi di permukaan globe.
5. THE Globe_Component SHALL menampilkan animasi orbit satellite yang bergerak mengelilingi globe dengan statistik real-time (total scan, total phishing).
6. WHEN pengguna mengklik titik merah pada globe, THE Globe_Component SHALL menampilkan modal atau panel samping yang berisi daftar URL phishing yang terkait dengan lokasi tersebut.
7. THE Globe_Component SHALL mengikuti gerakan mouse pengguna dengan rotasi globe yang halus (damping factor 0.05).
8. THE Globe_Component SHALL menggunakan data dari LocalStorage (riwayat scan) untuk menampilkan titik-titik ancaman yang sudah ada saat aplikasi pertama kali dimuat.
9. IF LocalStorage tidak memiliki data riwayat scan, THEN THE Globe_Component SHALL menampilkan globe tanpa titik ancaman dengan pesan "No threat data available".

---

### Persyaratan 4: Terminal Command Mode

**User Story:** Sebagai pengguna yang terbiasa dengan antarmuka baris perintah, saya ingin dapat mengoperasikan PhishGuard melalui perintah teks bergaya terminal, sehingga saya dapat bekerja lebih cepat dan efisien.

#### Kriteria Penerimaan

1. WHEN pengguna menekan kombinasi tombol Ctrl+K (atau Cmd+K di macOS), THE Terminal_Component SHALL menampilkan command palette bergaya terminal dengan animasi fade-in.
2. WHEN pengguna menekan Escape atau kombinasi Ctrl+K kembali, THE Terminal_Component SHALL menyembunyikan command palette dengan animasi fade-out.
3. THE Terminal_Component SHALL mendukung perintah berikut: `scan <url>`, `history`, `stats`, `clear`, `theme <nama_tema>`, `export logs`.
4. WHEN pengguna menjalankan perintah `scan <url>`, THE Terminal_Component SHALL memulai proses analisis URL yang diberikan dan menampilkan output dengan efek typewriter.
5. WHEN pengguna menjalankan perintah `history`, THE Terminal_Component SHALL menampilkan 10 entri riwayat scan terakhir dari LocalStorage dengan efek typewriter.
6. WHEN pengguna menjalankan perintah `stats`, THE Terminal_Component SHALL menampilkan statistik total scan, total phishing, dan total legitimate dari LocalStorage.
7. WHEN pengguna menjalankan perintah `clear`, THE Terminal_Component SHALL menghapus semua output yang ditampilkan di terminal.
8. WHEN pengguna menjalankan perintah `theme <nama_tema>`, THE Terminal_Component SHALL mengubah tema aplikasi ke tema yang diminta (neon-noir, crimson-dawn, arctic-hack).
9. WHEN pengguna menjalankan perintah `export logs`, THE Terminal_Component SHALL mengunduh file JSON berisi seluruh riwayat scan dari LocalStorage.
10. IF pengguna memasukkan perintah yang tidak dikenal, THEN THE Terminal_Component SHALL menampilkan pesan error "Command not found: <perintah>" dengan warna merah.
11. THE Terminal_Component SHALL menampilkan semua output teks dengan warna hijau neon (#00ff9d) dan efek typewriter dengan kecepatan 30ms per karakter.
12. THE Terminal_Component SHALL dapat disembunyikan dan ditampilkan kembali tanpa kehilangan riwayat output sesi saat ini.

---

### Persyaratan 5: Gamifikasi & User Progress

**User Story:** Sebagai pengguna, saya ingin mendapatkan penghargaan atas aktivitas scan yang saya lakukan, sehingga penggunaan PhishGuard terasa lebih menyenangkan dan memotivasi saya untuk terus menggunakan aplikasi.

#### Kriteria Penerimaan

1. THE Gamification_System SHALL menyimpan data level, badge, dan total scan pengguna di LocalStorage dengan kunci "phishguard_gamification".
2. THE Gamification_System SHALL menghitung level pengguna berdasarkan total scan: "Script Kiddie" (0–9 scan), "White Hat" (10–49 scan), "Elite Hacker" (50–99 scan), "Neo" (100+ scan).
3. WHEN total scan pengguna mencapai ambang batas level baru, THE Gamification_System SHALL menampilkan notifikasi level up dengan animasi.
4. THE Gamification_System SHALL memberikan badge kepada pengguna berdasarkan pencapaian berikut: scan pertama (ke-1), scan ke-10, scan ke-50, deteksi phishing pertama, confidence score pertama kali di atas 95%, scan QR pertama.
5. WHEN pengguna mencapai pencapaian baru, THE Gamification_System SHALL menampilkan notifikasi badge dengan nama dan deskripsi badge yang diperoleh.
6. WHEN hasil prediksi menunjukkan label "PHISHING" dengan Confidence Score lebih dari 95%, THE Gamification_System SHALL menampilkan efek confetti hijau neon menggunakan canvas-confetti selama 3 detik.
7. THE Gamification_System SHALL menampilkan widget progress yang menunjukkan level saat ini, total scan, dan daftar badge yang sudah diperoleh.
8. THE Gamification_System SHALL menampilkan leaderboard lokal (personal best) yang mencatat rekor tertinggi: scan terbanyak dalam satu sesi, confidence score tertinggi yang pernah dicapai.
9. IF data gamifikasi di LocalStorage rusak atau tidak valid, THEN THE Gamification_System SHALL mereset data ke nilai awal tanpa menampilkan error kepada pengguna.
10. THE Gamification_System SHALL mempertahankan data badge dan level yang sudah diperoleh meskipun pengguna menutup dan membuka kembali browser.

---

### Persyaratan 6: Deep Dive Analysis dengan Visualisasi Neural Network

**User Story:** Sebagai pengguna yang ingin memahami cara kerja model, saya ingin melihat visualisasi fitur-fitur yang mempengaruhi keputusan prediksi, sehingga saya dapat memahami mengapa sebuah URL diklasifikasikan sebagai phishing atau legitimate.

#### Kriteria Penerimaan

1. WHEN hasil prediksi tersedia, THE Analysis_Visualization SHALL menampilkan tombol "Lihat Cara Kerja Model" di area hasil analisis.
2. WHEN pengguna mengklik tombol "Lihat Cara Kerja Model", THE Analysis_Visualization SHALL membuka modal atau drawer yang berisi visualisasi neural network.
3. THE Analysis_Visualization SHALL menampilkan grafik node-link menggunakan D3.js yang merepresentasikan fitur-fitur URL yang mempengaruhi keputusan prediksi.
4. THE Analysis_Visualization SHALL mensimulasikan feature importance berdasarkan karakteristik URL yang di-scan: panjang URL, keberadaan karakter khusus (@, -, //), keberadaan kata kunci mencurigakan (login, secure, bank, verify), jumlah subdomain, dan penggunaan HTTPS.
5. THE Analysis_Visualization SHALL menampilkan heatmap warna pada karakter-karakter URL yang di-scan, di mana warna merah menunjukkan kontribusi tinggi terhadap prediksi phishing dan warna hijau menunjukkan kontribusi rendah.
6. THE Analysis_Visualization SHALL menampilkan label persentase kontribusi pada setiap node fitur dalam grafik neural network.
7. WHEN pengguna menutup modal atau drawer, THE Analysis_Visualization SHALL menyimpan state visualisasi sehingga dapat dibuka kembali tanpa re-komputasi.
8. IF URL yang di-scan memiliki panjang lebih dari 200 karakter, THEN THE Analysis_Visualization SHALL memotong tampilan heatmap URL dengan indikator "..." dan tooltip yang menampilkan URL lengkap.

---

### Persyaratan 7: Real-Time Collaboration Mode

**User Story:** Sebagai pengguna, saya ingin mengetahui URL berbahaya yang sedang dipindai oleh pengguna lain secara real-time, sehingga saya dapat mendapatkan informasi ancaman terkini dari komunitas pengguna PhishGuard.

#### Kriteria Penerimaan

1. THE Collaboration_System SHALL menampilkan threat board di area HUD atau sidebar yang berisi daftar URL yang baru dipindai oleh pengguna lain.
2. THE Collaboration_System SHALL mensimulasikan aktivitas pengguna lain menggunakan setInterval dengan interval 5–15 detik menggunakan data mock URL phishing yang sudah didefinisikan.
3. WHERE koneksi WebSocket atau Pusher tersedia, THE Collaboration_System SHALL menggunakan koneksi real-time tersebut sebagai pengganti simulasi setInterval.
4. WHEN ada URL baru yang dipindai oleh pengguna lain (simulasi atau real), THE Collaboration_System SHALL menampilkan notifikasi: "> User_[randomID] memindai URL [kategori]" di terminal atau toast notification.
5. THE Collaboration_System SHALL menampilkan maksimal 10 entri terbaru di threat board, dengan entri lama dihapus secara otomatis.
6. WHEN pengguna mengklik entri di threat board, THE Collaboration_System SHALL mengisi input URL dengan URL tersebut untuk memudahkan analisis lebih lanjut.
7. THE Collaboration_System SHALL menghasilkan User ID acak (format: User_XXXX di mana X adalah karakter alfanumerik) yang persisten selama satu sesi browser.
8. IF koneksi WebSocket terputus, THEN THE Collaboration_System SHALL secara otomatis beralih ke mode simulasi setInterval dan menampilkan indikator "OFFLINE MODE" pada threat board.

---

### Persyaratan 8: Voice Command & Speech Synthesis

**User Story:** Sebagai pengguna, saya ingin dapat mengoperasikan PhishGuard menggunakan perintah suara dan mendengar hasil analisis dibacakan, sehingga saya dapat menggunakan aplikasi secara hands-free.

#### Kriteria Penerimaan

1. THE Voice_System SHALL menampilkan tombol mikrofon di samping input URL yang dapat diklik untuk mengaktifkan pengenalan suara.
2. WHEN pengguna mengklik tombol mikrofon, THE Voice_System SHALL memulai sesi Web Speech API SpeechRecognition dengan bahasa default "id-ID" (Bahasa Indonesia) dan fallback "en-US".
3. WHEN Voice_System mengenali perintah "scan [URL]" atau "pindai [URL]", THE Voice_System SHALL mengisi input URL dengan URL yang disebutkan dan memulai proses analisis.
4. WHEN Voice_System mengenali perintah "tampilkan riwayat" atau "show history", THE Voice_System SHALL menampilkan panel riwayat scan.
5. WHEN Voice_System mengenali perintah "apa itu phishing" atau "what is phishing", THE Voice_System SHALL menampilkan modal penjelasan singkat tentang phishing.
6. WHEN hasil prediksi tersedia dan fitur speech synthesis diaktifkan, THE Voice_System SHALL membacakan verdict menggunakan Web Speech API SpeechSynthesis dengan pitch 0.8 dan rate 0.9 untuk efek suara robotik.
7. THE Voice_System SHALL menampilkan efek visual gelombang suara (waveform animasi) saat sedang mendengarkan perintah suara.
8. THE Voice_System SHALL menyediakan toggle on/off untuk fitur speech synthesis yang disimpan di LocalStorage.
9. IF browser pengguna tidak mendukung Web Speech API, THEN THE Voice_System SHALL menyembunyikan tombol mikrofon dan toggle speech synthesis, serta menampilkan pesan "Browser tidak mendukung fitur suara" saat pengguna mencoba mengaksesnya.
10. WHEN sesi pengenalan suara aktif, THE Voice_System SHALL menampilkan indikator visual berupa animasi pulse pada tombol mikrofon.

---

### Persyaratan 9: PWA + Offline Mode dengan Service Worker

**User Story:** Sebagai pengguna, saya ingin dapat menginstal PhishGuard sebagai aplikasi di perangkat saya dan mengaksesnya saat offline, sehingga saya dapat melihat riwayat scan dan statistik kapan saja tanpa koneksi internet.

#### Kriteria Penerimaan

1. THE PWA_System SHALL menyediakan file manifest.json yang valid dengan nama aplikasi "PhishGuard", deskripsi, warna tema (#0a0f0f), warna background (#0a0f0f), dan ikon dalam ukuran 192x192 dan 512x512 piksel.
2. THE PWA_System SHALL mengimplementasikan service worker menggunakan vite-plugin-pwa (Workbox) untuk melakukan precaching semua aset statis (HTML, CSS, JS, gambar).
3. WHEN pengguna mengakses aplikasi untuk pertama kali dengan koneksi internet, THE PWA_System SHALL menyimpan semua aset statis ke cache service worker.
4. WHILE aplikasi berjalan dalam mode offline, THE PWA_System SHALL menampilkan riwayat scan dan statistik dari LocalStorage tanpa error.
5. WHILE aplikasi berjalan dalam mode offline dan pengguna mencoba melakukan scan URL, THE PWA_System SHALL menampilkan pesan "Deteksi URL memerlukan koneksi internet. Anda sedang dalam mode offline." tanpa melakukan permintaan ke backend.
6. WHEN browser mendeteksi bahwa aplikasi memenuhi kriteria installable PWA, THE PWA_System SHALL menampilkan prompt install dengan teks "Instal PhishGuard sebagai aplikasi".
7. THE PWA_System SHALL menampilkan indikator status koneksi (online/offline) di area HUD atau header aplikasi.
8. IF service worker gagal diregistrasi, THEN THE PWA_System SHALL tetap menjalankan aplikasi dalam mode web biasa tanpa menampilkan error kepada pengguna.

---

### Persyaratan 10: Animated Threat Meter & Audio Feedback

**User Story:** Sebagai pengguna, saya ingin melihat indikator visual dan mendengar umpan balik audio yang mencerminkan tingkat ancaman URL yang dianalisis, sehingga saya dapat langsung memahami tingkat bahaya tanpa membaca angka.

#### Kriteria Penerimaan

1. THE Threat_Meter SHALL menampilkan gauge analog setengah lingkaran di area hasil analisis yang menunjukkan nilai Confidence Score (0–100%).
2. THE Threat_Meter SHALL menggunakan skema warna berikut: hijau (#00ff9d) untuk nilai 0–30%, kuning (#ffff00) untuk nilai 30–70%, merah (#ff3b3b) untuk nilai 70–100%.
3. WHEN hasil prediksi tersedia, THE Threat_Meter SHALL menganimasikan jarum gauge dari posisi 0 ke nilai Confidence Score dalam durasi 1.5 detik dengan easing ease-out.
4. WHEN hasil prediksi tersedia dan fitur audio diaktifkan, THE Threat_Meter SHALL memutar audio feedback (beep) menggunakan Howler.js dengan pitch yang meningkat sesuai nilai Confidence Score: pitch rendah (0.5) untuk 0–30%, pitch sedang (1.0) untuk 30–70%, pitch tinggi (2.0) untuk 70–100%.
5. THE Threat_Meter SHALL menyediakan toggle on/off untuk fitur audio feedback yang disimpan di LocalStorage dengan kunci "phishguard_audio_enabled".
6. WHEN fitur audio dinonaktifkan, THE Threat_Meter SHALL tidak memutar suara apapun meskipun hasil prediksi tersedia.
7. THE Threat_Meter SHALL menampilkan label nilai numerik Confidence Score di tengah gauge dengan animasi count-up dari 0 ke nilai aktual.
8. IF Howler.js gagal memuat atau browser memblokir autoplay audio, THEN THE Threat_Meter SHALL menampilkan indikator visual sebagai pengganti tanpa menampilkan error kepada pengguna.

---

### Persyaratan 11: Micro-Interactions dengan Framer Motion

**User Story:** Sebagai pengguna, saya ingin setiap interaksi dengan antarmuka terasa responsif dan hidup, sehingga pengalaman menggunakan PhishGuard terasa premium dan menyenangkan.

#### Kriteria Penerimaan

1. THE Micro_Interaction_System SHALL mengimplementasikan drag-to-dismiss pada komponen toast notification, di mana pengguna dapat menggeser notifikasi ke kanan untuk menutupnya.
2. THE Micro_Interaction_System SHALL mengimplementasikan drag-to-dismiss pada kartu riwayat scan, di mana pengguna dapat menggeser kartu ke kiri untuk menghapusnya dari riwayat.
3. THE Micro_Interaction_System SHALL mengimplementasikan efek transisi rute "glitch" menggunakan Framer Motion variants saat pengguna berpindah antara halaman "/" dan "/about".
4. THE Micro_Interaction_System SHALL mengimplementasikan stagger children animation pada grid kartu anggota tim di halaman About Us, di mana setiap kartu muncul dengan jeda 0.1 detik setelah kartu sebelumnya.
5. THE Micro_Interaction_System SHALL mengimplementasikan spring physics hover effect pada semua tombol utama (Analyze URL, tombol navigasi HUD) menggunakan Framer Motion spring dengan stiffness 400 dan damping 17.
6. THE Micro_Interaction_System SHALL mengimplementasikan spring physics hover effect pada semua kartu (CyberCard, CollaboratorCard) dengan scale 1.02 saat hover.
7. THE Micro_Interaction_System SHALL mengimplementasikan Framer Motion variants untuk animasi masuk (enter) dan keluar (exit) pada semua komponen modal dan drawer.
8. WHILE pengguna mengaktifkan preferensi "reduce motion" di sistem operasi, THE Micro_Interaction_System SHALL menonaktifkan semua animasi non-esensial menggunakan hook useReducedMotion dari Framer Motion.

---

### Persyaratan 12: Dark/Light Mode dengan Tema Cyberpunk Berbeda

**User Story:** Sebagai pengguna, saya ingin dapat memilih tema visual yang sesuai dengan preferensi saya dari beberapa pilihan tema cyberpunk, sehingga pengalaman visual PhishGuard dapat dipersonalisasi.

#### Kriteria Penerimaan

1. THE Theme_System SHALL menyediakan 3 varian tema: "Neon Noir" (hijau #00ff9d + ungu, default), "Crimson Dawn" (merah #ff3b3b + hitam), dan "Arctic Hack" (biru neon #00bfff + putih es #e8f4f8).
2. THE Theme_System SHALL mengimplementasikan semua warna tema menggunakan CSS Variables yang didefinisikan pada elemen `:root` sehingga seluruh komponen dapat mewarisi perubahan tema secara otomatis.
3. THE Theme_System SHALL menyimpan preferensi tema pengguna di LocalStorage dengan kunci "phishguard_theme" dan memuat preferensi tersebut saat aplikasi pertama kali dibuka.
4. WHEN pengguna memilih tema baru, THE Theme_System SHALL menerapkan perubahan CSS Variables secara instan tanpa reload halaman.
5. WHEN pengguna memilih tema baru, THE Theme_System SHALL memperbarui warna material Three.js (partikel, globe, shader) agar sesuai dengan warna aksen tema yang dipilih.
6. THE Theme_System SHALL menampilkan UI pemilih tema yang dapat diakses dari HUD atau menu pengaturan, menampilkan preview warna untuk setiap tema.
7. THE Theme_System SHALL memastikan semua komponen yang menggunakan warna hardcoded (#00ff9d, #00ffff, #ff3b3b) diperbarui untuk menggunakan CSS Variables yang sesuai.
8. IF LocalStorage tidak memiliki preferensi tema tersimpan, THEN THE Theme_System SHALL menggunakan tema "Neon Noir" sebagai default.
9. THE Theme_System SHALL memastikan rasio kontras warna teks terhadap background pada setiap tema memenuhi standar keterbacaan minimum (rasio kontras 4.5:1 untuk teks normal).
