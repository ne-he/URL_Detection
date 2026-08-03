"""Encoder MiniLM tanpa torch: BERT forward-pass murni numpy.

KENAPA ADA FILE INI
-------------------
Produksi (`app/predictor.py`) tetap pakai `sentence-transformers`. File ini cadangan
untuk script evaluasi offline, karena di mesin dev tertentu `import torch` gagal
dengan `OSError: [WinError 1114]` (c10.dll gagal inisialisasi) dan bikin evaluasi
mustahil dijalankan. Daripada eval-nya BLOCKED, forward-pass BERT-nya ditulis ulang
di numpy. Bobot yang dibaca tetap bobot resmi `all-MiniLM-L6-v2` dari cache Hugging
Face, tokenizer-nya tetap `tokenizers` (Rust, tanpa torch).

Soal WinError 1114 itu sendiri, penyebabnya sudah ketemu waktu menulis eval: torch
gagal memuat runtime OpenMP-nya sendiri, TAPI berhasil kalau scikit-learn di-import
lebih dulu di proses yang sama (scikit-learn memuat runtime OpenMP yang kompatibel).
Jadi `import sklearn` sebelum `import torch` adalah penawarnya. Itu dipakai di
`encode_urls()` di bawah supaya jalur resmi tetap dicoba duluan.

Arsitektur yang direplikasi (lihat config.json model):
  BertModel: 6 layer, hidden 384, 12 head, intermediate 1536, GELU, LN eps 1e-12,
  absolute position embedding, max_seq_length 256 (dari sentence_bert_config.json)
  -> mean pooling dengan attention mask (1_Pooling/config.json)
  -> L2 normalize (modul 2_Normalize)

VALIDASI: `scripts/verify_encoder.py` membandingkan output file ini dengan
`data/_emb_cache.npy`, yaitu embedding yang DULU dihasilkan sentence-transformers
asli waktu training. Kalau selisihnya tidak ~0, hasil eval tidak boleh dipercaya.

`encode_urls()` otomatis pakai sentence-transformers kalau importnya sukses, dan
baru jatuh ke jalur numpy kalau tidak. Jadi begitu torch di mesin ini sehat lagi,
script eval otomatis balik ke jalur resmi tanpa diubah.
"""
from __future__ import annotations

import glob
import json
import os
from pathlib import Path

import numpy as np

MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
_CACHE_DIRNAME = "models--sentence-transformers--all-MiniLM-L6-v2"


def find_snapshot() -> Path:
    """Cari folder snapshot MiniLM di cache HF lokal."""
    roots = [
        os.getenv("HF_HOME"),
        os.getenv("TRANSFORMERS_CACHE"),
        str(Path.home() / ".cache" / "huggingface" / "hub"),
        str(Path.home() / ".cache" / "huggingface"),
    ]
    for root in roots:
        if not root:
            continue
        for base in (Path(root), Path(root) / "hub"):
            hits = sorted(glob.glob(str(base / _CACHE_DIRNAME / "snapshots" / "*")))
            for h in hits:
                if (Path(h) / "model.safetensors").exists():
                    return Path(h)
    raise FileNotFoundError(
        f"Snapshot {MODEL_ID} tidak ada di cache HF lokal. "
        "Jalankan sekali dengan koneksi internet + sentence-transformers, "
        "atau set HF_HOME ke cache yang benar."
    )


_SQRT2 = float(np.sqrt(2.0))


def _gelu(x: np.ndarray) -> np.ndarray:
    """GELU eksak (BERT pakai varian erf, bukan tanh-approx). Sebisa mungkin in-place."""
    from scipy.special import erf  # scipy sudah jadi dependensi scikit-learn

    t = erf(x / _SQRT2)
    t += 1.0
    t *= x
    t *= 0.5
    return t


def _layer_norm(x: np.ndarray, w: np.ndarray, b: np.ndarray, eps: float = 1e-12) -> np.ndarray:
    mu = x.mean(-1, keepdims=True)
    var = x.var(-1, keepdims=True)
    return (x - mu) / np.sqrt(var + eps) * w + b


class NumpyMiniLM:
    """BertModel + mean pooling + L2 normalize, numpy saja."""

    def __init__(self, snapshot: Path | None = None) -> None:
        from safetensors.numpy import load_file
        from tokenizers import Tokenizer

        snap = snapshot or find_snapshot()
        self.snapshot = snap
        cfg = json.loads((snap / "config.json").read_text(encoding="utf-8"))
        self.n_layers = int(cfg["num_hidden_layers"])
        self.n_heads = int(cfg["num_attention_heads"])
        self.hidden = int(cfg["hidden_size"])
        self.head_dim = self.hidden // self.n_heads
        self.eps = float(cfg.get("layer_norm_eps", 1e-12))

        sb = json.loads((snap / "sentence_bert_config.json").read_text(encoding="utf-8"))
        self.max_len = int(sb.get("max_seq_length", 256))

        self.w = {k: v.astype(np.float32) for k, v in load_file(str(snap / "model.safetensors")).items()}
        # safetensors menyimpan bobot Linear sebagai (out, in) seperti torch. Kita
        # pakainya x @ W.T, jadi transposenya dimaterialkan SEKALI di sini: kalau
        # tidak, tiap layer bikin view non-contiguous dan BLAS jadi jalur lambat.
        self.wt = {
            k: np.ascontiguousarray(v.T) for k, v in self.w.items() if v.ndim == 2 and "embeddings" not in k
        }

        self.tok = Tokenizer.from_file(str(snap / "tokenizer.json"))
        # ST memotong di max_seq_length token (termasuk [CLS]/[SEP]).
        self.tok.enable_truncation(max_length=self.max_len)
        self.tok.no_padding()  # padding diatur manual per-batch (lihat encode())

    # -- satu blok encoder BERT ------------------------------------------------
    # h disimpan 2D (B*T, H) supaya semua Linear jadi SATU gemm besar; kalau
    # dibiarkan 3D numpy memecahnya jadi B gemm kecil dan jatuh ~10x lebih lambat.
    def _block(self, h2: np.ndarray, B: int, T: int, i: int, mask_add: np.ndarray) -> np.ndarray:
        w, wt, p = self.w, self.wt, f"encoder.layer.{i}."
        H, nh, hd = self.hidden, self.n_heads, self.head_dim

        def proj(name: str) -> np.ndarray:
            key = p + f"attention.self.{name}"
            return (h2 @ wt[key + ".weight"] + w[key + ".bias"]).reshape(B, T, nh, hd).transpose(
                0, 2, 1, 3
            )

        q, k, v = proj("query"), proj("key"), proj("value")

        scores = q @ k.transpose(0, 1, 3, 2) / np.sqrt(hd, dtype=np.float32)
        scores += mask_add  # posisi padding didorong ke -inf
        scores -= scores.max(-1, keepdims=True)
        att = np.exp(scores)
        att /= att.sum(-1, keepdims=True)

        ctx = (att @ v).transpose(0, 2, 1, 3).reshape(B * T, H)
        ctx = ctx @ wt[p + "attention.output.dense.weight"] + w[p + "attention.output.dense.bias"]
        ctx += h2
        h2 = _layer_norm(
            ctx,
            w[p + "attention.output.LayerNorm.weight"],
            w[p + "attention.output.LayerNorm.bias"],
            self.eps,
        )

        inter = _gelu(h2 @ wt[p + "intermediate.dense.weight"] + w[p + "intermediate.dense.bias"])
        out = inter @ wt[p + "output.dense.weight"] + w[p + "output.dense.bias"]
        out += h2
        return _layer_norm(
            out, w[p + "output.LayerNorm.weight"], w[p + "output.LayerNorm.bias"], self.eps
        )

    def _forward(self, ids: np.ndarray, mask: np.ndarray) -> np.ndarray:
        w = self.w
        B, T = ids.shape
        h = w["embeddings.word_embeddings.weight"][ids].astype(np.float32)
        h += w["embeddings.position_embeddings.weight"][:T][None, :, :]
        h += w["embeddings.token_type_embeddings.weight"][0]  # token_type_id semuanya 0
        h2 = _layer_norm(
            h.reshape(B * T, self.hidden),
            w["embeddings.LayerNorm.weight"],
            w["embeddings.LayerNorm.bias"],
            self.eps,
        )

        mask_add = (1.0 - mask[:, None, None, :].astype(np.float32)) * np.float32(-1e9)
        for i in range(self.n_layers):
            h2 = self._block(h2, B, T, i, mask_add)

        # Mean pooling ber-mask, lalu L2 normalize (persis modul ST 1_Pooling + 2_Normalize).
        h = h2.reshape(B, T, self.hidden)
        m = mask[:, :, None].astype(np.float32)
        pooled = (h * m).sum(1) / np.clip(m.sum(1), 1e-9, None)
        norm = np.linalg.norm(pooled, axis=1, keepdims=True)
        return (pooled / np.clip(norm, 1e-12, None)).astype(np.float32)

    def encode(
        self,
        texts: list[str],
        batch_size: int = 64,
        progress: bool = False,
        token_budget: int = 6144,
    ) -> np.ndarray:
        """Encode dengan length-bucketing.

        Biaya forward-pass sebanding dengan JUMLAH TOKEN termasuk padding. Kalau
        URL panjang dan pendek dicampur dalam satu batch, semua ikut di-pad ke yang
        terpanjang dan sebagian besar komputasi terbuang di token [PAD]. Maka:
        tokenisasi dulu semuanya, urutkan menurut panjang, batch-nya dibatasi
        anggaran token, lalu hasilnya dikembalikan ke urutan asli. Hasil numerik
        identik dengan batching naif (padding tidak pernah ikut karena di-mask).
        """
        if not texts:
            return np.zeros((0, self.hidden), dtype=np.float32)

        enc = self.tok.encode_batch(texts)
        lens = np.asarray([len(e.ids) for e in enc])
        order = np.argsort(lens, kind="stable")

        out = np.empty((len(texts), self.hidden), dtype=np.float32)
        done = 0
        i = 0
        while i < len(order):
            # Tumbuhkan batch selama (jumlah baris x panjang terpanjang) masih di
            # bawah anggaran token. Karena sudah terurut, isinya panjangnya mirip.
            n, width = 0, 0
            while i + n < len(order) and n < batch_size:
                w = max(width, int(lens[order[i + n]]))
                if n and (n + 1) * w > token_budget:
                    break
                width, n = w, n + 1
            sel = order[i : i + n]
            ids = np.zeros((len(sel), width), dtype=np.int64)
            mask = np.zeros((len(sel), width), dtype=np.int64)
            for r, j in enumerate(sel):
                seq = enc[j].ids
                ids[r, : len(seq)] = seq
                mask[r, : len(seq)] = 1
            out[sel] = self._forward(ids, mask)
            i += len(sel)
            done += len(sel)
            if progress and done - (done % 512) != (done - len(sel)) - ((done - len(sel)) % 512):
                print(f"  encode {done}/{len(texts)}", flush=True)
        return out


_CACHED: NumpyMiniLM | None = None


def encode_urls(urls: list[str], batch_size: int = 64, progress: bool = False) -> tuple[np.ndarray, str]:
    """Encode URL. Return (embedding, nama_backend_yang_dipakai).

    Urutan pilihan: sentence-transformers asli dulu, numpy sebagai cadangan.
    """
    global _CACHED
    if os.getenv("FORCE_NUMPY_ENCODER", "0") not in ("0", "false", "False"):
        st_ok = False
    else:
        try:
            # WAJIB sebelum torch di mesin Windows yang kena WinError 1114: torch
            # gagal menginisialisasi OpenMP-nya sendiri, tapi lolos kalau runtime
            # OpenMP milik scikit-learn sudah termuat duluan. Kalau sklearn tidak
            # ada, biarkan saja dan tetap coba import ST.
            try:
                import sklearn  # noqa: F401, PLC0415
            except Exception:
                pass
            from sentence_transformers import SentenceTransformer  # noqa: PLC0415

            st_ok = True
        except Exception:
            st_ok = False

    if st_ok:
        model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
        emb = model.encode(
            urls, batch_size=128, convert_to_numpy=True, show_progress_bar=progress
        ).astype(np.float32)
        return emb, "sentence-transformers"

    if _CACHED is None:
        _CACHED = NumpyMiniLM()
    return _CACHED.encode(urls, batch_size=batch_size, progress=progress), "numpy-minilm"
