// Base URL backend. Set VITE_API_BASE di .env.local / Vercel untuk mengarahkan
// ke backend sendiri.
//
// PERHATIAN: fallback di bawah ini BUKAN backend repo ini. Itu Space milik
// kolaborator dari projek kelompok v1, dan dia menjalankan model v1, bukan v2.
// Fallback-nya dipertahankan supaya build tanpa env tetap jalan, tapi setiap build
// yang memakainya akan mengirim URL pengunjung ke infrastruktur orang lain.
// Sebelum deploy publik, WAJIB set VITE_API_BASE ke Space sendiri.
const FALLBACK_API_BASE = 'https://adhikaxx88-phishing-detection-api.hf.space';

export const API_BASE = (import.meta.env.VITE_API_BASE ?? FALLBACK_API_BASE).replace(/\/+$/, '');

// Peringatan keras saat runtime, supaya salah konfigurasi ini tidak lolos diam-diam.
// Tanpa ini, build yang salah kelihatan persis sama dengan build yang benar.
if (!import.meta.env.VITE_API_BASE) {
  console.warn(
    `[phishguard] VITE_API_BASE belum di-set, jadi UI memanggil ${FALLBACK_API_BASE}. ` +
      'Itu Space milik kolaborator v1, menjalankan model v1, bukan backend repo ini. ' +
      'Set VITE_API_BASE sebelum deploy publik.',
  );
}

export const FEATURES = {
  SHADER_BG: import.meta.env.VITE_FEATURE_SHADER !== 'false',
  GLOBE: import.meta.env.VITE_FEATURE_GLOBE !== 'false',
  VOICE: import.meta.env.VITE_FEATURE_VOICE !== 'false',
  GAMIFICATION: import.meta.env.VITE_FEATURE_GAMIFICATION !== 'false',
};
