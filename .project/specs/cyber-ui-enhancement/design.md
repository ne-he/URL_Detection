# Design Document — cyber-ui-enhancement

## Overview

Dokumen ini mendeskripsikan desain teknis untuk peningkatan UI/UX aplikasi PhishGuard. Fitur mencakup empat area:

1. **Redesain AboutUs** — dark theme, layout 2-kolom, konten nyata, CollaboratorCard, GlitchText
2. **Micro-interactions** — pulse tombol Analyze, CyberSweep input, ToastNotification paste/copy, history clickable
3. **Custom Cursor** — lingkaran neon 12px mengikuti mouse, nonaktif di mobile
4. **Background Enhancement** — ThreeScene mouse parallax + orbit ring pulse, CyberParticles repulse/push

Semua komponen baru bersifat reusable, menggunakan CSS variables yang sudah ada (`--cyber-green`, `--cyber-cyan`, dll.), dan tidak memperkenalkan dependensi baru.

---

## Architecture

### Component Tree

```
Layout
├── CyberParticles          (modified: repulse + push + fpsLimit)
├── ThreeScene              (modified: mouse parallax + ring pulse + dot repulse)
├── CustomCursor            (NEW: neon circle, follows mouse, disabled on mobile)
├── Sidebar
└── <Outlet>
    ├── Home
    ├── LinkPredictor        (modified: pulse btn, CyberSweep, toast, terminal enhancements)
    │   └── StatisticWidget  (modified: onSelectUrl callback, hover effects)
    └── AboutUs              (redesigned: dark theme, 2-col, real content)
        ├── GlitchText       (existing, reused)
        ├── NeonSeparator    (NEW: horizontal glow divider)
        └── CollaboratorCard (NEW: avatar, name, role, hover effects)
```

### Data Flow — onSelectUrl

```
StatisticWidget
  └── history item onClick
        └── props.onSelectUrl(url: string)
              └── LinkPredictor
                    └── setUrl(url)   ← fills input field
```

### Data Flow — ToastNotification

```
LinkPredictor
  ├── handlePaste() → setToast("Pasted!")
  ├── handleCopyUrl() → setToast("Copied!")
  └── <ToastNotification message={toast} onDone={() => setToast(null)} />
```

---

## Components and Interfaces

### 1. CustomCursor (NEW)

```tsx
// src/app/components/CustomCursor.tsx
interface CustomCursorProps {
  // no props — reads mouse position internally
}
```

**Behavior:**
- Renders `<div>` fixed-position, `pointer-events: none`, `z-index: 9999`
- Listens `mousemove` on `window`, updates `left`/`top` via `useRef` + direct DOM style mutation (no re-render per frame)
- Detects hover on interactive elements via `mouseover` checking `tagName` (BUTTON, A, INPUT, LABEL) or `[data-interactive]`
- Disabled when `window.matchMedia('(pointer: coarse)').matches` — returns `null`
- Applies `cursor: none` to `body` via `useEffect`

**Props:** none

---

### 2. CollaboratorCard (NEW)

```tsx
// src/app/components/CollaboratorCard.tsx
interface CollaboratorCardProps {
  name: string;
  role: string;
  avatarUrl?: string;       // optional, falls back to initials
  githubUrl?: string;       // optional GitHub link
  description?: string;     // short bio / TBA
}
```

**Behavior:**
- Hover: border color transitions to `#00ff9d`, `scale(1.03)`, GlitchText activates on name
- Avatar: circular, 64px, shows initials if no `avatarUrl`
- GitHub link opens in `_blank` if provided

---

### 3. NeonSeparator (NEW)

```tsx
// src/app/components/NeonSeparator.tsx
interface NeonSeparatorProps {
  color?: string;   // default: "#00ff9d"
  label?: string;   // optional center label
  className?: string;
}
```

**Behavior:**
- `<hr>`-like horizontal line with `box-shadow` glow
- Optional center label with background cutout
- Pure CSS, no animation (static glow)

---

### 4. ToastNotification (NEW)

```tsx
// src/app/components/ToastNotification.tsx
interface ToastNotificationProps {
  message: string | null;   // null = hidden
  onDone: () => void;       // called after fade-out completes
  duration?: number;        // ms visible, default 1500
}
```

**Behavior:**
- Renders fixed bottom-right (`bottom: 24px, right: 24px`)
- `AnimatePresence` + framer-motion: `opacity 0→1` on mount, `0` on exit
- Auto-calls `onDone` after `duration` ms via `useEffect`
- `z-index: 9998` (below cursor, above everything else)

---

### 5. AboutUs (REDESIGNED)

```tsx
// src/app/components/AboutUs.tsx
// No external props — self-contained page component
```

**Layout:**
- `background: #0a0f0f` + CSS noise texture via `::before` pseudo-element
- Desktop (≥768px): CSS Grid `grid-template-columns: 1fr 1fr`
- Mobile (<768px): single column, stacked order

**Sections (left column):**
1. Header: `<GlitchText text="About Link Predictor" />` + subtitle
2. `<NeonSeparator />`
3. Project description (PhishGuard deep learning phishing detection)
4. `<NeonSeparator label="OUR MISSION" />`
5. Mission text
6. `<NeonSeparator label="WHAT WE OFFER" />`
7. 4-item feature grid (Target, Zap, Shield, TrendingUp icons)

**Sections (right column):**
1. `<NeonSeparator label="CORE COLLABORATORS" />`
2. Three `<CollaboratorCard>` components
3. "View GitHub" button → opens repo in `_blank`

---

### 6. StatisticWidget (MODIFIED)

```tsx
interface StatisticWidgetProps {
  history: PredictionRecord[];
  onSelectUrl?: (url: string) => void;   // NEW — optional callback
}
```

**Changes:**
- History `<li>` items: add `cursor: pointer`, `onClick={() => onSelectUrl?.(r.url)}`
- Hover state: `background` brightens, border becomes `rgba(0,255,157,0.3)`, show `<RotateCcw>` icon (16px, right side)
- Hover managed via `useState<number | null>(hoveredIndex)`

---

### 7. LinkPredictor (MODIFIED)

**New state:**
```tsx
const [toast, setToast] = useState<string | null>(null);
const [inputFocused, setInputFocused] = useState(false);
```

**Changes:**
- `handlePaste`: after setting URL, call `setToast("Pasted!")`
- `handleCopyUrl`: after copy, call `setToast("Copied!")` (remove old `setCopied` state)
- Analyze button: add `onMouseEnter` scale + shadow, pulse keyframe on click via CSS class toggle
- Input: add `onFocus={() => setInputFocused(true)}` / `onBlur={() => setInputFocused(false)}`, render CyberSweep bar conditionally
- Terminal: add "Clear Logs" button (`<Trash2>` icon) in header, `onClick={() => setTerminalLogs([])}`
- Terminal log entries: wrap each `<p>` in `<motion.p initial={{opacity:0, x:-8}} animate={{opacity:1, x:0}}`
- Pass `onSelectUrl={(u) => setUrl(u)}` to `<StatisticWidget>`
- Render `<ToastNotification message={toast} onDone={() => setToast(null)} />`

---

### 8. ThreeScene (MODIFIED)

**New behavior:**
- `mousemove` listener on `window` → update `targetRotation` ref `{x, y}`
- In animation loop: lerp `globe.rotation.x/y` toward `targetRotation` with factor `0.03` (smooth parallax)
- Orbit ring pulse: `ringMat.opacity` oscillates between `0.15` and `0.4` using `Math.sin(clock.getElapsedTime() * 1.2)`
- Dot repulse: each frame, compute mouse position in NDC, project dots, push away dots within threshold radius `0.15` NDC units by `0.002` per frame

---

### 9. CyberParticles (MODIFIED)

Already has repulse + push + fpsLimit 60 in current implementation. Minor config verification:
- Confirm `fpsLimit: 60` ✓
- Confirm `onHover: repulse` ✓  
- Confirm `onClick: push` ✓
- Confirm binary chars `["0","1",">","$","#"]` ✓
- Confirm links color `#00ffff` opacity `0.55` ✓

No code changes needed — current implementation already satisfies Requirement 9.

---

### 10. Layout (MODIFIED)

Add `<CustomCursor />` as first child inside the root `<div>`:

```tsx
import { CustomCursor } from "./CustomCursor";
// ...
return (
  <div style={{ ... }}>
    <CustomCursor />
    <CyberParticles />
    ...
  </div>
);
```

---

## Data Models

### PredictionRecord (existing, unchanged)

```ts
interface PredictionRecord {
  url: string;
  label: "PHISHING" | "LEGITIMATE";
  confidence: number;
  timestamp: number;
}
```

### CollaboratorData (inline in AboutUs)

```ts
interface CollaboratorData {
  name: string;
  role: string;
  avatarUrl?: string;
  githubUrl?: string;
  description?: string;
}

const COLLABORATORS: CollaboratorData[] = [
  {
    name: "Nehemiah Gantenk Abiez",
    role: "Lead Developer & AI Engineer",
    githubUrl: "https://github.com/nehemiah",
    description: "Deep learning model architecture & frontend engineering",
  },
  { name: "Collaborator 2", role: "TBA", description: "TBA" },
  { name: "Collaborator 3", role: "TBA", description: "TBA" },
];
```

### ToastState (inline in LinkPredictor)

```ts
type ToastMessage = "Pasted!" | "Copied!" | null;
// stored as: const [toast, setToast] = useState<ToastMessage>(null)
```

---

## CSS / Animation Specifications

### New Keyframes (to add in `src/styles/index.css`)

```css
/* Pulse neon — tombol Analyze saat diklik */
@keyframes cyber-btn-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(0,255,157,0.7); }
  70%  { box-shadow: 0 0 0 12px rgba(0,255,157,0); }
  100% { box-shadow: 0 0 0 0 rgba(0,255,157,0); }
}

/* CyberSweep — garis bawah input saat fokus */
@keyframes cyber-sweep-line {
  0%   { transform: scaleX(0); transform-origin: left; }
  100% { transform: scaleX(1); transform-origin: left; }
}

/* Toast fade-in (handled by framer-motion, no keyframe needed) */
```

### CustomCursor Styles

```css
.custom-cursor {
  position: fixed;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #00ff9d;
  box-shadow: 0 0 8px #00ff9d, 0 0 16px rgba(0,255,157,0.4);
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
  transition: width 0.15s ease, height 0.15s ease, background 0.15s ease;
  will-change: transform;
}

.custom-cursor.cursor-hover {
  width: 24px;
  height: 24px;
  background: transparent;
  border: 2px solid #00ff9d;
  box-shadow: 0 0 12px #00ff9d;
}
```

### NeonSeparator Styles

```css
.neon-separator {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, #00ff9d, transparent);
  box-shadow: 0 0 6px rgba(0,255,157,0.5);
  margin: 24px 0;
}
```

### CollaboratorCard Hover Transition

```css
.collaborator-card {
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  will-change: transform;
}
.collaborator-card:hover {
  transform: scale(1.03);
  border-color: #00ff9d;
  box-shadow: 0 0 20px rgba(0,255,157,0.2);
}
```

### CyberSweep Input Line

```tsx
// Rendered as absolute-positioned div below input when inputFocused === true
<div style={{
  position: "absolute",
  bottom: 0,
  left: 0,
  height: 2,
  width: "100%",
  background: "linear-gradient(90deg, #00ff9d, #00ffff)",
  boxShadow: "0 0 8px #00ff9d",
  animation: "cyber-sweep-line 0.3s ease forwards",
  transformOrigin: "left",
}} />
```

### Analyze Button — Success Glow

```tsx
// After result received, apply 1s green glow via state
const [btnSuccess, setBtnSuccess] = useState(false);
// In handleAnalyze success callback:
setBtnSuccess(true);
setTimeout(() => setBtnSuccess(false), 1000);
// Applied as additional boxShadow on button
```

---

## Error Handling

| Scenario | Handling |
|---|---|
| WebGL not supported | `ThreeScene`: wrap renderer creation in try/catch, return `null` on error |
| Clipboard API denied | `handlePaste`: catch → show ToastNotification "Clipboard denied" instead of `alert()` |
| No mouse (touch device) | `CustomCursor`: check `matchMedia('(pointer: coarse)')` on mount, return `null` |
| `onSelectUrl` not provided | `StatisticWidget`: `onSelectUrl?.(url)` — optional chaining, no-op if absent |
| Empty history click | Guard: `if (!r.url) return` before calling callback |
| `prefers-reduced-motion` | Wrap framer-motion transitions with `useReducedMotion()` hook, set `duration: 0` |

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required for comprehensive coverage.

**Unit tests** cover:
- Specific rendering examples (CollaboratorCard renders name/role, NeonSeparator renders with label)
- Integration: clicking history item calls `onSelectUrl` with correct URL
- Edge cases: empty history, null toast, touch device cursor disabled
- Error conditions: clipboard denied, WebGL unavailable

**Property-based tests** cover:
- Universal properties that hold for all valid inputs (see Correctness Properties section)
- Run minimum 100 iterations per property

**Library:** [fast-check](https://github.com/dubzzz/fast-check) — TypeScript-native PBT library, no additional runtime deps beyond dev.

**Test runner:** Vitest (already in stack via Vite)

**Tag format per test:**
```ts
// Feature: cyber-ui-enhancement, Property N: <property_text>
```

**Property test configuration:**
```ts
import fc from "fast-check";
fc.assert(fc.property(...), { numRuns: 100 });
```

Each correctness property below maps to exactly one property-based test.


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: CollaboratorCard hover selalu mengaktifkan visual feedback

*For any* CollaboratorCard yang dirender dengan data kolaborator valid (name, role), ketika mouse masuk ke elemen tersebut, komponen SHALL menerapkan class atau style yang mengindikasikan hover state (border neon aktif, scale transform).

**Validates: Requirements 1.9**

---

### Property 2: Tombol interaktif selalu menerapkan hover scale

*For any* tombol interaktif di LinkPredictor (Analyze, Paste, Copy), ketika mouse masuk ke tombol tersebut, tombol SHALL memiliki transform scale yang lebih besar dari nilai default-nya.

**Validates: Requirements 2.5**

---

### Property 3: History item click selalu mengisi URL input

*For any* daftar history yang berisi satu atau lebih PredictionRecord, ketika pengguna mengklik item history ke-i, nilai URL input SHALL sama dengan `history[i].url`.

**Validates: Requirements 5.2**

---

### Property 4: History item hover selalu menampilkan ikon re-analyze

*For any* item history di StatisticWidget, ketika mouse masuk ke item tersebut, elemen ikon RotateCcw SHALL menjadi visible (tidak hidden/display:none).

**Validates: Requirements 5.1**

---

### Property 5: Clear Logs selalu menghasilkan log kosong

*For any* TerminalLog dengan jumlah entri ≥ 0, setelah pengguna mengklik tombol "Clear Logs", panjang array `terminalLogs` SHALL sama dengan 0.

**Validates: Requirements 6.3**

---

### Property 6: CustomCursor berubah ukuran saat hover elemen interaktif

*For any* elemen interaktif (BUTTON, A, INPUT, LABEL) di halaman, ketika event `mouseover` terjadi pada elemen tersebut, CustomCursor SHALL memiliki dimensi yang lebih besar dari ukuran default 12px (yaitu 24px).

**Validates: Requirements 7.3**

---

### Property 7: Reduced-motion menonaktifkan animasi non-esensial

*For any* komponen yang menggunakan framer-motion di aplikasi ini, ketika `prefers-reduced-motion: reduce` aktif, durasi transisi animasi SHALL sama dengan 0 atau animasi SHALL tidak dijalankan.

**Validates: Requirements 10.4**

---

## Error Handling

| Scenario | Handling |
|---|---|
| WebGL not supported | `ThreeScene`: wrap renderer creation in try/catch, return `null` on error |
| Clipboard API denied | `handlePaste`: catch → show ToastNotification "Clipboard denied" instead of `alert()` |
| No mouse (touch device) | `CustomCursor`: check `matchMedia('(pointer: coarse)')` on mount, return `null` |
| `onSelectUrl` not provided | `StatisticWidget`: `onSelectUrl?.(url)` — optional chaining, no-op if absent |
| Empty history click | Guard: `if (!r.url) return` before calling callback |
| `prefers-reduced-motion` | Wrap framer-motion transitions with `useReducedMotion()` hook, set `duration: 0` |
| Avatar image load failure | `CollaboratorCard`: `onError` on `<img>` → fallback to initials div |
| tsParticles engine init failure | `CyberParticles`: existing try/catch in `getEngine()`, returns `null` if not ready |

---

## Testing Strategy

### Dual Testing Approach

Kedua jenis test diperlukan untuk coverage yang komprehensif:

**Unit tests** (Vitest + React Testing Library):
- Rendering examples: CollaboratorCard renders name/role/avatar, NeonSeparator renders dengan label
- Integration: klik history item memanggil `onSelectUrl` dengan URL yang benar
- Edge cases: history kosong, toast null, touch device → cursor disabled
- Error conditions: clipboard denied, WebGL unavailable
- Config checks: CyberParticles options (fpsLimit, links color, interactivity modes)

**Property-based tests** (fast-check + Vitest):
- Setiap property di atas diimplementasikan sebagai satu property-based test
- Minimum 100 iterasi per test (`numRuns: 100`)
- Generator menghasilkan data acak yang valid (nama kolaborator, URL, log entries)

### Property-Based Testing Configuration

```ts
import fc from "fast-check";
import { describe, it } from "vitest";

// Feature: cyber-ui-enhancement, Property 3: History item click selalu mengisi URL input
it("history item click fills URL input", () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({
        url: fc.webUrl(),
        label: fc.constantFrom("PHISHING", "LEGITIMATE"),
        confidence: fc.float({ min: 0, max: 100 }),
        timestamp: fc.integer({ min: 0 }),
      }), { minLength: 1 }),
      fc.nat(),
      (history, indexSeed) => {
        const index = indexSeed % history.length;
        // render StatisticWidget, click item[index], assert URL input === history[index].url
      }
    ),
    { numRuns: 100 }
  );
});
```

### Test File Structure

```
src/
  __tests__/
    CustomCursor.test.tsx       — Properties 6, 7 + unit examples
    CollaboratorCard.test.tsx   — Property 1 + unit examples
    StatisticWidget.test.tsx    — Properties 3, 4 + unit examples
    LinkPredictor.test.tsx      — Properties 2, 5 + unit examples (toast, sweep, terminal)
    AboutUs.test.tsx            — Unit examples (layout, sections, GitHub link)
    CyberParticles.test.tsx     — Unit examples (config options)
    ThreeScene.test.tsx         — Unit example (WebGL unavailable)
```

### Unit Testing Balance

Unit tests fokus pada:
- Contoh konkret yang mendemonstrasikan perilaku benar
- Integration points antar komponen (onSelectUrl data flow)
- Edge cases dan error conditions

Property tests fokus pada:
- Universal properties yang berlaku untuk semua input
- Coverage input yang komprehensif melalui randomisasi

Hindari menulis terlalu banyak unit tests untuk kasus yang sudah dicakup property tests.
