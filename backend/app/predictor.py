"""Predictor: satu-satunya tempat yang tahu soal TensorFlow & sentence-transformers.

Desain:
- Import TF/ST dilakukan LAZY di dalam load() — sehingga test suite API bisa jalan
  di mesin tanpa TF (pakai stub), sedangkan produksi (Docker) load model beneran.
- Konvensi label DIKUNCI di sini: output sigmoid model = P(legitimate).
  0.0 = phishing, 1.0 = legitimate (lihat data/sample_100.csv kolom ClassLabel).
  Regression test di tests/test_label_orientation.py menjaga konvensi ini.
"""
from __future__ import annotations

import logging
import time
from typing import Protocol

logger = logging.getLogger("phishguard")

MODEL_VERSION = "v2.0-minilm-keras"


class Predictor(Protocol):
    """Kontrak minimal supaya API tidak bergantung ke TF secara langsung."""

    @property
    def ready(self) -> bool: ...

    @property
    def error(self) -> str | None: ...

    def prob_legitimate(self, urls: list[str]) -> list[float]: ...


class KerasURLPredictor:
    """Embedding MiniLM -> Keras dense classifier (artefak .h5 dari training v1)."""

    def __init__(self, model_path: str, embedder_name: str) -> None:
        self._model_path = model_path
        self._embedder_name = embedder_name
        self._model = None
        self._embedder = None
        self._error: str | None = None

    @property
    def ready(self) -> bool:
        return self._model is not None and self._embedder is not None

    @property
    def error(self) -> str | None:
        return self._error

    def load(self) -> None:
        """Load model + embedder + warmup. Raise kalau gagal — fail fast, bukan diam."""
        import os

        try:
            if not os.path.exists(self._model_path):
                raise FileNotFoundError(f"File model tidak ditemukan: {self._model_path}")

            t0 = time.perf_counter()
            # Lazy import: TF berat dan tidak dibutuhkan oleh test API.
            from tensorflow.keras.models import load_model  # noqa: PLC0415
            from sentence_transformers import SentenceTransformer  # noqa: PLC0415

            self._model = load_model(self._model_path)
            self._embedder = SentenceTransformer(self._embedder_name)

            # Warmup: encode+predict sekali supaya request pertama tidak kena cold start.
            self.prob_legitimate(["http://example.com"])
            logger.info("Model siap dalam %.1fs", time.perf_counter() - t0)
        except Exception as exc:  # simpan alasan supaya /health bisa jujur
            self._error = f"{type(exc).__name__}: {exc}"
            self._model = None
            self._embedder = None
            logger.exception("Gagal load model")
            raise

    def prob_legitimate(self, urls: list[str]) -> list[float]:
        if not self.ready:
            raise RuntimeError("Predictor belum siap — load() belum sukses")
        vectors = self._embedder.encode(urls)
        preds = self._model.predict(vectors, verbose=0)
        # Output sigmoid = P(legitimate). JANGAN dibalik di tempat lain.
        return [float(p[0]) for p in preds]
