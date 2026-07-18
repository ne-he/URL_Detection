# Requirements Document

## Introduction

Fitur ini meningkatkan tampilan UI aplikasi **Link Predictor** (alat deteksi phishing) dengan tema cyber/dark futuristik. Aplikasi saat ini menggunakan React 18 + TypeScript + Vite + Tailwind CSS v4 dengan backend FastAPI Python yang tidak diubah. Redesign mencakup sistem warna neon, efek glassmorphism, partikel interaktif, animasi glitch, progress bar ala Matrix, input cyber-style, overlay QR scanner, micro-interactions, dan halaman About yang informatif — semuanya tetap mempertahankan fungsionalitas inti (analisis URL, QR scanner).

---

## Glossary

- **UI**: User Interface — antarmuka visual aplikasi.
- **App**: Aplikasi Link Predictor secara keseluruhan (frontend React).
- **Theme_System**: Kumpulan CSS custom properties yang mendefinisikan palet warna dan token desain cyber/dark.
- **CyberParticles**: Komponen React yang merender efek partikel interaktif di background menggunakan `@tsparticles/react`.
- **GlitchText**: Komponen React reusable yang menampilkan teks dengan efek glitch CSS.
- **MatrixProgress**: Komponen React yang menampilkan progress bar dengan animasi Matrix rain.
- **ScanFrame**: Komponen React yang merender overlay bingkai scan QR dengan sudut neon dan garis pemindai.
- **LinkPredictor**: Komponen halaman utama yang menangani input URL, analisis, dan tampilan hasil.
- **Layout**: Komponen wrapper yang menyediakan sidebar navigasi dan struktur halaman.
- **AboutUs**: Komponen halaman informasi tentang aplikasi, model ML, dan teknologi.
- **Glassmorphism**: Efek visual kartu dengan background semi-transparan dan backdrop blur.
- **Neon_Green**: Warna aksen utama `#00ff9d` untuk elemen penting, tombol, dan border.
- **Neon_Cyan**: Warna aksen sekunder `#00ffff` untuk hover dan elemen pendukung.
- **Neon_Red**: Warna indikator phishing `#ff3b3b`.
- **Glow_Effect**: Efek `box-shadow` atau `text-shadow` dengan warna neon untuk elemen aktif/hover.
- **AnimatePresence**: API dari library `motion/react` untuk transisi masuk/keluar komponen.
- **Confidence_Bar**: Elemen visual yang menampilkan probabilitas legitimate dalam bentuk progress bar.

---

## Requirements

### Requirement 1: Sistem Tema Cyber/Dark Global

**User Story:** Sebagai pengguna, saya ingin melihat tampilan dark futuristik yang konsisten di seluruh aplikasi, sehingga pengalaman visual terasa kohesif dan modern.

#### Acceptance Criteria

1. THE Theme_System SHALL mendefinisikan CSS custom properties berikut: `--cyber-bg` (`#0a0f0f`), `--cyber-bg-alt` (`#0d1117`), `--neon-green` (`#00ff9d`), `--neon-cyan` (`#00ffff`), `--neon-red` (`#ff3b3b`), `--text-primary` (`#e0e0e0`), `--glass-bg` (`rgba(255,255,255,0.05)`), `--glass-border` (`rgba(255,255,255,0.1)`).
2. THE Theme_System SHALL mendefinisikan token `--glow-green` sebagai `0 0 15px #00ff9d` dan `--glow-cyan` sebagai `0 0 15px #00ffff` untuk digunakan sebagai nilai `box-shadow`.
3. THE App SHALL menerapkan `background-color: var(--cyber-bg)` dan `color: var(--text-primary)` pada elemen `body` secara global.
4. THE Theme_System SHALL menyertakan font `JetBrains Mono` via `@fontsource/jetbrains-mono` sebagai font monospace utama untuk elemen kode dan label teknis.
5. WHEN elemen interaktif (tombol, link, card) menerima state `hover`, THE App SHALL menerapkan `Glow_Effect` yang sesuai dengan warna aksen elemen tersebut.

---

### Requirement 2: Komponen CyberParticles

**User Story:** Sebagai pengguna, saya ingin melihat efek partikel interaktif di background, sehingga tampilan terasa hidup dan futuristik.

#### Acceptance Criteria

1. THE CyberParticles SHALL merender kanvas partikel menggunakan library `@tsparticles/react` dan `@tsparticles/slim` sebagai engine.
2. THE CyberParticles SHALL menampilkan 50 hingga 80 partikel secara bersamaan untuk menjaga performa.
3. THE CyberParticles SHALL menggunakan karakter `0`, `1`, `>`, `$`, `#` sebagai bentuk partikel dengan warna `Neon_Green` dan `Neon_Cyan`.
4. THE CyberParticles SHALL menampilkan garis koneksi antar partikel yang berdekatan dengan opacity rendah.
5. WHEN kursor pengguna bergerak di atas kanvas, THE CyberParticles SHALL menerapkan efek `repulse` sehingga partikel menjauh dari posisi kursor.
6. THE CyberParticles SHALL dirender dengan `z-index` lebih rendah dari elemen UI utama sehingga tidak menghalangi interaksi.
7. WHEN komponen pertama kali dimuat, THE CyberParticles SHALL menampilkan animasi fade-in selama 1000ms.
8. THE CyberParticles SHALL menerima prop opsional `active: boolean`; WHEN `active` bernilai `true`, THE CyberParticles SHALL meningkatkan kecepatan partikel sebesar 2x dari kecepatan normal.

---

### Requirement 3: Komponen GlitchText

**User Story:** Sebagai pengguna, saya ingin melihat efek glitch pada judul aplikasi, sehingga tampilan terasa lebih dramatis dan bertema cyber.

#### Acceptance Criteria

1. THE GlitchText SHALL menerima props `children: React.ReactNode` dan `className?: string`.
2. WHEN pengguna mengarahkan kursor ke elemen GlitchText, THE GlitchText SHALL memainkan animasi CSS glitch yang membuat teks tampak bergetar dan terbelah secara horizontal dengan offset warna merah dan cyan.
3. THE GlitchText SHALL mengimplementasikan efek glitch menggunakan CSS `@keyframes` dan pseudo-elements (`::before`, `::after`) tanpa library tambahan.
4. THE GlitchText SHALL dapat digunakan sebagai wrapper untuk teks apapun dan mewarisi ukuran font dari parent atau `className` yang diberikan.

---

### Requirement 4: Komponen MatrixProgress

**User Story:** Sebagai pengguna, saya ingin melihat progress analisis URL dengan animasi Matrix rain, sehingga pengalaman menunggu terasa lebih menarik dan bertema.

#### Acceptance Criteria

1. THE MatrixProgress SHALL menerima props `duration: number` (default `5000`) dalam milidetik dan `onComplete: () => void` sebagai callback.
2. THE MatrixProgress SHALL menampilkan animasi kolom karakter hijau yang jatuh ke bawah (Matrix rain) menggunakan HTML Canvas atau CSS animation.
3. THE MatrixProgress SHALL menampilkan indikator persentase progress (0–100%) yang diperbarui secara proporsional terhadap `duration`.
4. WHEN progress mencapai 100%, THE MatrixProgress SHALL memanggil callback `onComplete`.
5. THE MatrixProgress SHALL menampilkan karakter acak dari set `[0-9, A-Z, >, $, #]` pada kolom animasi.
6. THE MatrixProgress SHALL menggunakan warna `Neon_Green` untuk karakter animasi dengan efek `text-shadow` neon.

---

### Requirement 5: Komponen ScanFrame

**User Story:** Sebagai pengguna, saya ingin melihat overlay bingkai scan yang bertema cyber saat menggunakan QR scanner, sehingga pengalaman scanning terasa lebih imersif.

#### Acceptance Criteria

1. THE ScanFrame SHALL merender overlay di atas elemen kamera QR dengan posisi `absolute` dan dimensi yang menyesuaikan container.
2. THE ScanFrame SHALL menampilkan sudut bingkai (corner brackets) dengan warna `Neon_Green` dan ketebalan 3px di keempat sudut area scan.
3. THE ScanFrame SHALL menampilkan garis pemindai horizontal yang bergerak dari atas ke bawah secara berulang menggunakan CSS animation dengan durasi 2000ms.
4. THE ScanFrame SHALL menerapkan warna `Neon_Green` pada garis pemindai dengan efek `box-shadow` neon.
5. THE ScanFrame SHALL tidak menghalangi fungsionalitas deteksi QR dari library `html5-qrcode` yang berjalan di bawahnya.

---

### Requirement 6: Redesign Komponen Layout (Sidebar)

**User Story:** Sebagai pengguna, saya ingin sidebar navigasi tampil dengan tema cyber/dark, sehingga navigasi terasa konsisten dengan keseluruhan desain.

#### Acceptance Criteria

1. THE Layout SHALL menerapkan `background-color: var(--cyber-bg-alt)` dan `border-right: 1px solid var(--glass-border)` pada elemen sidebar.
2. THE Layout SHALL menampilkan judul "Link Predictor" menggunakan komponen GlitchText dengan ukuran font `text-xl`.
3. WHEN item navigasi dalam keadaan aktif (route yang sedang dikunjungi), THE Layout SHALL menerapkan `color: var(--neon-green)` dan `border-left: 2px solid var(--neon-green)` pada item tersebut.
4. WHEN pengguna mengarahkan kursor ke item navigasi yang tidak aktif, THE Layout SHALL menerapkan `color: var(--neon-cyan)` dan `Glow_Effect` dengan warna cyan.
5. THE Layout SHALL merender komponen CyberParticles sebagai background dengan `z-index: 0` di belakang konten sidebar.
6. THE Layout SHALL menggunakan AnimatePresence dari `motion/react` untuk transisi halaman dengan efek fade dan slide horizontal saat berpindah route.

---

### Requirement 7: Redesign Komponen LinkPredictor — Input URL

**User Story:** Sebagai pengguna, saya ingin input URL tampil dengan gaya terminal cyber, sehingga pengalaman memasukkan URL terasa sesuai tema.

#### Acceptance Criteria

1. THE LinkPredictor SHALL menampilkan prefix `$>` dengan warna `Neon_Green` di sebelah kiri elemen input URL.
2. THE LinkPredictor SHALL menerapkan `background: transparent`, `border-bottom: 1px solid var(--neon-green)`, dan `caret-color: var(--neon-green)` pada elemen input URL.
3. THE LinkPredictor SHALL menampilkan placeholder teks `"Enter URL to analyze..."` pada input URL.
4. THE LinkPredictor SHALL menampilkan tombol paste dengan ikon clipboard; WHEN paste berhasil, THE LinkPredictor SHALL mengganti ikon clipboard dengan ikon centang selama 2000ms sebelum kembali ke ikon clipboard.
5. THE LinkPredictor SHALL menerapkan Glassmorphism pada card utama dengan `background: var(--glass-bg)` dan `backdrop-filter: blur(10px)`.

---

### Requirement 8: Redesign Komponen LinkPredictor — Tombol Analyze

**User Story:** Sebagai pengguna, saya ingin tombol Analyze tampil dengan efek cyber yang menarik, sehingga aksi utama terasa menonjol.

#### Acceptance Criteria

1. THE LinkPredictor SHALL menampilkan tombol Analyze dengan animated gradient border yang berputar menggunakan CSS `@keyframes` dengan warna `Neon_Green` dan `Neon_Cyan`.
2. WHEN tombol Analyze dalam keadaan idle atau hover, THE LinkPredictor SHALL menampilkan efek scanning berupa garis cahaya yang bergerak dari kiri ke kanan menggunakan CSS animation.
3. WHEN tombol Analyze dalam keadaan `disabled` (sedang menganalisis), THE LinkPredictor SHALL menampilkan teks "Analyzing..." dengan opacity dikurangi namun tetap mempertahankan border neon.
4. WHEN pengguna mengklik tombol Analyze, THE LinkPredictor SHALL memicu prop `active: true` pada CyberParticles selama proses analisis berlangsung.

---

### Requirement 9: Redesign Komponen LinkPredictor — Hasil Prediksi

**User Story:** Sebagai pengguna, saya ingin hasil prediksi ditampilkan dengan visual yang jelas dan bertema cyber, sehingga saya dapat langsung memahami status URL yang dianalisis.

#### Acceptance Criteria

1. WHEN hasil prediksi tersedia dan label adalah `"PHISHING"`, THE LinkPredictor SHALL menampilkan teks status dengan warna `Neon_Red` dan ikon peringatan `⚠️`.
2. WHEN hasil prediksi tersedia dan label adalah `"LEGITIMATE"`, THE LinkPredictor SHALL menampilkan teks status dengan warna `Neon_Green` dan ikon perisai `🛡️`.
3. THE LinkPredictor SHALL menampilkan Confidence_Bar dengan tinggi 8px, warna fill sesuai label (Neon_Red untuk PHISHING, Neon_Green untuk LEGITIMATE), dan `box-shadow` neon pada bar yang terisi.
4. THE LinkPredictor SHALL menampilkan nilai persentase confidence di sebelah kanan Confidence_Bar.
5. THE LinkPredictor SHALL menampilkan card hasil dengan Glassmorphism dan animasi fade-in menggunakan `motion/react` saat pertama kali muncul.
6. WHEN hasil prediksi tersedia, THE LinkPredictor SHALL menampilkan komponen MatrixProgress selama proses analisis berlangsung sebelum hasil ditampilkan.

---

### Requirement 10: Redesign Komponen LinkPredictor — QR Scanner

**User Story:** Sebagai pengguna, saya ingin QR scanner tampil dengan overlay cyber dan tetap berfungsi dengan baik, sehingga saya dapat memindai QR code dengan pengalaman yang imersif.

#### Acceptance Criteria

1. WHEN mode kamera aktif, THE LinkPredictor SHALL merender komponen ScanFrame sebagai overlay di atas elemen kamera `html5-qrcode`.
2. THE LinkPredictor SHALL mempertahankan semua fungsionalitas QR scanning yang ada (kamera live, upload gambar, deteksi barcode) tanpa regresi.
3. THE LinkPredictor SHALL menampilkan tombol "Stop Camera" dengan warna `Neon_Red` dan border neon.
4. WHEN terjadi error scanning, THE LinkPredictor SHALL menampilkan pesan error dengan warna `Neon_Red` dalam card Glassmorphism.
5. THE LinkPredictor SHALL menampilkan tombol Camera dan Upload dengan gaya Glassmorphism dan border `Neon_Green`.

---

### Requirement 11: Redesign Komponen AboutUs

**User Story:** Sebagai pengguna, saya ingin halaman About menampilkan informasi nyata tentang aplikasi dengan tema cyber yang konsisten, sehingga saya dapat memahami teknologi dan tujuan aplikasi.

#### Acceptance Criteria

1. THE AboutUs SHALL menampilkan informasi nyata tentang model machine learning yang digunakan (deep learning / neural network untuk deteksi phishing berbasis URL).
2. THE AboutUs SHALL menampilkan stack teknologi yang digunakan: React 18, TypeScript, Vite, Tailwind CSS v4, FastAPI, dan model deep learning.
3. THE AboutUs SHALL menampilkan komponen CyberParticles sebagai background dengan konfigurasi yang sama seperti halaman utama.
4. THE AboutUs SHALL menerapkan tema cyber/dark yang konsisten dengan halaman utama menggunakan Glassmorphism pada card konten.
5. THE AboutUs SHALL menampilkan statistik atau metrik model (contoh: akurasi model, jumlah fitur URL yang dianalisis) dalam card terpisah dengan Glow_Effect.
6. THE AboutUs SHALL responsif pada viewport mobile (lebar minimum 320px) dengan layout single-column pada layar kecil.

---

### Requirement 12: Responsivitas dan Aksesibilitas

**User Story:** Sebagai pengguna mobile, saya ingin aplikasi tetap dapat digunakan dengan nyaman di perangkat kecil, sehingga saya dapat menganalisis URL dari mana saja.

#### Acceptance Criteria

1. THE App SHALL menampilkan layout yang dapat digunakan pada viewport dengan lebar minimum 320px.
2. WHEN viewport lebih kecil dari 768px, THE Layout SHALL menyembunyikan sidebar dan menampilkan navigasi alternatif (hamburger menu atau bottom navigation).
3. THE App SHALL mempertahankan rasio kontras warna minimum 4.5:1 antara teks utama (`#e0e0e0`) dan background (`#0a0f0f`) sesuai standar WCAG 2.1 AA.
4. THE App SHALL memastikan semua elemen interaktif (tombol, input, link) dapat diakses via keyboard dengan indikator fokus yang terlihat menggunakan warna `Neon_Cyan`.
5. THE CyberParticles SHALL menghormati preferensi `prefers-reduced-motion`; WHEN preferensi tersebut aktif, THE CyberParticles SHALL menonaktifkan animasi partikel.

---

### Requirement 13: Instalasi Dependensi Baru

**User Story:** Sebagai developer, saya ingin dependensi baru ditambahkan ke proyek dengan benar, sehingga fitur partikel dan font dapat berfungsi.

#### Acceptance Criteria

1. THE App SHALL menggunakan package `@tsparticles/react` dan `@tsparticles/slim` yang ditambahkan ke `dependencies` di `package.json`.
2. THE App SHALL menggunakan package `@fontsource/jetbrains-mono` yang ditambahkan ke `dependencies` di `package.json`.
3. WHEN package `react-icons` dibutuhkan untuk ikon tambahan, THE App SHALL menggunakan package tersebut sebagai dependensi opsional; IF ikon yang dibutuhkan sudah tersedia di `lucide-react`, THE App SHALL menggunakan `lucide-react` terlebih dahulu.
4. THE App SHALL tidak menginstal ulang atau mengubah versi `tailwindcss`, `motion`, atau `react-router` yang sudah ada.
