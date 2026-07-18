// Base URL backend. Set VITE_API_BASE di .env / Vercel untuk mengarahkan
// ke backend sendiri; default masih Space lama supaya build tanpa env tetap jalan.
export const API_BASE = (
  import.meta.env.VITE_API_BASE ?? 'https://adhikaxx88-phishing-detection-api.hf.space'
).replace(/\/+$/, '');

export const FEATURES = {
  SHADER_BG: import.meta.env.VITE_FEATURE_SHADER !== 'false',
  GLOBE: import.meta.env.VITE_FEATURE_GLOBE !== 'false',
  VOICE: import.meta.env.VITE_FEATURE_VOICE !== 'false',
  GAMIFICATION: import.meta.env.VITE_FEATURE_GAMIFICATION !== 'false',
};
