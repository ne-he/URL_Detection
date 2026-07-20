"""Fitur lexical handcrafted dari string URL.

DIPAKAI DUA TEMPAT dengan implementasi yang SAMA PERSIS:
  - training (scripts/train_model.py) saat bikin matriks fitur
  - runtime (app/predictor.py) saat inference

Kalau ada yang beda antara dua tempat itu, model jadi ngaco diam-diam. Makanya
ekstraktornya cuma ada di sini. Urutan `FEATURE_NAMES` DIKUNCI: model dilatih
pada urutan ini, jadi jangan sisipkan/menyusun ulang, cuma boleh append di akhir
(dan itupun harus retrain).

Semua fitur di-scale ke kisaran ~0..1 biar sebanding dengan komponen embedding
saat digabung; penskalaan pastinya dilakukan StandardScaler yang di-fit saat
training dan bobotnya disimpan ke npz.
"""
from __future__ import annotations

import math
import re
from urllib.parse import urlparse

import numpy as np

# Brand yang paling sering ditiru phishing. Kalau nama ini muncul di URL tapi
# domain terdaftarnya BUKAN brand ini -> sinyal impersonation kuat.
_BRANDS = (
    "paypal", "google", "facebook", "instagram", "microsoft", "apple", "amazon",
    "netflix", "roblox", "steam", "binance", "metamask", "coinbase", "whatsapp",
    "office365", "outlook", "linkedin", "dropbox", "wellsfargo", "chase",
    "bankofamerica", "icloud", "gmail", "telegram", "discord", "tiktok",
)

# TLD yang sering dipakai gratisan/abuse.
_RISKY_TLDS = frozenset({
    "tk", "ml", "ga", "cf", "gq", "xyz", "top", "club", "online", "site",
    "work", "click", "link", "info", "vip", "icu", "cn", "ru", "su", "buzz",
    "rest", "fit", "cam", "monster", "quest", "sbs", "cyou",
})

_SHORTENERS = frozenset({
    "bit.ly", "goo.gl", "t.co", "tinyurl.com", "ow.ly", "is.gd", "buff.ly",
    "cutt.ly", "rebrand.ly", "shorturl.at", "rb.gy", "t.ly",
})

_IP_RE = re.compile(r"^(\d{1,3}\.){3}\d{1,3}$")
_SUSPICIOUS_WORDS = (
    "login", "signin", "verify", "account", "secure", "update", "confirm",
    "webscr", "banking", "password", "payment", "wallet", "unlock", "suspend",
    "gift", "bonus", "free", "prize", "invoice", "billing",
)

FEATURE_NAMES = (
    "url_len", "host_len", "path_len", "n_dots", "n_hyphen", "n_digits",
    "n_subdomain", "n_query", "n_special", "digit_ratio", "entropy",
    "has_ip", "has_at", "has_https", "is_shortener", "risky_tld",
    "n_suspicious_words", "brand_mismatch", "n_encoded", "long_host",
)
N_FEATURES = len(FEATURE_NAMES)


def _entropy(s: str) -> float:
    if not s:
        return 0.0
    counts: dict[str, int] = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1
    n = len(s)
    return -sum((c / n) * math.log2(c / n) for c in counts.values())


def extract_one(url: str) -> list[float]:
    url = (url or "").strip()
    if not url.startswith(("http://", "https://")):
        parse_target = "http://" + url
    else:
        parse_target = url
    try:
        p = urlparse(parse_target)
        host = (p.hostname or "").lower()
        path = p.path or ""
        query = p.query or ""
    except ValueError:
        host, path, query = "", "", ""

    labels = host.split(".") if host else []
    tld = labels[-1] if len(labels) >= 2 else ""
    reg_domain = ".".join(labels[-2:]) if len(labels) >= 2 else host

    digits = sum(c.isdigit() for c in url)
    specials = sum(not c.isalnum() and c not in ":/." for c in url)
    n_sub = max(0, len(labels) - 2)

    low = url.lower()
    brand_in_url = any(b in low for b in _BRANDS)
    brand_in_domain = any(b in reg_domain for b in _BRANDS)
    brand_mismatch = 1.0 if (brand_in_url and not brand_in_domain) else 0.0

    feats = [
        min(len(url) / 100.0, 3.0),                 # url_len
        min(len(host) / 50.0, 3.0),                 # host_len
        min(len(path) / 50.0, 3.0),                 # path_len
        min(host.count(".") / 5.0, 3.0),            # n_dots
        min(url.count("-") / 5.0, 3.0),             # n_hyphen
        min(digits / 20.0, 3.0),                    # n_digits
        min(n_sub / 4.0, 3.0),                      # n_subdomain
        min(query.count("=") / 5.0, 3.0),           # n_query
        min(specials / 15.0, 3.0),                  # n_special
        digits / max(len(url), 1),                  # digit_ratio
        _entropy(url) / 6.0,                        # entropy (normalisasi kasar)
        1.0 if _IP_RE.match(host) else 0.0,         # has_ip
        1.0 if "@" in url else 0.0,                 # has_at
        1.0 if parse_target.startswith("https://") else 0.0,  # has_https
        1.0 if reg_domain in _SHORTENERS else 0.0,  # is_shortener
        1.0 if tld in _RISKY_TLDS else 0.0,         # risky_tld
        min(sum(w in low for w in _SUSPICIOUS_WORDS) / 3.0, 3.0),  # n_suspicious_words
        brand_mismatch,                             # brand_mismatch
        min(low.count("%") / 5.0, 3.0),             # n_encoded
        1.0 if len(host) > 40 else 0.0,             # long_host
    ]
    return feats


def extract_batch(urls: list[str]) -> np.ndarray:
    return np.asarray([extract_one(u) for u in urls], dtype=np.float32)
