"""Konversi artefak Keras .h5 ke bobot numpy .npz (sekali jalan, butuh h5py).

Kenapa: TensorFlow tidak jalan di hardware ZeroGPU (satu-satunya tier gratis
akun HF ini), padahal modelnya cuma 3 layer dense. Bobotnya diekstrak langsung
dari HDF5 tanpa TensorFlow, lalu forward pass direplikasi numpy di
app/predictor.py.

Pakai: python scripts/convert_h5_to_npz.py
"""
from __future__ import annotations

import h5py
import numpy as np

SRC = "models/phishing_detection_deeplearning.h5"
DST = "models/phishing_detection_weights.npz"

# Arsitektur .h5 (lihat attrs model_config): 384 -> Dense(128, relu)
# -> Dropout(0.3) -> Dense(64, relu) -> Dropout(0.2) -> Dense(1, sigmoid)
_MAP = {
    "w0": "dense/dense/kernel:0",
    "b0": "dense/dense/bias:0",
    "w1": "dense_1/dense_1/kernel:0",
    "b1": "dense_1/dense_1/bias:0",
    "w2": "dense_2/dense_2/kernel:0",
    "b2": "dense_2/dense_2/bias:0",
}


def main() -> None:
    with h5py.File(SRC, "r") as f:
        g = f["model_weights"]
        weights = {key: g[path][()] for key, path in _MAP.items()}
    np.savez(DST, **weights)
    shapes = {k: v.shape for k, v in weights.items()}
    print(f"OK: {DST} ditulis. Shapes: {shapes}")


if __name__ == "__main__":
    main()
