"""Kontrak request/response + validasi input.

Kontrak response sengaja kompatibel dengan PhishGuard v1
(field: url, label, confidence, legitimate_chance, is_dangerous)
supaya frontend lama bisa langsung pindah ke backend ini.
"""
from __future__ import annotations

import re
from urllib.parse import urlsplit, urlunsplit

from pydantic import BaseModel, Field, field_validator

MAX_URL_LENGTH = 2048
ALLOWED_SCHEMES = {"http", "https"}


class URLRequest(BaseModel):
    url: str = Field(..., description="URL yang mau dicek (http/https)")

    @field_validator("url")
    @classmethod
    def validate_and_normalize(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("URL tidak boleh kosong")
        if len(v) > MAX_URL_LENGTH:
            raise ValueError(f"URL terlalu panjang (maks {MAX_URL_LENGTH} karakter)")
        # Tolak skema non-URL tanpa "//" (javascript:, mailto:, data:) SEBELUM
        # auto-prepend http:// — kalau tidak, "javascript:alert(1)" jadi host valid.
        # "(?!\d)" membedakan skema dari port (example.com:8080 tetap boleh).
        if re.match(r"^[a-zA-Z][a-zA-Z0-9+.\-]*:(?!//)(?!\d)", v):
            raise ValueError("Skema URL harus http/https")
        # Tanpa skema, asumsikan http:// supaya urlsplit bisa memisahkan host.
        candidate = v if "://" in v else f"http://{v}"
        parts = urlsplit(candidate)
        if parts.scheme not in ALLOWED_SCHEMES:
            raise ValueError(f"Skema URL harus http/https, bukan '{parts.scheme}'")
        if not parts.netloc:
            raise ValueError("URL tidak punya host yang valid")
        # Normalisasi: host lowercase; path/query dibiarkan (case-sensitive di banyak server).
        normalized = urlunsplit(
            (parts.scheme, parts.netloc.lower(), parts.path, parts.query, parts.fragment)
        )
        return normalized


class PredictionResponse(BaseModel):
    url: str
    label: str  # "PHISHING" | "LEGITIMATE"
    confidence: float  # persen, 0-100, milik label yang dipilih
    legitimate_chance: float  # persen, 0-100
    is_dangerous: bool
    threshold: float
    model_version: str
    # Field tambahan v2.2 (opsional supaya frontend lama tetap kompatibel):
    # "model" = keputusan dari ML, "blocklist" = kena feed phishing publik.
    source: str = "model"
    # Umur domain (hari) via RDAP kalau ENABLE_DOMAIN_AGE aktif; None kalau tidak dicek.
    domain_age_days: int | None = None


class BatchRequest(BaseModel):
    urls: list[str] = Field(..., min_length=1, max_length=50)


class HealthResponse(BaseModel):
    status: str
    model_ready: bool
    detail: str | None = None
