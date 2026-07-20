"""Konfigurasi runtime — semua dari environment variable, tanpa hardcode.

Kenapa env: nilai-nilai ini beda antara lokal / Docker / production,
dan threshold bukan keputusan kode melainkan keputusan operasional.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field


def _parse_origins(raw: str) -> list[str]:
    return [o.strip() for o in raw.split(",") if o.strip()]


@dataclass(frozen=True)
class Settings:
    # CORS: origin spesifik (comma-separated). TIDAK pernah "*" bareng credentials —
    # kombinasi itu ditolak spec browser dan membuka credentialed request dari origin manapun.
    frontend_origins: list[str] = field(
        default_factory=lambda: _parse_origins(
            os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://localhost:3000")
        )
    )
    # Ambang klasifikasi phishing (probabilitas phishing > threshold => PHISHING).
    phishing_threshold: float = float(os.getenv("PHISHING_THRESHOLD", "0.5"))
    # Path bobot model (.npz hasil konversi artefak Keras, lihat scripts/convert_h5_to_npz.py).
    model_path: str = os.getenv("MODEL_PATH", "models/phishing_detection_weights.npz")
    # Nama model sentence-transformers untuk embedding URL.
    embedder_name: str = os.getenv("EMBEDDER_NAME", "all-MiniLM-L6-v2")
    # Device embedding. Default "cpu": di ZeroGPU, GPU cuma boleh diakses di dalam
    # fungsi @spaces.GPU, jadi inference di route biasa WAJIB CPU biar tidak error
    # saat request (walau warmup startup kebetulan dapat cuda).
    embedder_device: str = os.getenv("EMBEDDER_DEVICE", "cpu")
    # Batas panjang URL yang diterima (RFC praktis; browser umumnya ~2000).
    max_url_length: int = int(os.getenv("MAX_URL_LENGTH", "2048"))
    # Level 3: cek URL ke blocklist feed publik sebelum ML. Matikan (0) kalau Space
    # tidak punya outbound network.
    enable_blocklist: bool = os.getenv("ENABLE_BLOCKLIST", "1") not in ("0", "false", "False")
    # Level 4: perkaya response dengan umur domain via RDAP (best-effort, timeout ketat).
    # Default OFF karena nambah latensi per-request; nyalakan lewat env kalau mau.
    enable_domain_age: bool = os.getenv("ENABLE_DOMAIN_AGE", "0") not in ("0", "false", "False")


def get_settings() -> Settings:
    return Settings()
