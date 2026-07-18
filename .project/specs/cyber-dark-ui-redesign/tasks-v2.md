# Implementation Plan: Cyber Dark UI Redesign

## Overview

Implementasi bertahap dari redesign UI cyber/dark futuristik untuk aplikasi Link Predictor. Setiap task membangun di atas task sebelumnya, dimulai dari fondasi (theme tokens, dependencies) hingga komponen individual, lalu integrasi penuh.

## Tasks

- [x] 1. Install dependencies baru
  - Jalankan: `npm install @tsparticles/react @tsparticles/slim @fontsource/jetbrains-mono`
  - Pastikan `fast-check` tersedia untuk property-based tests: `npm install --save-dev fast-check`
  - Verifikasi `package.json` memiliki semua package baru di `dependencies` / `devDependencies`
  - _Requirements: 13.1, 13.2_

- [x] 2. Tambahkan Cyber Dark Theme tokens ke CSS
  - [x] 2.1 Tambahkan CSS custom properties ke `src/styles/theme.css` dalam `:root`
    - Tambahkan `--cyber-bg`, `--cyber-bg-alt`, `--neon-green`, `--neon-cyan`, `--neon-red`, `--text-primary`, `--glass-bg`, `--glass-border`, `--glow-green`, `--glow-cyan`, `--glow-red`
    - _Requirements: 1.1, 1.2_
  - [x] 2.2 Tambahkan Tailwind v4 `@theme inline` tokens ke blok yang sudah ada di `theme.css`
    - Tambahkan `--color-cyber-bg`, `--color-cyber-bg-alt`, `--color-neon-green`, `--color-neon-cyan`, `--color-neon-red`, `--color-text-primary`, `--color-glass-bg`, `--color-glass-border`
    - _Requirements: 1.1_
  - [x] 2.3 Update `body` global styles di `src/styles/theme.css` atau `index.css`
    - Terapkan `background-color: var(--cyber-bg)` dan `color: var(--text-primary)` pada `body`
    - _Requirements: 1.3_
  - [x] 2.4 Import font JetBrains Mono di `src/styles/fonts.css`
    - Tambahkan `@import '@fontsource/jetbrains-mono'`
    - Tambahkan CSS font-family stack: `'JetBrains Mono', 'Fira Code', 'Consolas', monospace` untuk elemen kode dan label teknis
    - _Requirements: 1.4_
  - [x] 2.5 Tambahkan CSS `@keyframes` dan class glitch ke `src/styles/index.css`
    - Definisikan `.glitch-text`, `::before`, `::after` dengan `content: attr(data-text)`, `clip-path`, dan `transform: translateX`
    - Tambahkan `@keyframes glitch-1` dan `@keyframes glitch-2` untuk efek split warna merah/cyan
    - _Requirements: 3.2, 3.3_

- [x] 3. Buat komponen GlitchText
  - [x] 3.1 Buat file `src/app/components/GlitchText.tsx`
    - Implementasi interface `GlitchTextProps { children: React.ReactNode; className?: string }`
    - Render `<span className={`glitch-text ${className}`} data-text={...}>{children}</span>`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ]* 3.2 Tulis unit test untuk GlitchText
    - Test render dengan children string dan non-string
    - Test `data-text` attribute hanya di-set saat children adalah string
    - _Requirements: 3.1_

- [x] 4. Buat komponen CyberParticles
  - [x] 4.1 Buat file `src/app/components/CyberParticles.tsx`
    - Implementasi interface `CyberParticlesProps { active?: boolean }`
    - Gunakan `@tsparticles/react` v3 API: `useCallback` untuk `initParticlesEngine`, `loadSlim` sebagai engine
    - Buat fungsi `buildParticlesConfig(active: boolean, baseSpeed?: number)` yang diekspor untuk testability
    - Konfigurasi: 50-80 partikel, karakter `['0','1','>','<','#']`, warna neon-green/cyan, links, repulse on hover
    - Cek `prefers-reduced-motion` sebelum init engine; jika aktif, jangan render canvas
    - Tambahkan `data-active` dan `data-animated` attribute pada container untuk testability
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 12.5_
  - [ ]* 4.2 Tulis property test untuk CyberParticles — Property 1: Jumlah partikel dalam batas
    - `// Feature: cyber-dark-ui-redesign, Property 1: Jumlah partikel dalam batas 50-80`
    - Gunakan `fc.boolean()` untuk generate `active`, assert `config.particles.number.value >= 50 && <= 80`
    - **Property 1: Jumlah partikel dalam batas yang ditentukan**
    - **Validates: Requirements 2.2**
  - [ ]* 4.3 Tulis property test untuk CyberParticles — Property 2: Kecepatan 2x saat active
    - `// Feature: cyber-dark-ui-redesign, Property 2: Kecepatan partikel 2x saat active=true`
    - Gunakan `fc.float({ min: 0.1, max: 10 })` untuk baseSpeed, assert `active.speed === normal.speed * 2`
    - **Property 2: Kecepatan partikel 2x saat active**
    - **Validates: Requirements 2.8**
  - [ ]* 4.4 Tulis property test untuk CyberParticles — Property 9: Reduced-motion menonaktifkan partikel
    - `// Feature: cyber-dark-ui-redesign, Property 9: prefers-reduced-motion menonaktifkan animasi partikel`
    - Mock `matchMedia` untuk `prefers-reduced-motion: reduce`, assert canvas tidak dirender atau `data-animated="false"`
    - **Property 9: CyberParticles menonaktifkan animasi saat prefers-reduced-motion**
    - **Validates: Requirements 12.5**

- [x] 5. Buat komponen MatrixProgress
  - [x] 5.1 Buat file `src/app/components/MatrixProgress.tsx`
    - Implementasi interface `MatrixProgressProps { duration?: number; onComplete: () => void }`
    - Gunakan `useRef<HTMLCanvasElement>` + `requestAnimationFrame` untuk Matrix rain animation
    - Ekspor fungsi `getRandomMatrixChar(seed: number): string` dan `calculateProgress(elapsed: number, duration: number): number` untuk testability
    - Karakter dari set `[0-9, A-Z, >, $, #]`, warna `Neon_Green`, efek text-shadow neon
    - Progress counter via `setInterval` setiap 50ms; panggil `onComplete` saat 100%
    - Fallback ke simple progress bar jika `canvas.getContext('2d')` null
    - Cleanup `cancelAnimationFrame` dan `clearInterval` saat unmount
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [ ]* 5.2 Tulis unit test untuk MatrixProgress
    - Test `onComplete` dipanggil setelah `duration` selesai (gunakan `vi.useFakeTimers()`)
    - Test fallback progress bar saat canvas tidak tersedia
    - _Requirements: 4.4_
  - [ ]* 5.3 Tulis property test untuk MatrixProgress — Property 3: Karakter Matrix rain valid
    - `// Feature: cyber-dark-ui-redesign, Property 3: Karakter Matrix rain dari set valid`
    - Gunakan `fc.integer({ min: 1, max: 1000 })` sebagai seed, assert karakter ada di set valid
    - **Property 3: Karakter Matrix rain dari set yang valid**
    - **Validates: Requirements 4.5**
  - [ ]* 5.4 Tulis property test untuk MatrixProgress — Property 4: Progress proporsional
    - `// Feature: cyber-dark-ui-redesign, Property 4: Progress proporsional terhadap durasi`
    - Gunakan `fc.integer({ min: 1000, max: 10000 })` dan `fc.float({ min: 0, max: 1 })`, assert `|actual - expected| <= 2`
    - **Property 4: Progress proporsional terhadap durasi**
    - **Validates: Requirements 4.3**

- [x] 6. Buat komponen ScanFrame
  - [x] 6.1 Buat file `src/app/components/ScanFrame.tsx`
    - Pure CSS component, `position: absolute; inset: 0; pointer-events: none`
    - 4 div sudut dengan border neon-green 3px
    - Scan line div dengan `@keyframes scanline` (translateY 0% → 100%, durasi 2000ms, infinite)
    - Warna `Neon_Green` + `box-shadow` neon pada scan line
    - Tambahkan keyframes `scanline` ke `src/styles/index.css`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 6.2 Tulis unit test untuk ScanFrame
    - Test render overlay dengan `position: absolute`
    - Test `pointer-events: none` agar tidak menghalangi QR detection
    - _Requirements: 5.5_

- [x] 7. Checkpoint — Pastikan semua tests pass
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.

- [x] 8. Redesign komponen Layout
  - [x] 8.1 Update `src/app/components/Layout.tsx` dengan tema cyber/dark
    - Sidebar: `background-color: var(--cyber-bg-alt)`, `border-right: 1px solid var(--glass-border)`
    - Judul "Link Predictor" menggunakan `<GlitchText>` dengan `text-xl`
    - Active nav item: `color: var(--neon-green)`, `border-left: 2px solid var(--neon-green)`
    - Hover nav item: `color: var(--neon-cyan)` + glow effect
    - Render `<CyberParticles>` di background dengan `z-index: 0`
    - Wrap `<Outlet>` dengan `<AnimatePresence>` dari `motion/react` untuk transisi fade + slide horizontal
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - [x] 8.2 Tambahkan responsive mobile navigation ke Layout
    - Sembunyikan sidebar saat viewport < 768px
    - Tampilkan hamburger menu atau bottom navigation sebagai alternatif
    - _Requirements: 12.1, 12.2_
  - [ ]* 8.3 Tulis property test untuk Layout — Property 6: Active nav item tepat satu
    - `// Feature: cyber-dark-ui-redesign, Property 6: Tepat satu nav item aktif sesuai route`
    - Ekspor fungsi `getNavItems()` dan `isNavItemActive(path, route)` dari Layout untuk testability
    - Gunakan `fc.constantFrom('/', '/about')`, assert tepat 1 item aktif
    - **Property 6: Active nav item styling konsisten dengan route**
    - **Validates: Requirements 6.3**

- [-] 9. Redesign komponen LinkPredictor
  - [-] 9.1 Update input URL dan card utama di `src/app/components/LinkPredictor.tsx`
    - Card utama: Glassmorphism (`background: var(--glass-bg)`, `backdrop-filter: blur(10px)`)
    - Input URL: prefix `$>` neon-green, `background: transparent`, `border-bottom: 1px solid var(--neon-green)`, `caret-color: var(--neon-green)`, placeholder `"Enter URL to analyze..."`
    - Tombol paste: ikon clipboard → centang selama 2000ms setelah paste berhasil (gunakan state `pasteSuccess`)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [ ] 9.2 Update tombol Analyze dengan efek cyber
    - Animated gradient border neon-green/cyan via CSS `@keyframes`
    - Efek scanning (garis cahaya kiri → kanan) saat idle/hover
    - State `disabled` saat analyzing: teks "Analyzing...", opacity dikurangi, border neon tetap
    - Set `active={isAnalyzing}` pada `<CyberParticles>` saat analisis berlangsung
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [ ] 9.3 Ganti progress bar dengan komponen MatrixProgress
    - Render `<MatrixProgress duration={5000} onComplete={handleMatrixComplete}>` saat `isAnalyzing`
    - Buat handler `handleMatrixComplete` yang men-trigger tampilan hasil
    - Unmount MatrixProgress setelah `onComplete` dipanggil
    - _Requirements: 9.6_
  - [ ] 9.4 Update tampilan hasil prediksi
    - PHISHING: teks `Neon_Red` + ikon `⚠️`; LEGITIMATE: teks `Neon_Green` + ikon `🛡️`
    - Ekspor fungsi `getResultColor(label: string): string` untuk testability
    - Confidence_Bar: tinggi 8px, fill sesuai label, `box-shadow` neon
    - Card hasil: Glassmorphism + animasi fade-in via `motion/react`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - [ ] 9.5 Update QR scanner section
    - Render `<ScanFrame>` sebagai overlay saat `isScanning`
    - Tombol "Stop Camera": warna `Neon_Red`, border neon
    - Tombol Camera dan Upload: Glassmorphism + border `Neon_Green`
    - Error scanning: card Glassmorphism dengan warna `Neon_Red`, tambahkan `role="alert"` pada elemen error
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [ ]* 9.6 Tulis property test untuk LinkPredictor — Property 5: Warna hasil prediksi sesuai label
    - `// Feature: cyber-dark-ui-redesign, Property 5: Warna hasil prediksi konsisten dengan label`
    - Gunakan `fc.record({ label: fc.constantFrom('PHISHING', 'LEGITIMATE'), ... })`, assert `getResultColor` mengembalikan warna yang benar
    - **Property 5: Warna hasil prediksi sesuai label**
    - **Validates: Requirements 9.1, 9.2, 9.3**
  - [ ]* 9.7 Tulis property test untuk LinkPredictor — Property 7: CyberParticles active = isAnalyzing
    - `// Feature: cyber-dark-ui-redesign, Property 7: CyberParticles active prop = isAnalyzing state`
    - Buat `LinkPredictorWithState` test wrapper, gunakan `fc.boolean()`, assert `data-active` attribute
    - **Property 7: CyberParticles active saat analisis berlangsung**
    - **Validates: Requirements 8.4**
  - [ ]* 9.8 Tulis property test untuk LinkPredictor — Property 8: Error message selalu merah
    - `// Feature: cyber-dark-ui-redesign, Property 8: Pesan error QR selalu menggunakan Neon_Red`
    - Buat `LinkPredictorWithError` test wrapper, gunakan `fc.string({ minLength: 1 })`, assert warna `rgb(255, 59, 59)`
    - **Property 8: Pesan error scanning selalu ditampilkan dengan warna merah**
    - **Validates: Requirements 10.4**

- [ ] 10. Redesign komponen AboutUs
  - [ ] 10.1 Update `src/app/components/AboutUs.tsx` dengan konten nyata dan tema cyber
    - Ganti konten placeholder dengan informasi nyata: model deep learning (LSTM/Dense neural network), deteksi phishing berbasis URL
    - Stack teknologi: React 18, TypeScript, Vite, Tailwind CSS v4, FastAPI, TensorFlow/Keras
    - Statistik model: akurasi ~95%+, 30+ fitur URL yang dianalisis
    - Layout: grid 2-kolom di desktop, single-column di mobile
    - Cards: Glassmorphism + Glow_Effect
    - Render `<CyberParticles>` sebagai background
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  - [ ]* 10.2 Tulis unit test untuk AboutUs
    - Test konten mengandung informasi model dan stack teknologi
    - Test layout responsif (single-column di mobile)
    - _Requirements: 11.1, 11.2_

- [ ] 11. Tambahkan hover Glow_Effect global dan keyboard focus styles
  - Update `src/styles/index.css` atau `theme.css` untuk:
    - Elemen interaktif hover: `Glow_Effect` sesuai warna aksen
    - Keyboard focus indicator: `outline` dengan warna `Neon_Cyan` untuk semua elemen interaktif
  - _Requirements: 1.5, 12.4_

- [ ] 12. Checkpoint — Pastikan semua tests pass dan tidak ada regresi
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.
  - Verifikasi fungsionalitas QR scanning tidak ada regresi (kamera live, upload gambar, deteksi barcode)
  - Verifikasi kontras warna `#e0e0e0` vs `#0a0f0f` memenuhi rasio 4.5:1 (WCAG 2.1 AA)
  - _Requirements: 10.2, 12.3_

## Notes

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirements spesifik untuk traceability
- Fungsi-fungsi helper (`buildParticlesConfig`, `getRandomMatrixChar`, `calculateProgress`, `getResultColor`, `getNavItems`, `isNavItemActive`) harus diekspor dari komponen masing-masing agar dapat diuji secara unit/property
- Tailwind v4: tidak ada `tailwind.config.js`, semua token didefinisikan via `@theme inline` di CSS
- `motion` sudah ada, import dari `'motion/react'`
- `@tsparticles/react` menggunakan v3 API (bukan v2)
- Property tests menggunakan `fast-check` dengan minimum 100 iterasi per test (`{ numRuns: 100 }`)
