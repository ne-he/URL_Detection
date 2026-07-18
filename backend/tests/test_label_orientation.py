"""Regression test orientasi label — MENGUNCI konvensi 0.0=phishing, 1.0=legitimate.

Kalau model di-retrain dengan LabelEncoder yang arahnya kebalik, test ini yang
menangkapnya SEBELUM model salah kaprah masuk produksi. Butuh
sentence-transformers + file bobot .npz, otomatis di-skip kalau tidak tersedia
(mis. di mesin dev tanpa torch), dan jalan penuh di CI job model-regression.
"""
from __future__ import annotations

import os

import pytest

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "phishing_detection_weights.npz")

pytest.importorskip("sentence_transformers", reason="sentence-transformers tidak terpasang")

pytestmark = pytest.mark.skipif(
    not os.path.exists(MODEL_PATH), reason="artefak model .h5 tidak ada"
)

ORIENTATION_HINT = (
    "ORIENTASI LABEL KEMUNGKINAN KEBALIK — cek arah LabelEncoder / mapping label "
    "di pipeline training (konvensi: 0.0=phishing, 1.0=legitimate)."
)


@pytest.fixture(scope="module")
def predictor():
    from app.predictor import KerasURLPredictor

    p = KerasURLPredictor(MODEL_PATH, "all-MiniLM-L6-v2")
    p.load()
    return p


def test_obvious_legitimate_url(predictor):
    p_legit = predictor.prob_legitimate(["https://www.google.com"])[0]
    assert p_legit > 0.5, f"google.com dinilai phishing (p_legit={p_legit:.3f}). {ORIENTATION_HINT}"


def test_obvious_phishing_url(predictor):
    p_legit = predictor.prob_legitimate(["http://58.23.215.31:8765/wzoptup.exe"])[0]
    assert p_legit < 0.5, f"URL exe ber-IP dinilai aman (p_legit={p_legit:.3f}). {ORIENTATION_HINT}"
