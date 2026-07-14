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
    # Path artefak model Keras.
    model_path: str = os.getenv("MODEL_PATH", "models/phishing_detection_deeplearning.h5")
    # Nama model sentence-transformers untuk embedding URL.
    embedder_name: str = os.getenv("EMBEDDER_NAME", "all-MiniLM-L6-v2")
    # Batas panjang URL yang diterima (RFC praktis; browser umumnya ~2000).
    max_url_length: int = int(os.getenv("MAX_URL_LENGTH", "2048"))


def get_settings() -> Settings:
    return Settings()
