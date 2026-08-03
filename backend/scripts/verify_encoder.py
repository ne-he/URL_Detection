"""Bukti bahwa encoder numpy di scripts/minilm_numpy.py == sentence-transformers.

Cara buktinya: `data/_emb_cache.npy` adalah embedding yang DIHASILKAN
sentence-transformers asli waktu training v2.2 (lihat scripts/train_model.py).
Urutan URL-nya bisa direproduksi persis karena subsample-nya pakai seed tetap.
Jadi kalau encoder numpy menghasilkan vektor yang sama untuk URL yang sama,
encoder itu sah dipakai buat evaluasi.

Jalankan:
    PYTHONPATH=. python scripts/verify_encoder.py [n_sampel]

Kalau max abs diff > 1e-4, JANGAN percaya angka eval yang dihasilkan lewat
jalur numpy: laporkan sebagai blocked.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

import evalkit  # noqa: E402
from minilm_numpy import NumpyMiniLM  # noqa: E402

CACHE = evalkit.EMB_CACHE
DATA = evalkit.DATA_V2
TOL = 1e-4


def main() -> int:
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 200
    if not CACHE.exists() or not DATA.exists():
        print(f"SKIP: butuh {CACHE.name} dan {DATA.name} (dua-duanya di luar git).")
        return 2

    cache = np.load(CACHE, mmap_mode="r")
    n_cached = cache.shape[0]
    # Reproduksi PERSIS urutan URL yang dipakai train_model.py (seed 42).
    urls = evalkit.training_subsample(n_cached // 2)["URL"].astype(str).tolist()
    if len(urls) != n_cached:
        print(f"GAGAL reproduksi urutan: cache {n_cached} baris, subsample {len(urls)} baris.")
        return 1

    enc = NumpyMiniLM()
    idx = np.linspace(0, n_cached - 1, num=min(n, n_cached)).astype(int)
    got = enc.encode([urls[i] for i in idx], batch_size=64)
    ref = np.asarray(cache[idx], dtype=np.float32)

    diff = np.abs(got - ref)
    cos = float((got * ref).sum(1).mean())
    print(f"Snapshot: {enc.snapshot}")
    print(f"Dibandingkan {len(idx)} vektor dari {n_cached} baris cache.")
    print(f"max|diff| = {diff.max():.3e}   mean|diff| = {diff.mean():.3e}   cosine rata2 = {cos:.8f}")
    ok = diff.max() < TOL
    print("HASIL:", "COCOK, encoder numpy sah dipakai" if ok else f"TIDAK COCOK (tol {TOL})")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
