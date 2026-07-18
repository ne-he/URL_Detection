# Requirements Document

## Introduction

Fitur ini meningkatkan kualitas UI/UX aplikasi PhishGuard (phishing detection web app) yang dibangun dengan React + TypeScript + Vite + Tailwind CSS. Peningkatan mencakup tiga area utama: (1) redesain total halaman About Us dengan tema gelap dan konten nyata, (2) micro-interactions pada elemen interaktif utama, dan (3) peningkatan visual berupa custom cursor dan efek Three.js/tsParticles yang lebih interaktif. Semua perubahan harus responsif, bersih, dan reusable.

## Glossary

- **AboutUs**: Komponen React di `/about` yang menampilkan informasi proyek, misi, fitur, dan tim kolaborator.
- **LinkPredictor**: Komponen utama di `/` yang menangani input URL, analisis, QR scanner, terminal log, dan hasil prediksi.
- **GlitchText**: Komponen reusable yang menampilkan teks dengan efek glitch animasi saat hover atau selalu aktif.
- **ThreeScene**: Komponen Three.js yang merender globe wireframe sebagai background layer kanan.
- **CyberParticles**: Komponen tsParticles fullscreen dengan partikel biner dan links sebagai background layer.
- **CustomCursor**: Komponen baru yang menggantikan cursor default browser dengan lingkaran neon yang mengikuti mouse.
- **TerminalLog**: Bagian dalam LinkPredictor yang menampilkan log sistem analisis URL secara real-time.
- **CollaboratorCard**: Kartu UI dalam AboutUs yang menampilkan avatar, nama, dan peran anggota tim.
- **NeonSeparator**: Elemen dekoratif berupa garis horizontal dengan efek neon/glow.
- **CyberSweep**: Animasi garis neon yang bergerak dari kiri ke kanan di bawah input saat fokus.
- **ToastNotification**: Notifikasi singkat yang muncul dan menghilang otomatis setelah aksi paste/copy.
- **System**: Keseluruhan aplikasi PhishGuard frontend.

---

## Requirements

### Requirement 1: Redesain Halaman About Us – Tema Gelap

**User Story:** Sebagai pengunjung, saya ingin melihat halaman About Us yang profesional dengan tema gelap cyber, sehingga saya mendapat kesan yang konsisten dengan identitas visual aplikasi PhishGuard.

#### Acceptance Criteria

1. THE AboutUs SHALL menggunakan background `#0a0f0f` dengan efek noise/scan-line halus sebagai tekstur latar.
2. THE AboutUs SHALL menampilkan layout dua kolom pada layar ≥ 768px (kiri: teks konten, kanan: kartu kolaborator) dan satu kolom pada layar < 768px.
3. THE AboutUs SHALL menampilkan judul "About Link Predictor" menggunakan komponen GlitchText yang sudah ada dengan efek glitch aktif saat hover.
4. THE AboutUs SHALL menampilkan deskripsi proyek yang menjelaskan bahwa PhishGuard adalah sistem deteksi phishing berbasis deep learning.
5. THE AboutUs SHALL menampilkan seksi "Our Mission" dengan teks deskriptif tentang misi perlindungan pengguna dari ancaman phishing.
6. THE AboutUs SHALL menampilkan seksi "What We Offer" dengan empat poin: Accurate Predictions, Fast Analysis, Privacy First, dan Continuous Improvement, masing-masing dengan ikon dari lucide-react.
7. THE AboutUs SHALL menampilkan seksi "Core Collaborators" dengan tiga CollaboratorCard: satu untuk "Nehemiah Gantenk Abiez" (Lead Developer & AI Engineer), dan dua placeholder "Collaborator 2" dan "Collaborator 3" dengan deskripsi "TBA".
8. THE NeonSeparator SHALL memisahkan seksi-seksi utama dalam AboutUs dengan garis horizontal berglow warna `#00ff9d`.
9. WHEN pengguna mengarahkan mouse ke CollaboratorCard, THE CollaboratorCard SHALL menampilkan efek border neon, scale transform, dan glitch ringan pada nama kolaborator.
10. THE AboutUs SHALL dapat diakses melalui routing `/about` yang sudah ada tanpa perubahan konfigurasi router.
11. WHERE tombol "View GitHub" ditampilkan, THE AboutUs SHALL membuka URL GitHub proyek di tab baru.

---

### Requirement 2: Micro-interactions pada Tombol Analyze URL

**User Story:** Sebagai pengguna, saya ingin tombol "Analyze URL" memberikan umpan balik visual yang jelas saat diklik dan saat analisis berlangsung, sehingga saya tahu sistem sedang bekerja.

#### Acceptance Criteria

1. WHEN pengguna mengklik tombol Analyze URL, THE LinkPredictor SHALL menampilkan efek pulse neon pada tombol selama 300ms pertama.
2. WHILE analisis URL sedang berlangsung, THE LinkPredictor SHALL menampilkan teks "SCANNING..." dengan animasi berkedip (blink) pada tombol Analyze URL.
3. WHEN hasil analisis berhasil ditampilkan, THE LinkPredictor SHALL menampilkan efek glow hijau (`#00ff9d`) pada tombol selama 1 detik.
4. THE LinkPredictor SHALL menerapkan transisi CSS `all 0.2s ease` pada semua tombol interaktif.
5. WHEN pengguna mengarahkan mouse ke tombol interaktif mana pun, THE LinkPredictor SHALL menerapkan `scale(1.02)` dan perubahan box-shadow.

---

### Requirement 3: Micro-interactions pada Input URL

**User Story:** Sebagai pengguna, saya ingin input URL memberikan umpan balik visual saat saya fokus ke dalamnya, sehingga pengalaman mengetik terasa lebih responsif dan modern.

#### Acceptance Criteria

1. WHEN pengguna memfokuskan input URL, THE LinkPredictor SHALL menampilkan animasi CyberSweep — garis neon bergerak dari kiri ke kanan di bawah input — selama input dalam keadaan fokus.
2. WHEN pengguna meninggalkan fokus input URL, THE LinkPredictor SHALL menghentikan animasi CyberSweep dan mengembalikan tampilan border ke kondisi normal.
3. THE LinkPredictor SHALL mempertahankan efek border glow `#00ff9d` yang sudah ada saat input dalam keadaan fokus.

---

### Requirement 4: Micro-interactions pada Tombol Paste dan Copy

**User Story:** Sebagai pengguna, saya ingin mendapat konfirmasi visual saat melakukan aksi paste atau copy URL, sehingga saya yakin aksi berhasil dilakukan.

#### Acceptance Criteria

1. WHEN pengguna mengklik tombol Paste, THE LinkPredictor SHALL menampilkan ToastNotification dengan teks "Pasted!" yang muncul selama 1500ms lalu menghilang dengan animasi fade-out.
2. WHEN pengguna mengklik tombol Copy, THE LinkPredictor SHALL menampilkan ToastNotification dengan teks "Copied!" yang muncul selama 1500ms lalu menghilang dengan animasi fade-out.
3. THE ToastNotification SHALL muncul di posisi yang tidak menghalangi konten utama (misalnya pojok kanan bawah atau di atas tombol).
4. WHEN pengguna mengarahkan mouse ke tombol Paste atau Copy, THE LinkPredictor SHALL menampilkan tooltip singkat dengan efek glitch ringan.

---

### Requirement 5: Micro-interactions pada History Item

**User Story:** Sebagai pengguna, saya ingin item history di StatisticWidget dapat diklik untuk mengisi ulang input URL, sehingga saya bisa menganalisis ulang URL yang pernah diperiksa dengan cepat.

#### Acceptance Criteria

1. WHEN pengguna mengarahkan mouse ke item history, THE StatisticWidget SHALL menampilkan background semi-transparan, border neon, dan ikon re-analyze (misalnya RotateCcw dari lucide-react).
2. WHEN pengguna mengklik item history, THE LinkPredictor SHALL mengisi input URL dengan URL dari item history tersebut.
3. THE StatisticWidget SHALL menerima callback `onSelectUrl` sebagai prop untuk meneruskan URL yang dipilih ke komponen induk.
4. THE LinkPredictor SHALL meneruskan fungsi setter URL sebagai callback ke StatisticWidget sehingga klik history langsung mengisi input.

---

### Requirement 6: Peningkatan Terminal Log

**User Story:** Sebagai pengguna, saya ingin terminal log menampilkan setiap entri baru dengan animasi masuk yang halus dan memiliki tombol untuk membersihkan log, sehingga log lebih mudah dibaca dan dikelola.

#### Acceptance Criteria

1. WHEN entri log baru ditambahkan ke TerminalLog, THE LinkPredictor SHALL menampilkan entri tersebut dengan animasi fade-in dan slide dari kiri menggunakan framer-motion.
2. THE LinkPredictor SHALL menampilkan tombol "Clear Logs" dengan ikon Trash2 dari lucide-react di header TerminalLog.
3. WHEN pengguna mengklik tombol "Clear Logs", THE LinkPredictor SHALL mengosongkan semua entri log yang ada.
4. THE LinkPredictor SHALL menampilkan animasi collapse/expand TerminalLog yang smooth menggunakan framer-motion AnimatePresence.
5. WHILE TerminalLog dalam keadaan collapse, THE LinkPredictor SHALL tetap menampilkan jumlah entri log sebagai badge di header.

---

### Requirement 7: Custom Cursor

**User Story:** Sebagai pengguna, saya ingin melihat cursor kustom berbentuk lingkaran neon yang mengikuti gerakan mouse, sehingga pengalaman visual terasa lebih imersif dan sesuai tema cyber.

#### Acceptance Criteria

1. THE CustomCursor SHALL menampilkan lingkaran berdiameter 12px berwarna `#00ff9d` yang mengikuti posisi mouse di seluruh halaman.
2. THE System SHALL menyembunyikan cursor default browser dengan menerapkan `cursor: none` pada elemen `body`.
3. WHEN pengguna mengarahkan mouse ke elemen interaktif (tombol, link, input), THE CustomCursor SHALL berubah ukuran menjadi lebih besar (misalnya 24px) atau berubah bentuk menjadi crosshair.
4. THE CustomCursor SHALL menggunakan `requestAnimationFrame` atau event listener `mousemove` untuk mengikuti posisi mouse dengan latensi minimal.
5. WHERE perangkat adalah mobile atau touch-only (tidak ada pointer mouse), THE CustomCursor SHALL dinonaktifkan dan cursor default dikembalikan.
6. THE CustomCursor SHALL dirender sebagai komponen terpisah yang dipasang di level Layout sehingga aktif di semua halaman.

---

### Requirement 8: Three.js Globe dengan Interaksi Mouse

**User Story:** Sebagai pengguna, saya ingin globe wireframe Three.js bereaksi terhadap gerakan mouse saya, sehingga background terasa hidup dan interaktif.

#### Acceptance Criteria

1. WHEN pengguna menggerakkan mouse, THE ThreeScene SHALL merotasi globe secara parallax mengikuti posisi mouse (sumbu X dan Y) dengan faktor sensitivitas yang halus.
2. THE ThreeScene SHALL menampilkan orbit ring yang berdenyut (pulse opacity) secara periodik dengan interval 2–4 detik.
3. WHEN pengguna menggerakkan mouse mendekati partikel dot di sekitar globe, THE ThreeScene SHALL menggerakkan partikel tersebut menjauh dari posisi mouse (repulse effect).
4. THE ThreeScene SHALL mempertahankan animasi rotasi otomatis yang sudah ada sebagai baseline saat mouse tidak bergerak.
5. WHERE perangkat tidak mendukung WebGL, THE ThreeScene SHALL tidak merender dan tidak menampilkan error ke pengguna.

---

### Requirement 9: tsParticles dengan Interaksi Lebih Cerdas

**User Story:** Sebagai pengguna, saya ingin partikel biner di background bereaksi terhadap klik mouse dengan efek ledakan partikel, sehingga background terasa lebih dinamis.

#### Acceptance Criteria

1. THE CyberParticles SHALL menampilkan karakter biner (`0`, `1`) dan simbol cyber (`>`, `$`, `#`) yang bergerak secara acak.
2. WHEN pengguna mengarahkan mouse ke area partikel, THE CyberParticles SHALL menerapkan efek repulse — partikel menjauh dari posisi mouse.
3. WHEN pengguna mengklik area partikel, THE CyberParticles SHALL menambahkan partikel baru di posisi klik (push mode) untuk efek "ledakan" lokal.
4. THE CyberParticles SHALL membatasi frame rate pada 60 FPS (`fpsLimit: 60`) dan jumlah partikel maksimum untuk menjaga performa.
5. THE CyberParticles SHALL mempertahankan links antar partikel dengan warna `#00ffff` dan opacity 0.55.

---

### Requirement 10: Responsivitas dan Aksesibilitas

**User Story:** Sebagai pengguna di berbagai perangkat, saya ingin semua efek visual berfungsi dengan baik di desktop maupun mobile, sehingga pengalaman tetap optimal tanpa gangguan performa.

#### Acceptance Criteria

1. THE System SHALL menonaktifkan CustomCursor pada perangkat dengan media query `(pointer: coarse)` atau `(hover: none)`.
2. THE AboutUs SHALL menampilkan layout satu kolom pada viewport < 768px dengan urutan konten: judul → deskripsi → misi → fitur → kolaborator.
3. THE System SHALL memastikan semua animasi menggunakan `will-change` atau `transform` untuk akselerasi GPU dan tidak menyebabkan layout reflow.
4. IF perangkat memiliki preferensi `prefers-reduced-motion: reduce`, THEN THE System SHALL menonaktifkan atau meminimalkan animasi non-esensial.
5. THE System SHALL tidak menggunakan `!important` dalam deklarasi CSS apapun.
6. THE System SHALL memastikan semua elemen interaktif memiliki kontras warna yang cukup (rasio minimum 3:1 untuk teks besar, 4.5:1 untuk teks normal) sesuai standar WCAG 2.1 AA.
