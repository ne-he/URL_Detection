# Implementation Plan: cyber-ui-enhancement

## Overview

Implementasi peningkatan UI/UX PhishGuard secara inkremental: komponen reusable baru → redesain AboutUs → micro-interactions LinkPredictor/StatisticWidget → background enhancement → CSS keyframes → wiring akhir.

## Tasks

- [x] 1. Tambah keyframes CSS baru di `src/styles/index.css`
  - Tambahkan `@keyframes cyber-btn-pulse` untuk pulse neon tombol Analyze saat diklik
  - Tambahkan `@keyframes cyber-sweep-line` untuk animasi garis bawah input saat fokus
  - Tambahkan class `.custom-cursor` dan `.custom-cursor.cursor-hover` untuk CustomCursor
  - Tambahkan class `.neon-separator` untuk NeonSeparator
  - Tambahkan class `.collaborator-card` dan `.collaborator-card:hover` untuk CollaboratorCard
  - _Requirements: 2.1, 3.1, 7.1, 7.3_

- [x] 2. Buat komponen `CustomCursor`
  - [x] 2.1 Implementasi `src/app/components/CustomCursor.tsx`
    - Render `<div className="custom-cursor">` fixed-position, `pointer-events: none`, `z-index: 9999`
    - Gunakan `useRef` + direct DOM style mutation (bukan state) untuk update posisi per frame via `mousemove`
    - Deteksi hover elemen interaktif (BUTTON, A, INPUT, LABEL) via `mouseover` → toggle class `cursor-hover`
    - Terapkan `cursor: none` pada `body` via `useEffect`, kembalikan `null` jika `matchMedia('(pointer: coarse)').matches`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.1_
  - [ ]* 2.2 Write property test untuk CustomCursor — cursor-hover saat hover elemen interaktif
    - **Property 6: CustomCursor berubah ukuran saat hover elemen interaktif**
    - **Validates: Requirements 7.3**

- [x] 3. Buat komponen `NeonSeparator`
  - [x] 3.1 Implementasi `src/app/components/NeonSeparator.tsx`
    - Render garis horizontal dengan `box-shadow` glow menggunakan class `.neon-separator`
    - Dukung prop `color` (default `#00ff9d`), `label` (optional center label), `className`
    - Jika `label` ada, tampilkan teks di tengah dengan background cutout
    - _Requirements: 1.8_

- [x] 4. Buat komponen `CollaboratorCard`
  - [x] 4.1 Implementasi `src/app/components/CollaboratorCard.tsx`
    - Props: `name`, `role`, `avatarUrl?`, `githubUrl?`, `description?`
    - Avatar 64px circular: tampilkan `<img>` jika `avatarUrl` ada, fallback ke inisial nama
    - Hover: gunakan `useState` untuk hover state, terapkan `scale(1.03)`, border `#00ff9d`, shadow neon
    - Nama menggunakan `<GlitchText>` yang sudah ada
    - GitHub link buka `_blank` jika `githubUrl` ada
    - Gunakan class `.collaborator-card` dari CSS
    - _Requirements: 1.7, 1.9_
  - [ ]* 4.2 Write unit test untuk CollaboratorCard
    - Test render name, role, dan avatar fallback ke inisial
    - Test GitHub link tidak dirender jika `githubUrl` tidak ada
    - _Requirements: 1.7, 1.9_

- [x] 5. Buat komponen `ToastNotification`
  - [x] 5.1 Implementasi `src/app/components/ToastNotification.tsx`
    - Props: `message: string | null`, `onDone: () => void`, `duration?: number` (default 1500ms)
    - Render fixed bottom-right (`bottom: 24px, right: 24px`), `z-index: 9998`
    - Gunakan `AnimatePresence` + framer-motion: `opacity 0→1` mount, `0` exit
    - Auto-call `onDone` setelah `duration` ms via `useEffect` saat `message !== null`
    - _Requirements: 4.1, 4.2, 4.3_
  - [ ]* 5.2 Write unit test untuk ToastNotification
    - Test auto-dismiss: `onDone` dipanggil setelah `duration` ms
    - Test tidak dirender saat `message === null`
    - _Requirements: 4.1, 4.2_

- [x] 6. Redesain `AboutUs`
  - [x] 6.1 Implementasi ulang `src/app/components/AboutUs.tsx` dengan dark theme
    - Background `#0a0f0f`, layout CSS Grid 2-kolom pada ≥768px, 1-kolom pada <768px
    - Kolom kiri: `<GlitchText text="About Link Predictor" />` + subtitle + deskripsi proyek PhishGuard
    - Pisahkan seksi dengan `<NeonSeparator>` (label: "OUR MISSION", "WHAT WE OFFER")
    - Seksi "What We Offer": 4 poin dengan ikon Target, Zap, Shield, TrendingUp dari lucide-react
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.10_
  - [x] 6.2 Tambahkan kolom kanan: CollaboratorCard + tombol View GitHub
    - `<NeonSeparator label="CORE COLLABORATORS" />` di atas kartu
    - Tiga `<CollaboratorCard>`: Nehemiah Gantenk Abiez (Lead Developer & AI Engineer), Collaborator 2 (TBA), Collaborator 3 (TBA)
    - Tombol "View GitHub" membuka URL repo di `_blank`
    - _Requirements: 1.7, 1.9, 1.11_

- [x] 7. Modifikasi `StatisticWidget` — tambah `onSelectUrl` dan hover effects
  - [x] 7.1 Update `src/app/components/StatisticWidget.tsx`
    - Tambah prop `onSelectUrl?: (url: string) => void` ke interface `StatisticWidgetProps`
    - History `<li>`: tambah `cursor: pointer`, `onClick={() => { if (r.url) onSelectUrl?.(r.url); }}`
    - Hover state via `useState<number | null>(hoveredIndex)`: background lebih terang, border `rgba(0,255,157,0.3)`
    - Tampilkan `<RotateCcw>` icon (16px) di sisi kanan saat item di-hover
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ]* 7.2 Write property test untuk StatisticWidget — history item click mengisi URL
    - **Property 3: History item click selalu mengisi URL input**
    - **Validates: Requirements 5.2**

- [x] 8. Modifikasi `LinkPredictor` — micro-interactions
  - [x] 8.1 Tambah state baru dan integrasi ToastNotification di `src/app/components/LinkPredictor.tsx`
    - Tambah `const [toast, setToast] = useState<string | null>(null)`
    - Tambah `const [inputFocused, setInputFocused] = useState(false)`
    - Tambah `const [btnSuccess, setBtnSuccess] = useState(false)`
    - `handlePaste`: setelah set URL, panggil `setToast("Pasted!")`
    - `handleCopyUrl`: ganti `setCopied` dengan `setToast("Copied!")`, hapus state `copied`
    - Render `<ToastNotification message={toast} onDone={() => setToast(null)} />` di akhir return
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 8.2 Tambah CyberSweep pada input URL
    - Input: tambah `onFocus={() => setInputFocused(true)}` / `onBlur={() => setInputFocused(false)}`
    - Bungkus input dalam `<div style={{ position: "relative" }}>`, render sweep bar kondisional saat `inputFocused`
    - Sweep bar: `position: absolute, bottom: 0, height: 2px`, animasi `cyber-sweep-line 0.3s ease forwards`
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 8.3 Tambah pulse neon dan success glow pada tombol Analyze
    - Tombol Analyze: tambah `onMouseEnter` scale + shadow via inline style state
    - Saat klik: toggle CSS animation `cyber-btn-pulse` via class atau inline style
    - Saat hasil berhasil: `setBtnSuccess(true)`, terapkan `boxShadow: "0 0 20px #00ff9d"` selama 1 detik
    - _Requirements: 2.1, 2.3, 2.5_
  - [x] 8.4 Tambah animasi per-entri dan Clear Logs button di TerminalLog
    - Bungkus setiap `<p>` log dalam `<motion.p initial={{opacity:0, x:-8}} animate={{opacity:1, x:0}}>`
    - Tambah tombol Clear Logs dengan ikon `<Trash2>` di header TerminalLog, `onClick={() => setTerminalLogs([])}`
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 8.5 Teruskan `onSelectUrl` ke StatisticWidget
    - Pass `onSelectUrl={(u) => setUrl(u)}` ke `<StatisticWidget>`
    - _Requirements: 5.2, 5.4_
  - [ ]* 8.6 Write property test untuk LinkPredictor — Clear Logs menghasilkan array kosong
    - **Property 5: Clear Logs selalu menghasilkan log kosong**
    - **Validates: Requirements 6.3**

- [x] 9. Checkpoint — Pastikan semua tests pass
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.

- [-] 10. Modifikasi `ThreeScene` — mouse parallax + ring pulse + dot repulse
  - [-] 10.1 Tambah mouse parallax rotation di `src/app/components/ThreeScene.tsx`
    - Tambah `targetRotation` ref `{ x: 0, y: 0 }` dan `mousemove` listener pada `window`
    - Di animation loop: lerp `globe.rotation.x/y` menuju `targetRotation` dengan faktor `0.03`
    - Pertahankan rotasi otomatis baseline saat mouse tidak bergerak
    - _Requirements: 8.1, 8.4_
  - [-] 10.2 Tambah orbit ring pulse opacity
    - Gunakan `THREE.Clock`, di animation loop: `ringMat.opacity = 0.15 + 0.25 * (Math.sin(clock.getElapsedTime() * 1.2) * 0.5 + 0.5)`
    - _Requirements: 8.2_
  - [x] 10.3 Tambah dot repulse effect
    - Tiap frame: hitung posisi mouse dalam NDC, project posisi dot, push dot menjauh jika dalam radius `0.15` NDC
    - Bungkus renderer creation dalam try/catch, return `null` jika WebGL tidak tersedia
    - _Requirements: 8.3, 8.5_

- [x] 11. Verifikasi `CyberParticles` config
  - [x] 11.1 Verifikasi `src/app/components/CyberParticles.tsx` sudah memenuhi semua requirements
    - Konfirmasi `fpsLimit: 60` ✓, `onHover: repulse` ✓, `onClick: push` ✓
    - Konfirmasi binary chars `["0","1",">","$","#"]` ✓, links color `#00ffff` opacity `0.55` ✓
    - Jika ada yang belum sesuai, update config `particleOptions`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 12. Tambahkan `CustomCursor` ke `Layout`
  - Update `src/app/components/Layout.tsx`: import `CustomCursor`, render sebagai child pertama di dalam root `<div>` sebelum `<CyberParticles />`
  - _Requirements: 7.6_

- [x] 13. Responsivitas dan aksesibilitas
  - [x] 13.1 Pastikan `AboutUs` responsive pada viewport < 768px
    - Verifikasi CSS Grid fallback ke single column, urutan konten: judul → deskripsi → misi → fitur → kolaborator
    - _Requirements: 1.2, 10.2_
  - [x] 13.2 Tambah `prefers-reduced-motion` support
    - Di komponen yang menggunakan framer-motion (`LinkPredictor`, `StatisticWidget`, `ToastNotification`): gunakan `useReducedMotion()` hook, set `duration: 0` jika aktif
    - _Requirements: 10.4_
  - [ ]* 13.3 Write property test untuk reduced-motion
    - **Property 7: Reduced-motion menonaktifkan animasi non-esensial**
    - **Validates: Requirements 10.4**

- [x] 14. Final checkpoint — Pastikan semua tests pass
  - Pastikan semua tests pass dan semua komponen terintegrasi dengan benar, tanyakan ke user jika ada pertanyaan.

## Notes

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirements spesifik untuk traceability
- Komponen baru (CustomCursor, NeonSeparator, CollaboratorCard, ToastNotification) harus selesai sebelum redesain AboutUs dan modifikasi LinkPredictor
- CyberParticles tidak memerlukan perubahan kode jika config sudah sesuai (Task 11 adalah verifikasi)
- Property tests menggunakan fast-check + Vitest; unit tests menggunakan Vitest + React Testing Library
