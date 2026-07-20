"""Unit test ekstraktor fitur lexical — deterministik, tanpa torch/jaringan."""
from __future__ import annotations

from app.features import FEATURE_NAMES, N_FEATURES, extract_batch, extract_one


def _feat(url: str) -> dict[str, float]:
    return dict(zip(FEATURE_NAMES, extract_one(url)))


def test_panjang_vektor_konsisten():
    v = extract_one("https://example.com")
    assert len(v) == N_FEATURES == len(FEATURE_NAMES)
    assert extract_batch(["a.com", "b.org"]).shape == (2, N_FEATURES)


def test_ip_terdeteksi():
    assert _feat("http://58.23.215.31:8765/x.exe")["has_ip"] == 1.0
    assert _feat("https://google.com")["has_ip"] == 0.0


def test_https_flag():
    assert _feat("https://google.com")["has_https"] == 1.0
    assert _feat("http://google.com")["has_https"] == 0.0


def test_risky_tld():
    assert _feat("http://roblox.com.ml/")["risky_tld"] == 1.0
    assert _feat("https://binus.ac.id")["risky_tld"] == 0.0


def test_brand_mismatch_menangkap_impersonation():
    # brand "roblox" di URL tapi domain terdaftar bukan roblox -> mismatch
    assert _feat("http://roblox.com.ml/users/1/profile")["brand_mismatch"] == 1.0
    # brand di domain aslinya -> bukan mismatch
    assert _feat("https://www.roblox.com")["brand_mismatch"] == 0.0
    # tanpa brand -> bukan mismatch
    assert _feat("https://tokopedia.com")["brand_mismatch"] == 0.0


def test_has_at_dan_shortener():
    assert _feat("http://user@evil.com")["has_at"] == 1.0
    assert _feat("https://bit.ly/abc")["is_shortener"] == 1.0


def test_url_kosong_tidak_crash():
    v = extract_one("")
    assert len(v) == N_FEATURES
