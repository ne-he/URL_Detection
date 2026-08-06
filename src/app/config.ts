// Base URL backend yang dipanggil UI.
//
// Default-nya Space milik repo ini sendiri (backend v2.2: blocklist -> allowlist ->
// model MiniLM + fitur lexical). Jadi clone baru, `npm run dev`, dan build produksi
// tanpa env sekalipun tetap memanggil backend yang benar.
//
// Sebelumnya default ini menunjuk ke Space kolaborator projek kelompok v1. Itu
// menjalankan model v1 dan bukan infrastruktur repo ini, jadi setiap build yang lupa
// set env diam-diam mengirim URL pengunjung ke server orang lain sambil menampilkan
// hasil model yang berbeda dari yang didokumentasikan di repo ini.
const DEFAULT_API_BASE = 'https://ne-he-phisguard-api.hf.space';

// Vercel mengirim string kosong untuk env var yang didefinisikan tapi tidak diisi,
// dan '' lolos dari `??` karena bukan null/undefined. Tanpa trim + cek falsy ini,
// build seperti itu akan fetch ke "/predict" relatif terhadap origin frontend dan
// gagal 404, padahal env-nya kelihatan "sudah diisi" di dashboard.
const configured = import.meta.env.VITE_API_BASE?.trim();

export const API_BASE = (configured || DEFAULT_API_BASE).replace(/\/+$/, '');

export const FEATURES = {
  SHADER_BG: import.meta.env.VITE_FEATURE_SHADER !== 'false',
  GLOBE: import.meta.env.VITE_FEATURE_GLOBE !== 'false',
  VOICE: import.meta.env.VITE_FEATURE_VOICE !== 'false',
  GAMIFICATION: import.meta.env.VITE_FEATURE_GAMIFICATION !== 'false',
};
