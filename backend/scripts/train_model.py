"""Latih PhishGuard v2.2: MiniLM embedding + fitur lexical -> MLP (128,64,1).

Kenapa MLPClassifier sklearn, bukan Keras:
  - Bobotnya (coefs_/intercepts_) memetakan PERSIS ke forward-pass numpy di
    app/predictor.py: sigmoid(relu(relu(x@w0+b0)@w1+b1)@w2+b2).
  - Jadi produksi tetap numpy murni, tidak perlu TF (yang mati di ZeroGPU).

Input = concat[ MiniLM(384) , fitur_lexical(20) ] = 404 dim, lalu di-StandardScale.
mean_/scale_ scaler DISIMPAN ke npz supaya predictor mereproduksi transform yang
sama. Label: 1=legitimate (= P(kelas 1) keluaran sigmoid), 0=phishing.

Output: models/phishing_detection_weights.npz dengan kunci
  w0,b0,w1,b1,w2,b2,mean,scale  (+ metadata feature_names, embedder_name).
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

# Paksa BLAS/torch pakai semua core fisik. Default torch di mesin ini = 1 thread,
# bikin embedding MiniLM lambat banget (~15 URL/s). Harus di-set SEBELUM import torch/numpy.
_THREADS = str(os.cpu_count() or 4)
for _v in ("OMP_NUM_THREADS", "MKL_NUM_THREADS", "OPENBLAS_NUM_THREADS", "NUMEXPR_NUM_THREADS"):
    os.environ.setdefault(_v, _THREADS)

import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.features import FEATURE_NAMES, extract_batch  # noqa: E402

DATA = ROOT / "data" / "data_v2.csv"
OUT = ROOT / "models" / "phishing_detection_weights.npz"
EMB_CACHE = ROOT / "data" / "_emb_cache.npy"
EMBEDDER = "all-MiniLM-L6-v2"
# Subsample seimbang: 404-dim MLP ga butuh 132k, dan embedding CPU mahal.
MAX_PER_CLASS = int(os.getenv("MAX_PER_CLASS", "25000"))


def embed(urls: list[str]) -> np.ndarray:
    import torch
    from sentence_transformers import SentenceTransformer

    torch.set_num_threads(int(_THREADS))
    model = SentenceTransformer(EMBEDDER, device="cpu")
    t0 = time.perf_counter()
    emb = model.encode(
        urls, batch_size=128, show_progress_bar=True, convert_to_numpy=True
    ).astype(np.float32)
    print(f"Embedding {len(urls)} URL selesai {time.perf_counter()-t0:.0f}s "
          f"({len(urls)/max(time.perf_counter()-t0,1):.0f} URL/s, {_THREADS} threads)")
    return emb


def main() -> None:
    df = pd.read_csv(DATA)
    df = df.dropna(subset=["URL", "ClassLabel"]).drop_duplicates(subset=["URL"])
    # Subsample seimbang per kelas biar embedding CPU ga berjam-jam.
    parts = []
    for lbl, g in df.groupby("ClassLabel"):
        parts.append(g.sample(min(len(g), MAX_PER_CLASS), random_state=42))
    df = pd.concat(parts).sample(frac=1, random_state=42).reset_index(drop=True)
    urls = df["URL"].astype(str).tolist()
    y = df["ClassLabel"].astype(int).to_numpy()
    print(f"Dataset (subsampled): {len(urls)} URL | "
          f"legit={int((y==1).sum())} phishing={int((y==0).sum())}")

    if EMB_CACHE.exists() and np.load(EMB_CACHE, mmap_mode="r").shape[0] == len(urls):
        print("Pakai cache embedding")
        emb = np.load(EMB_CACHE)
    else:
        emb = embed(urls)
        np.save(EMB_CACHE, emb)

    feats = extract_batch(urls)
    X = np.hstack([emb, feats]).astype(np.float32)
    print(f"Matriks fitur: {X.shape} (384 embed + {len(FEATURE_NAMES)} lexical)")

    Xtr, Xte, ytr, yte = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )

    scaler = StandardScaler().fit(Xtr)
    Xtr_s = scaler.transform(Xtr).astype(np.float32)
    Xte_s = scaler.transform(Xte).astype(np.float32)

    clf = MLPClassifier(
        hidden_layer_sizes=(128, 64),
        activation="relu",
        alpha=1e-4,
        batch_size=256,
        learning_rate_init=1e-3,
        max_iter=80,
        early_stopping=True,
        n_iter_no_change=6,
        random_state=42,
        verbose=True,
    )
    t0 = time.perf_counter()
    clf.fit(Xtr_s, ytr)
    print(f"Training selesai {time.perf_counter()-t0:.0f}s, iters={clf.n_iter_}")

    proba = clf.predict_proba(Xte_s)[:, 1]  # P(legit)
    pred = (proba >= 0.5).astype(int)
    print("\n=== HASIL DI TEST SET ===")
    print(classification_report(yte, pred, target_names=["phishing", "legit"], digits=4))
    print("Confusion matrix [baris=asli, kolom=prediksi] (0=phish,1=legit):")
    print(confusion_matrix(yte, pred))
    print(f"ROC-AUC: {roc_auc_score(yte, proba):.4f}")

    # Sanity: forward-pass numpy harus == sklearn (biar predictor produksi cocok)
    w0, w1, w2 = (c.astype(np.float32) for c in clf.coefs_)
    b0, b1, b2 = (b.astype(np.float32) for b in clf.intercepts_)

    def np_forward(x):
        h = np.maximum(x @ w0 + b0, 0.0)
        h = np.maximum(h @ w1 + b1, 0.0)
        return 1.0 / (1.0 + np.exp(-(h @ w2 + b2)))

    check = np_forward(Xte_s[:500]).ravel()
    diff = np.abs(check - proba[:500]).max()
    print(f"Max selisih numpy-vs-sklearn: {diff:.2e} (harus ~0)")
    assert diff < 1e-4, "Forward-pass numpy tidak cocok dengan sklearn!"

    np.savez(
        OUT,
        w0=w0, b0=b0, w1=w1, b1=b1, w2=w2, b2=b2,
        mean=scaler.mean_.astype(np.float32),
        scale=scaler.scale_.astype(np.float32),
        feature_names=np.array(FEATURE_NAMES),
        embedder_name=np.array(EMBEDDER),
    )
    print(f"\nDisimpan: {OUT}")


if __name__ == "__main__":
    main()
