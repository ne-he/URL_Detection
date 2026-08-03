"""Evaluasi head-to-head: model lama (v2.1, embedding-only) vs baru (v2.2, +lexical).

Dua set uji:
1. HOLDOUT: sampel dari data_v2.csv yang DIJAMIN tidak dipakai training
   (subsample training direproduksi deterministik lalu di-exclude).
2. TRICKY: kasus nyata yang model lama salah (binus.ac.id, netflixama111, dll)
   + kontrol yang dulunya benar (regresi dicek, bukan cuma perbaikan).

Embedding MiniLM dihitung SEKALI dan dipakai dua model (adil + hemat CPU).
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

_THREADS = str(os.cpu_count() or 4)
for _v in ("OMP_NUM_THREADS", "MKL_NUM_THREADS", "OPENBLAS_NUM_THREADS"):
    os.environ.setdefault(_v, _THREADS)

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))
from app.features import extract_batch  # noqa: E402
from evalkit import holdout_split, load_forward, training_subsample  # noqa: E402
from minilm_numpy import encode_urls  # noqa: E402

NEW_MODEL = ROOT / "models" / "phishing_detection_weights.npz"
OLD_MODEL = Path(sys.argv[1]) if len(sys.argv) > 1 else None
MAX_PER_CLASS = int(os.getenv("MAX_PER_CLASS", "10000"))
N_HOLDOUT = 400  # per kelas

# label: 1=legit, 0=phishing (konvensi dataset)
TRICKY = [
    # (url, label, catatan)
    ("https://binus.ac.id", 1, "kampus; dulu FALSE POSITIVE 83%"),
    ("https://www.ui.ac.id", 1, "kampus .ac.id"),
    ("https://pajak.go.id", 1, "pemerintah .go.id"),
    ("https://www.bca.co.id", 1, "bank lokal"),
    ("https://www.tokopedia.com", 1, "e-commerce; dulu benar"),
    ("https://www.google.com", 1, "kontrol; dulu benar"),
    ("https://github.com", 1, "kontrol; dulu benar"),
    ("https://netflixama111.com", 0, "dulu FALSE NEGATIVE 99.98%"),
    ("https://www.metamaskloginu.blogspot.com/", 0, "dulu FALSE NEGATIVE 68%"),
    ("https://www.roblox.com.ml/users/142627874477/profile/", 0, "dulu benar"),
    ("http://support.m365-microsoft.com/i/ab041e84e499", 0, "dulu benar"),
    ("http://register-facebook.blogspot.com", 0, "dulu benar"),
    ("http://robiox.com.gr/", 0, "typosquat; dulu benar"),
    ("https://accounts.google.com.drive.pratham.vincacybertechltd.myshn.net", 0, "subdomain nyamar"),
    ("http://58.23.215.31:8765/wzoptup.exe", 0, "IP + exe"),
]


def main() -> None:
    # Reproduksi subsample training PERSIS (random_state sama dengan train_model.py),
    # lalu holdout = sisanya. Ini jaminan "belum pernah dilihat model baru".
    # Dua helper di bawah sekarang tinggal di scripts/evalkit.py, dipakai bareng
    # dengan scripts/eval_report.py supaya definisi holdout-nya cuma ada satu.
    trained = set(training_subsample(MAX_PER_CLASS)["URL"])
    hold = holdout_split(trained, N_HOLDOUT)
    urls = hold["URL"].astype(str).tolist() + [u for u, _, _ in TRICKY]
    y_hold = hold["ClassLabel"].astype(int).to_numpy()
    print(f"Holdout: {len(hold)} URL (legit={int((y_hold==1).sum())}, "
          f"phish={int((y_hold==0).sum())}) + {len(TRICKY)} tricky")

    # Lewat encode_urls, bukan langsung SentenceTransformer: helper itu memakai
    # sentence-transformers kalau bisa, dan jatuh ke encoder numpy kalau torch di
    # mesin ini gagal di-import (WinError 1114). Keluarannya terbukti setara,
    # lihat scripts/verify_encoder.py.
    emb, backend = encode_urls(urls, progress=True)
    print(f"Embedding via: {backend}")
    feats = extract_batch(urls)

    models = {}
    if OLD_MODEL and OLD_MODEL.exists():
        models["LAMA v2.1"] = load_forward(OLD_MODEL)[0]
    models["BARU v2.2"] = load_forward(NEW_MODEL)[0]

    n_h = len(hold)
    for name, fwd in models.items():
        p = fwd(emb, feats)
        pred_h = (p[:n_h] >= 0.5).astype(int)
        acc = float((pred_h == y_hold).mean())
        tp = int(((pred_h == 0) & (y_hold == 0)).sum())  # phishing ketangkep
        fp = int(((pred_h == 0) & (y_hold == 1)).sum())  # legit dituduh
        fn = int(((pred_h == 1) & (y_hold == 0)).sum())  # phishing lolos
        print(f"\n===== {name} =====")
        print(f"HOLDOUT acc={acc*100:.2f}%  phishing ketangkep={tp}/{int((y_hold==0).sum())}  "
              f"false-positive={fp}  phishing lolos={fn}")
        print("TRICKY:")
        ok = 0
        for (u, lbl, note), pl in zip(TRICKY, p[n_h:]):
            pred = 1 if pl >= 0.5 else 0
            mark = "BENER" if pred == lbl else "SALAH"
            ok += pred == lbl
            print(f"  [{mark}] p_legit={pl:6.3f} harusnya={'legit' if lbl else 'PHISH'}  {u}  ({note})")
        print(f"TRICKY score: {ok}/{len(TRICKY)}")


if __name__ == "__main__":
    main()
