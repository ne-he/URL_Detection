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

# Jangan pakai pytest.importorskip di sini. importorskip cuma menangkap ImportError,
# sementara di Windows torch gagal dengan OSError WinError 1114 (runtime OpenMP-nya
# bentrok). OSError lolos dari importorskip dan bikin SELURUH sesi pytest berhenti di
# tahap collection, jadi nol test jalan. Skip harus eksplisit.
#
# Import sklearn duluan itu disengaja: sklearn memuat libiomp lebih dulu, dan setelah
# itu torch bisa di-import normal di mesin yang tadinya gagal. Kalau sklearn tidak ada,
# blok ini tetap lanjut dan kegagalan torch ditangkap oleh except di bawahnya.
try:  # pragma: no cover - jalur setup, bukan logika yang diuji
    import sklearn  # noqa: F401
except Exception:  # noqa: BLE001 - sklearn opsional, kegagalannya tidak fatal di sini
    pass

try:
    import sentence_transformers  # noqa: F401
except ImportError:
    pytest.skip("sentence-transformers tidak terpasang", allow_module_level=True)
except OSError as exc:  # torch gagal load DLL (mis. WinError 1114 di Windows)
    pytest.skip(
        f"sentence-transformers ada tapi gagal load runtime-nya: {exc}",
        allow_module_level=True,
    )

pytestmark = pytest.mark.skipif(
    not os.path.exists(MODEL_PATH), reason=f"artefak bobot model tidak ada: {MODEL_PATH}"
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
