"""Bagian yang dipakai bareng oleh script evaluasi (evaluate.py & eval_report.py).

Isinya cuma tiga hal yang tadinya kembar di dua tempat:
  1. `load_forward`  : baca bobot .npz, kembalikan forward-pass numpy.
  2. `training_subsample_urls` / `holdout_split` : reproduksi PERSIS subsample yang
     dipakai train_model.py, supaya "holdout" beneran belum pernah dilihat model.
  3. `binary_metrics`: metrik untuk KELAS PHISHING (bukan rata-rata makro).

Konvensi label dataset & model: 1 = legitimate, 0 = phishing. Output sigmoid model
adalah P(legitimate). Jadi prediksi phishing = p_legit < threshold_legit.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA_V2 = ROOT / "data" / "data_v2.csv"
NEW_MODEL = ROOT / "models" / "phishing_detection_weights.npz"
EMB_CACHE = ROOT / "data" / "_emb_cache.npy"


def load_forward(path: Path):
    """Return (forward, in_dim, has_scaler). `forward(emb, feats) -> P(legitimate)`."""
    d = np.load(path, allow_pickle=False)
    w = {k: d[k].astype(np.float32) for k in ("w0", "b0", "w1", "b1", "w2", "b2")}
    has_scaler = "mean" in d.files
    in_dim = d["w0"].shape[0]

    def forward(emb: np.ndarray, feats: np.ndarray) -> np.ndarray:
        if in_dim == emb.shape[1]:  # model lama: embedding saja
            x = emb
        else:  # model baru: concat + scale
            x = np.hstack([emb, feats]).astype(np.float32)
            x = (x - d["mean"].astype(np.float32)) / d["scale"].astype(np.float32)
        h = np.maximum(x @ w["w0"] + w["b0"], 0.0)
        h = np.maximum(h @ w["w1"] + w["b1"], 0.0)
        return (1.0 / (1.0 + np.exp(-(h @ w["w2"] + w["b2"])))).ravel()

    return forward, in_dim, has_scaler


def clean_dataset(path: Path = DATA_V2) -> pd.DataFrame:
    df = pd.read_csv(path)
    return df.dropna(subset=["URL", "ClassLabel"]).drop_duplicates(subset=["URL"])


def training_subsample(max_per_class: int, df: pd.DataFrame | None = None) -> pd.DataFrame:
    """Reproduksi PERSIS baris (dan urutannya) yang dipakai scripts/train_model.py.

    Seed-nya sama (42), jadi hasilnya deterministik selama data_v2.csv tidak berubah.
    Dipakai untuk dua hal: (a) tahu mana yang HARUS dikeluarkan dari holdout,
    (b) mencocokkan urutan cache embedding di data/_emb_cache.npy.
    """
    df = clean_dataset() if df is None else df
    parts = [
        g.sample(min(len(g), max_per_class), random_state=42) for _, g in df.groupby("ClassLabel")
    ]
    return pd.concat(parts).sample(frac=1, random_state=42).reset_index(drop=True)


def holdout_split(trained_urls: set[str], n_per_class: int, seed: int = 7) -> pd.DataFrame:
    """Ambil sampel seimbang dari baris data_v2.csv yang TIDAK ikut training sama sekali."""
    df = clean_dataset()
    rest = df[~df["URL"].isin(trained_urls)]
    parts = [
        g.sample(min(len(g), n_per_class), random_state=seed) for _, g in rest.groupby("ClassLabel")
    ]
    return pd.concat(parts).sample(frac=1, random_state=seed).reset_index(drop=True)


@dataclass(frozen=True)
class Metrics:
    """Semua angka dari sudut pandang KELAS PHISHING sebagai kelas positif."""

    n: int
    n_phish: int
    n_legit: int
    accuracy: float
    precision: float
    recall: float
    f1: float
    tp: int  # phishing, ditandai phishing
    fn: int  # phishing, lolos jadi "aman"  <- kesalahan yang paling mahal
    fp: int  # legitimate, salah dituduh phishing
    tn: int
    roc_auc: float | None = None

    def as_rows(self) -> list[tuple[str, str]]:
        return [
            ("Accuracy", f"{self.accuracy*100:.2f}%"),
            ("Precision (phishing)", f"{self.precision*100:.2f}%"),
            ("Recall (phishing)", f"{self.recall*100:.2f}%"),
            ("F1 (phishing)", f"{self.f1*100:.2f}%"),
            ("ROC-AUC", "n/a" if self.roc_auc is None else f"{self.roc_auc:.4f}"),
        ]


def binary_metrics(y_true: np.ndarray, p_legit: np.ndarray, thr_legit: float = 0.5) -> Metrics:
    """y_true: 1=legit, 0=phishing. Prediksi phishing kalau p_legit < thr_legit.

    Ambang ini identik dengan aturan produksi di app/main.classify():
    `p_phish = 1 - p_legit; is_phishing = p_phish > threshold`.
    """
    y_true = np.asarray(y_true).astype(int)
    pred_legit = (p_legit >= thr_legit).astype(int)
    tp = int(((pred_legit == 0) & (y_true == 0)).sum())
    fn = int(((pred_legit == 1) & (y_true == 0)).sum())
    fp = int(((pred_legit == 0) & (y_true == 1)).sum())
    tn = int(((pred_legit == 1) & (y_true == 1)).sum())
    prec = tp / (tp + fp) if (tp + fp) else 0.0
    rec = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
    auc: float | None = None
    if len(set(y_true.tolist())) == 2:
        from sklearn.metrics import roc_auc_score

        auc = float(roc_auc_score(y_true, p_legit))
    return Metrics(
        n=len(y_true),
        n_phish=int((y_true == 0).sum()),
        n_legit=int((y_true == 1).sum()),
        accuracy=float((pred_legit == y_true).mean()),
        precision=prec,
        recall=rec,
        f1=f1,
        tp=tp,
        fn=fn,
        fp=fp,
        tn=tn,
        roc_auc=auc,
    )
