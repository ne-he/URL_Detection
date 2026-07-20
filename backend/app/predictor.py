"""Predictor: satu-satunya tempat yang tahu soal bobot model & sentence-transformers.

Desain:
- Model Keras asli (.h5) sudah dikonversi ke bobot numpy (.npz) lewat
  scripts/convert_h5_to_npz.py. Forward pass-nya direplikasi manual di sini:
  Dense(128, relu) -> Dense(64, relu) -> Dense(1, sigmoid). Dropout tidak aktif
  saat inference, jadi tidak perlu direplikasi.
  Alasan: TensorFlow tidak jalan di hardware ZeroGPU (satu-satunya tier gratis
  akun HF ini), dan untuk 3 layer dense TF memang overkill.
- Import ST dilakukan LAZY di dalam load(), sehingga test suite API bisa jalan
  di mesin tanpa ST (pakai stub), sedangkan produksi load model beneran.
- Konvensi label DIKUNCI di sini: output sigmoid model = P(legitimate).
  0.0 = phishing, 1.0 = legitimate (lihat data/sample_100.csv kolom ClassLabel).
  Regression test di tests/test_label_orientation.py menjaga konvensi ini.
"""
from __future__ import annotations

import logging
import time
from typing import Protocol

import numpy as np

from .features import extract_batch

logger = logging.getLogger("phishguard")

MODEL_VERSION = "v2.2-minilm-lexical"

# Kunci bobot di file .npz, urut sesuai layer. Divalidasi saat load.
# v2.2: input = concat[MiniLM(384), fitur_lexical(20)] lalu di-StandardScale
# pakai mean/scale yang disimpan bareng bobot.
_WEIGHT_KEYS = ("w0", "b0", "w1", "b1", "w2", "b2", "mean", "scale")


class Predictor(Protocol):
    """Kontrak minimal supaya API tidak bergantung ke implementasi model."""

    @property
    def ready(self) -> bool: ...

    @property
    def error(self) -> str | None: ...

    def prob_legitimate(self, urls: list[str]) -> list[float]: ...


class KerasURLPredictor:
    """Embedding MiniLM -> dense classifier (bobot .npz hasil konversi .h5 v1).

    Nama kelas dipertahankan dari era TF supaya import di main.py/tests stabil;
    isinya sekarang numpy murni.
    """

    def __init__(self, model_path: str, embedder_name: str, embedder_device: str = "cpu") -> None:
        self._model_path = model_path
        self._embedder_name = embedder_name
        self._embedder_device = embedder_device
        self._weights: dict[str, np.ndarray] | None = None
        self._embedder = None
        self._error: str | None = None

    @property
    def ready(self) -> bool:
        return self._weights is not None and self._embedder is not None

    @property
    def error(self) -> str | None:
        return self._error

    def load(self) -> None:
        """Load bobot + embedder + warmup. Raise kalau gagal: fail fast, bukan diam."""
        import os

        try:
            if not os.path.exists(self._model_path):
                raise FileNotFoundError(f"File model tidak ditemukan: {self._model_path}")

            t0 = time.perf_counter()
            with np.load(self._model_path) as npz:
                missing = [k for k in _WEIGHT_KEYS if k not in npz]
                if missing:
                    raise ValueError(
                        f"Bobot tidak lengkap di {self._model_path}: kurang {missing}"
                    )
                self._weights = {k: npz[k].astype(np.float32) for k in _WEIGHT_KEYS}

            # Lazy import: torch/ST berat dan tidak dibutuhkan oleh test API.
            from sentence_transformers import SentenceTransformer  # noqa: PLC0415

            self._embedder = SentenceTransformer(self._embedder_name, device=self._embedder_device)

            # Warmup: encode+predict sekali supaya request pertama tidak kena cold start.
            self.prob_legitimate(["http://example.com"])
            logger.info("Model siap dalam %.1fs", time.perf_counter() - t0)
        except Exception as exc:  # simpan alasan supaya /health bisa jujur
            self._error = f"{type(exc).__name__}: {exc}"
            self._weights = None
            self._embedder = None
            logger.exception("Gagal load model")
            raise

    def prob_legitimate(self, urls: list[str]) -> list[float]:
        if not self.ready:
            raise RuntimeError("Predictor belum siap: load() belum sukses")
        w = self._weights
        emb = np.asarray(self._embedder.encode(urls), dtype=np.float32)
        feats = extract_batch(urls)
        # Urutan concat HARUS sama dengan training: [embedding, fitur_lexical].
        x = np.hstack([emb, feats]).astype(np.float32)
        # StandardScaler yang di-fit saat training: (x - mean) / scale.
        x = (x - w["mean"]) / w["scale"]
        h = np.maximum(x @ w["w0"] + w["b0"], 0.0)
        h = np.maximum(h @ w["w1"] + w["b1"], 0.0)
        logits = h @ w["w2"] + w["b2"]
        probs = 1.0 / (1.0 + np.exp(-logits))
        # Output sigmoid = P(legitimate). JANGAN dibalik di tempat lain.
        return [float(p) for p in probs.ravel()]
