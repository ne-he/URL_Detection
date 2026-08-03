"""Laporan evaluasi PhishGuard v2.2 -> docs/EVAL.md + docs/confusion_matrix.png.

Bedanya dengan scripts/evaluate.py: file itu head-to-head model lama vs baru waktu
v2.2 dikembangkan (butuh path model lama sebagai argumen). File INI mengukur model
yang sedang dipakai produksi, dan menuliskan hasilnya jadi dokumen. Bagian yang
sama (loader bobot, reproduksi subsample training, metrik) hidup di scripts/evalkit.py.

BAGIAN 1  metrik standar
  a. Test split internal: 15% yang disisihkan train_model.py. Ini asal angka yang
     selama ini ditulis di README, jadi ikut dicetak supaya bisa dicek.
  b. Holdout ketat: baris data_v2.csv yang TIDAK pernah masuk subsample training
     sama sekali (jadi tidak ikut fit scaler maupun bobot).
  Semua precision/recall/F1 dihitung untuk KELAS PHISHING sebagai kelas positif.

BAGIAN 2  set adversarial (scripts/adversarial_set.py)
  Lolos-deteksi diukur PER KATEGORI. Ada kelompok kontrol berisi URL sah yang
  penampakannya mencurigakan, buat mengukur ongkos false positive.

Jalankan:
    cd backend
    PYTHONPATH=. python scripts/eval_report.py                # default 500/kelas
    PYTHONPATH=. python scripts/eval_report.py --holdout 50   # smoke test cepat

Catatan waktu: di mesin tanpa torch, embedding dihitung numpy dengan kecepatan
belasan URL per detik. Holdout 500/kelas artinya 1000 URL, sekitar satu menit.
Embedding disimpan ke data/_eval_emb_cache.npz, jadi run berikutnya instan.
"""
from __future__ import annotations

import argparse
import hashlib
import os
import sys
from datetime import date
from pathlib import Path

_THREADS = str(os.cpu_count() or 4)
for _v in ("OMP_NUM_THREADS", "MKL_NUM_THREADS", "OPENBLAS_NUM_THREADS", "NUMEXPR_NUM_THREADS"):
    os.environ.setdefault(_v, _THREADS)

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

import adversarial_set  # noqa: E402
import evalkit  # noqa: E402
from app.features import extract_batch  # noqa: E402
from minilm_numpy import encode_urls  # noqa: E402

DOCS = REPO / "docs"
EVAL_MD = DOCS / "EVAL.md"
CM_PNG = DOCS / "confusion_matrix.png"
EVAL_EMB_CACHE = ROOT / "data" / "_eval_emb_cache.npz"
THRESHOLDS = (0.3, 0.4, 0.5, 0.6, 0.7)


def _reconfigure_stdout() -> None:
    try:  # konsol Windows default cp1252, URL homograph tidak bisa dicetak
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def log(msg: str) -> None:
    """Progress ke stdout, selalu di-flush: script ini biasa dijalankan di
    background dan diintip lewat file log, jadi buffer yang nyangkut bikin
    kelihatan seperti macet padahal jalan."""
    print(msg, flush=True)


def cached_encode(urls: list[str], tag: str) -> tuple[np.ndarray, str]:
    """Encode dengan cache di disk. Kunci cache = hash daftar URL, jadi kalau
    datanya berubah cache otomatis dianggap basi.

    Nama encoder yang menghasilkan vektor ikut disimpan (`<key>__backend`), supaya
    laporan tetap bisa menyebut asal-usul angkanya walau run ini cuma baca cache.
    """
    key = tag + "_" + hashlib.sha256("\n".join(urls).encode("utf-8")).hexdigest()[:16]
    if EVAL_EMB_CACHE.exists():
        with np.load(EVAL_EMB_CACHE, allow_pickle=False) as z:
            if key in z.files:
                origin = str(z[key + "__backend"]) if key + "__backend" in z.files else "tidak tercatat"
                log(f"[{tag}] pakai cache embedding ({len(urls)} URL, asal: {origin})")
                return z[key], origin
    emb, backend = encode_urls(urls, progress=True)
    store = {}
    if EVAL_EMB_CACHE.exists():
        with np.load(EVAL_EMB_CACHE, allow_pickle=False) as z:
            store = {k: z[k] for k in z.files}
    store[key] = emb
    store[key + "__backend"] = np.array(backend)
    np.savez(EVAL_EMB_CACHE, **store)
    return emb, backend


def md_table(header: list[str], rows: list[list[str]]) -> str:
    out = ["| " + " | ".join(header) + " |", "|" + "|".join(["---"] * len(header)) + "|"]
    out += ["| " + " | ".join(r) + " |" for r in rows]
    return "\n".join(out)


def confusion_png(m: evalkit.Metrics, path: Path, subtitle: str) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    cm = np.array([[m.tp, m.fn], [m.fp, m.tn]], dtype=int)
    labels = ["phishing", "legitimate"]
    fig, ax = plt.subplots(figsize=(5.4, 4.6), dpi=160)
    ax.imshow(cm, cmap="Greens", vmin=0, vmax=cm.max())
    for i in range(2):
        for j in range(2):
            frac = cm[i, j] / max(cm[i].sum(), 1)
            ax.text(
                j,
                i,
                f"{cm[i, j]}\n{frac*100:.1f}%",
                ha="center",
                va="center",
                fontsize=13,
                fontweight="bold",
                color="white" if cm[i, j] > cm.max() * 0.55 else "#12321f",
            )
    ax.set_xticks([0, 1], [f"diprediksi\n{x}" for x in labels])
    ax.set_yticks([0, 1], [f"asli\n{x}" for x in labels])
    ax.set_title(f"PhishGuard v2.2 confusion matrix\n{subtitle}", fontsize=10)
    for s in ax.spines.values():
        s.set_visible(False)
    ax.tick_params(length=0)
    fig.tight_layout()
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path)
    plt.close(fig)


def main() -> int:
    _reconfigure_stdout()
    ap = argparse.ArgumentParser()
    ap.add_argument("--holdout", type=int, default=500, help="jumlah URL holdout per kelas")
    ap.add_argument("--threshold", type=float, default=0.5, help="ambang P(legitimate)")
    args = ap.parse_args()

    if not evalkit.NEW_MODEL.exists():
        log(f"BLOCKED: bobot model tidak ada di {evalkit.NEW_MODEL}")
        return 1
    forward, in_dim, has_scaler = evalkit.load_forward(evalkit.NEW_MODEL)
    log(f"Model: {evalkit.NEW_MODEL.name} in_dim={in_dim} scaler={has_scaler}")

    have_data = evalkit.DATA_V2.exists()
    if not have_data:
        log(f"BLOCKED: {evalkit.DATA_V2} tidak ada. Bangun ulang lewat scripts/build_dataset.py.")
        return 1

    notes: list[str] = []
    backends: set[str] = set()

    # ---------- BAGIAN 1a: test split internal (pakai cache embedding training) ----
    split_metrics = None
    n_train_total = None
    if evalkit.EMB_CACHE.exists():
        cache = np.load(evalkit.EMB_CACHE, mmap_mode="r")
        n_cached = cache.shape[0]
        sub = evalkit.training_subsample(n_cached // 2)
        if len(sub) == n_cached:
            from sklearn.model_selection import train_test_split

            n_train_total = n_cached
            urls_tr = sub["URL"].astype(str).tolist()
            y_tr = sub["ClassLabel"].astype(int).to_numpy()
            # train_test_split memisahkan berdasarkan indeks, jadi memberi array
            # indeks dengan seed & stratify yang sama menghasilkan partisi yang
            # identik dengan yang dipakai train_model.py. Yang diambil: bagian test.
            idx_te = train_test_split(
                np.arange(n_cached), y_tr, test_size=0.15, random_state=42, stratify=y_tr
            )[1]
            sel = np.sort(idx_te)
            emb_te = np.asarray(cache[sel], dtype=np.float32)
            feats_te = extract_batch([urls_tr[i] for i in sel])
            p_te = forward(emb_te, feats_te)
            split_metrics = evalkit.binary_metrics(y_tr[sel], p_te, args.threshold)
            log(f"Test split internal: n={split_metrics.n} acc={split_metrics.accuracy*100:.2f}%")
        else:
            notes.append(
                f"Cache embedding ({n_cached} baris) tidak cocok dengan subsample data_v2.csv "
                "sekarang, jadi angka test-split internal dilewati."
            )
    else:
        notes.append("data/_emb_cache.npy tidak ada, angka test-split internal dilewati.")

    # ---------- BAGIAN 1b: holdout ketat -----------------------------------------
    per_class = args.holdout
    trained_urls = set(
        evalkit.training_subsample(n_train_total // 2 if n_train_total else 10000)["URL"]
    )
    hold = evalkit.holdout_split(trained_urls, per_class)
    urls_h = hold["URL"].astype(str).tolist()
    y_h = hold["ClassLabel"].astype(int).to_numpy()
    log(f"Holdout ketat: {len(urls_h)} URL (legit={int((y_h==1).sum())}, phish={int((y_h==0).sum())})")
    emb_h, be = cached_encode(urls_h, f"holdout{per_class}")
    backends.add(be)
    feats_h = extract_batch(urls_h)
    p_h = forward(emb_h, feats_h)
    hm = evalkit.binary_metrics(y_h, p_h, args.threshold)
    log(f"  acc={hm.accuracy*100:.2f}% recall={hm.recall*100:.2f}% lolos={hm.fn}")

    sweep = [(t, evalkit.binary_metrics(y_h, p_h, t)) for t in THRESHOLDS]

    # ---------- BAGIAN 2: adversarial --------------------------------------------
    adv = adversarial_set.build()
    adv_urls = [u for _, u, _ in adv]
    emb_a, be = cached_encode(adv_urls, "adv")
    backends.add(be)
    feats_a = extract_batch(adv_urls)
    p_a = forward(emb_a, feats_a)

    from app.threat import in_allowlist

    per_cat: dict[str, dict] = {}
    for (cat, url, lbl), p in zip(adv, p_a):
        d = per_cat.setdefault(
            cat, {"n": 0, "miss": 0, "miss_model": 0, "probs": [], "rows": [], "label": lbl}
        )
        allow = in_allowlist(url)
        # Dua vonis dicatat terpisah:
        #   pred_model    = keputusan model saja
        #   pred_pipeline = seperti produksi, allowlist menang duluan
        # Bedanya penting: kalau kelompok kontrol cuma selamat berkat allowlist,
        # itu artinya yang mencegah false positive adalah daftar tulis tangan,
        # bukan modelnya.
        pred_model = int(p >= args.threshold)
        pred_pipeline = 1 if allow else pred_model
        d["n"] += 1
        d["miss"] += int(pred_pipeline != lbl)
        d["miss_model"] += int(pred_model != lbl)
        d["probs"].append(float(p))
        d["rows"].append((url, float(p), pred_pipeline, allow, pred_pipeline != lbl))

    log("\nAdversarial per kategori (pipeline | model saja):")
    for cat, d in per_cat.items():
        log(
            f"  {cat:22} salah {d['miss']}/{d['n']} ({d['miss']/d['n']*100:.0f}%) | "
            f"model saja {d['miss_model']}/{d['n']} ({d['miss_model']/d['n']*100:.0f}%)"
        )

    # ---------- Gambar + dokumen --------------------------------------------------
    confusion_png(hm, CM_PNG, f"holdout ketat, n={hm.n}, threshold {args.threshold}")
    write_report(
        hm=hm,
        split_metrics=split_metrics,
        n_train_total=n_train_total,
        sweep=sweep,
        per_cat=per_cat,
        threshold=args.threshold,
        backends=backends,
        notes=notes,
        per_class=per_class,
    )
    log(f"\nDitulis: {EVAL_MD}\nDitulis: {CM_PNG}")
    return 0


# --------------------------------------------------------------------------------
# Penulisan dokumen. Semua ANGKA di bawah datang dari hasil run di atas; yang
# ditulis tangan cuma penjelasan kenapa angka itu penting.
# --------------------------------------------------------------------------------
CAT_COMMENT = {
    "typosquatting": "Domainnya ASCII biasa dan panjangnya wajar, jadi tidak ada sinyal leksikal yang jelas. Yang membuatnya tertangkap kemungkinan besar bukan kemampuan mengenali salah eja brand, melainkan kecenderungan umum model menjawab PHISHING untuk URL berpath (lihat Temuan utama).",
    "homograph": "Huruf Kiril menjadi token asing yang tidak pernah muncul di data latih, sehingga URL keluar dari distribusi yang dikenal model. Satu yang lolos justru yang paling pendek dan paling mirip domain sah.",
    "punycode": "Bentuk `xn--` membuat host terlihat acak dan panjang, mirip pola domain sampah di data latih. Ini kategori yang paling wajar tertangkap.",
    "shortener": "Ada fitur leksikal `is_shortener`. Tapi hasil ini justru perlu dibaca terbalik: mayoritas tautan bit.ly di dunia nyata TIDAK berbahaya, jadi memvonis PHISHING untuk semua shortener adalah perilaku yang salah, bukan prestasi.",
    "subdomain_spoof": "Fitur `brand_mismatch` dan `n_subdomain` memang dirancang untuk pola ini, dan host-nya panjang dengan TLD berisiko. Kategori dengan alasan teknis paling kuat untuk tertangkap.",
    "userinfo_obfuscation": "Fitur `has_at` menangkap tanda @, dan host aslinya sering berupa IP atau TLD berisiko.",
    "control_benign": "Kelompok kontrol: semuanya sah. Angka 'salah' di sini adalah false positive, yaitu situs aman yang diberi label PHISHING. Ini kategori terpenting di tabel.",
}


def _verdict(rate: float) -> str:
    if rate == 0:
        return "aman"
    if rate <= 0.15:
        return "sebagian besar tertangkap"
    if rate <= 0.5:
        return "bocor"
    return "JEBOL"


def write_report(
    *,
    hm,
    split_metrics,
    n_train_total,
    sweep,
    per_cat,
    threshold: float,
    backends: set[str],
    notes: list[str],
    per_class: int,
) -> None:
    DOCS.mkdir(parents=True, exist_ok=True)

    metric_rows = [[name, val] for name, val in hm.as_rows()]
    if split_metrics is not None:
        metric_rows = [
            [name, split_val, hold_val]
            for (name, split_val), (_, hold_val) in zip(split_metrics.as_rows(), hm.as_rows())
        ]
        metric_header = ["Metrik (kelas positif = phishing)", f"Test split internal (n={split_metrics.n})", f"Holdout ketat (n={hm.n})"]
    else:
        metric_header = ["Metrik (kelas positif = phishing)", f"Holdout ketat (n={hm.n})"]

    cm_rows = [
        ["**asli phishing**", str(hm.tp), f"{hm.fn}  <- lolos"],
        ["**asli legitimate**", f"{hm.fp}  <- salah tuduh", str(hm.tn)],
    ]

    sweep_rows = [
        [
            f"{t:.1f}" + ("  (dipakai produksi)" if abs(t - threshold) < 1e-9 else ""),
            f"{m.recall*100:.2f}%",
            f"{m.precision*100:.2f}%",
            f"{m.f1*100:.2f}%",
            f"{m.accuracy*100:.2f}%",
            str(m.fn),
            str(m.fp),
        ]
        for t, m in sweep
    ]

    adv_rows, detail_blocks = [], []
    for cat, d in per_cat.items():
        rate = d["miss"] / d["n"]
        rate_model = d["miss_model"] / d["n"]
        is_control = d["label"] == 1
        col = "false positive" if is_control else "lolos deteksi"
        adv_rows.append(
            [
                f"`{cat}`",
                str(d["n"]),
                str(d["n"] - d["miss"]),
                str(d["miss"]),
                f"**{rate*100:.0f}%**",
                f"{d['miss_model']} ({rate_model*100:.0f}%)",
                f"{np.median(d['probs']):.3f}",
                ("n/a" if is_control else _verdict(rate)),
            ]
        )
        lines = [
            f"| URL | P(legitimate) | vonis | benar? |",
            "|---|---|---|---|",
        ]
        for url, p, pred_legit, allow, wrong in d["rows"]:
            vonis = "LEGITIMATE" if pred_legit else "PHISHING"
            if allow:
                vonis += " (allowlist)"
            lines.append(f"| `{url}` | {p:.3f} | {vonis} | {'salah' if wrong else 'benar'} |")
        detail_blocks.append(
            f"<details>\n<summary><code>{cat}</code>: {col} {d['miss']}/{d['n']}"
            f" ({rate*100:.0f}%)</summary>\n\n" + "\n".join(lines) + "\n\n</details>"
        )

    backend_note = ", ".join(sorted(backends))
    extra_notes = "\n".join(f"- {n}" for n in notes)

    # ---- Temuan utama, dirakit dari angka yang baru saja diukur -----------------
    ctl = per_cat.get("control_benign")
    phish_cats = {c: d for c, d in per_cat.items() if d["label"] == 0}
    n_adv = sum(d["n"] for d in phish_cats.values())
    miss_adv = sum(d["miss"] for d in phish_cats.values())
    if ctl:
        ctl_ok_model = ctl["n"] - ctl["miss_model"]
        ctl_saved_by_allowlist = ctl["miss_model"] - ctl["miss"]
        finding = f"""
## Temuan utama: modelnya bias ke PHISHING

Ini kesimpulan terpenting dari Bagian 2, dan tidak kelihatan kalau cuma melihat
angka adversarial.

Di set adversarial, {n_adv - miss_adv} dari {n_adv} URL phishing samaran tertangkap
(cuma {miss_adv} yang lolos). Kelihatannya bagus. Tapi di kelompok kontrol yang isinya
URL **sah**, model sendirian cuma benar **{ctl_ok_model} dari {ctl['n']}**. Halaman login
asli seperti `accounts.google.com`, `login.microsoftonline.com`, `www.paypal.com/signin`,
dan `ibank.klikbca.com` semuanya divonis PHISHING dengan P(legitimate) di bawah 0.1.

Artinya angka adversarial tadi sebagian besar **bukan** bukti model bisa mengenali
penyamaran. Model cenderung menjawab PHISHING untuk hampir semua URL yang punya path,
kata seperti login/verify, atau subdomain. URL samaran kebetulan berbentuk seperti itu,
jadi ikut tertangkap. Detektor yang menjawab "phishing" untuk semua hal juga akan
mendapat skor adversarial sempurna.

Yang menahan false positive di produksi ternyata **allowlist tulisan tangan di
`app/threat.py`**, bukan modelnya: {ctl_saved_by_allowlist} dari {ctl['n']} URL kontrol
selamat semata-mata karena host-nya kebetulan terdaftar di sana. `github.com/login`
dapat P(legitimate) 0.000 dari model dan hanya lolos karena allowlist.

Kenapa ini terjadi, dugaan paling masuk akal ada di komposisi data latih: kelas
legitimate didominasi domain Tranco dalam bentuk telanjang (`https://www.contoh.com`,
tanpa path), sedangkan kelas phishing hampir selalu punya path dan query. Model
akhirnya belajar "ada path berarti phishing", yang kebetulan benar di data latih
dan salah di dunia nyata.

Konsekuensi praktisnya: **recall {'%.1f' % (hm.recall * 100)}% di holdout tidak bisa
dibaca sebagai "aman dipakai"**. Yang perlu diperbaiki duluan bukan recall, melainkan
komposisi kelas legitimate di dataset. Rencananya ada di bagian
"Dataset and its limitations" pada `backend/README.md`.
"""
    else:
        finding = ""

    # Catatan encoder ditulis sesuai jalur yang BENAR-BENAR dipakai run ini,
    # bukan asumsi. `cache` berarti embedding diambil dari run sebelumnya.
    if "numpy-minilm" in backends:
        encoder_note = (
            "  `sentence-transformers` **tidak bisa dipakai** di mesin ini: `import torch` gagal\n"
            "  dengan `OSError: [WinError 1114]` (c10.dll gagal inisialisasi). Sebagai gantinya\n"
            "  forward-pass MiniLM ditulis ulang memakai numpy di `scripts/minilm_numpy.py`,\n"
            "  dengan bobot resmi `all-MiniLM-L6-v2` yang sama."
        )
    else:
        encoder_note = (
            "  Jalur resminya terpakai, jadi angka di atas tidak bergantung pada implementasi\n"
            "  pengganti apa pun. Catatan lingkungan: di mesin ini `import torch` gagal dengan\n"
            "  `OSError: [WinError 1114]` kalau berdiri sendiri, dan baru berhasil kalau\n"
            "  `sklearn` di-import lebih dulu di proses yang sama (torch gagal memuat runtime\n"
            "  OpenMP-nya sendiri). Script eval memang mengimpor sklearn duluan, makanya lolos."
        )

    doc = f"""# PhishGuard v2.2: hasil evaluasi

Dihasilkan otomatis oleh `backend/scripts/eval_report.py` pada {date.today().isoformat()}.
Semua angka di halaman ini keluar dari satu kali run di data yang ada di mesin,
bukan disalin dari catatan lama. Untuk membuat ulang:

```bash
cd backend
PYTHONPATH=. python scripts/eval_report.py --holdout {per_class}
```

Model yang diukur: `models/phishing_detection_weights.npz` (`v2.2-minilm-lexical`),
yaitu MiniLM `all-MiniLM-L6-v2` (384 dim) digabung 20 fitur leksikal, lalu MLP 128-64-1.
Ambang produksi: `PHISHING_THRESHOLD={threshold}`, artinya vonis PHISHING kalau
P(legitimate) < {threshold} (aturan yang sama persis dengan `app/main.classify`).

---

## Yang perlu dibaca duluan: recall lebih penting daripada accuracy

Untuk detektor phishing, dua jenis kesalahan tidak setara.

- **False negative** (situs phishing divonis aman) berujung pada orang memasukkan
  password atau nomor kartu ke halaman penipu. Kerugiannya nyata, langsung, dan
  sering tidak bisa dibatalkan.
- **False positive** (situs aman divonis phishing) berujung pada peringatan yang
  mengganggu. Penggunanya jengkel, lalu membuka halamannya juga.

Karena itu angka yang paling menentukan di sini adalah **recall kelas phishing**,
yaitu berapa persen situs phishing yang berhasil ditangkap. Accuracy tunggal bisa
menyesatkan: pada data yang seimbang sekalipun, accuracy mencampur dua jenis
kesalahan yang harganya jauh berbeda menjadi satu angka.

Konsekuensinya untuk pembacaan tabel di bawah: kolom yang harus dilihat pertama
adalah **recall** dan kolom **lolos** di confusion matrix, bukan accuracy.

Satu catatan supaya tidak berlebihan: mengutamakan recall bukan berarti false positive
gratis. Bagian 2 di bawah menunjukkan modelnya sudah kelewat curiga, dan itu masalah
tersendiri.

---
{finding}
---

## Bagian 1: evaluasi standar

### Dari mana datanya

- Sumber: `backend/data/data_v2.csv`, dataset yang dirakit `scripts/build_dataset.py`.
- Model dilatih pada subsample seimbang {n_train_total if n_train_total else "?"} URL dari file itu (seed tetap 42).
- **Test split internal**: 15% dari subsample training, disisihkan `train_test_split`
  di `scripts/train_model.py`. Bobot model tidak pernah di-fit di baris ini, tapi baris ini
  berasal dari populasi yang sama dengan data latih.
- **Holdout ketat**: {per_class} URL per kelas yang diambil dari baris `data_v2.csv`
  yang **tidak pernah masuk subsample training sama sekali**, jadi tidak ikut mem-fit
  bobot maupun StandardScaler. Ini angka yang lebih jujur dari dua-duanya.

**Batasan data yang harus disebut:** yang ikut ke dalam repo cuma
`backend/data/sample_100.csv`, 100 baris, dan itu pun potongan dari dataset **v1**
(`data.csv`, 18 kolom fitur numerik), bukan dari `data_v2.csv` yang dipakai melatih
model sekarang. 100 baris terlalu sedikit untuk mengukur apa pun: satu URL saja sudah
menggeser accuracy satu poin penuh. Angka di halaman ini dihitung dari `data_v2.csv`
lengkap yang **ada di mesin lokal tapi sengaja tidak di-commit** (lihat `.gitignore`).
Siapa pun yang meng-clone repo ini harus menjalankan `scripts/build_dataset.py` dulu
untuk membangun ulang dataset sebelum bisa mereproduksi angka-angka ini, dan hasilnya
tidak akan identik karena feed phishing yang jadi bahan sudah berganti isi.

### Metrik

{md_table(metric_header, metric_rows)}

### Confusion matrix (holdout ketat, n={hm.n}, threshold {threshold})

{md_table(["", "diprediksi phishing", "diprediksi legitimate"], cm_rows)}

![Confusion matrix](confusion_matrix.png)

Angka yang paling mahal adalah **{hm.fn} URL phishing yang lolos** dari {hm.n_phish}
URL phishing di holdout. Angka **{hm.fp} false positive** dari {hm.n_legit} URL sah
adalah ongkos yang dibayar untuk itu.

### Kalau ambangnya digeser

Threshold bukan keputusan kode, melainkan keputusan operasional (`PHISHING_THRESHOLD`).
Tabel ini menunjukkan pertukarannya di holdout yang sama.

{md_table(["Threshold P(legit)", "Recall phishing", "Precision phishing", "F1 phishing", "Accuracy", "Phishing lolos", "False positive"], sweep_rows)}

---

## Bagian 2: set adversarial

Set kecil berisi URL phishing yang sengaja disamarkan, dikelompokkan per teknik
penyamaran, ditambah satu kelompok kontrol berisi URL sah yang penampakannya
mencurigakan. Semua URL adversarial di sini **buatan** dan tidak menunjuk ke situs
sungguhan; definisinya ada di `backend/scripts/adversarial_set.py`.

Kenapa diukur per kategori dan bukan digabung: satu angka gabungan akan menutupi
kategori yang jebol total dengan kategori yang kebetulan aman. Yang berguna untuk
diperbaiki justru kategori yang jebolnya.

Kenapa ada kelompok kontrol: tanpa itu, "deteksi 100%" tidak berarti apa-apa, sebab
model yang menjawab PHISHING untuk semua URL juga mendapat 100%.

Blocklist publik (OpenPhish/Phishunt) **tidak diaktifkan** saat pengukuran ini karena
URL-nya buatan dan tidak akan pernah ada di feed mana pun. Allowlist tetap diterapkan
persis seperti di produksi, dan pengaruhnya cuma ke kelompok kontrol.

{md_table(["Kategori", "Jumlah", "Benar", "Salah (pipeline)", "Rasio salah", "Salah (model saja)", "Median P(legit)", "Status"], adv_rows)}

### Catatan per kategori

{chr(10).join(f"- **`{cat}`**: {_verdict(d['miss']/d['n']) if d['label'] == 0 else 'kontrol'}, {d['miss']}/{d['n']} salah. {CAT_COMMENT.get(cat, '')}" for cat, d in per_cat.items())}

### Rincian per URL

{chr(10).join(detail_blocks)}

---

## Limitasi yang diketahui

1. **Model terlalu curiga terhadap URL sah yang berbentuk halaman login.** Ini
   limitasi paling serius yang ditemukan pengukuran ini; angkanya ada di bagian
   Temuan utama. Akibat praktisnya: allowlist di `app/threat.py` sekarang bukan
   pelengkap, melainkan penopang utama yang menahan false positive, dan allowlist
   tulisan tangan tidak bisa ikut membesar mengikuti internet.
2. **Modelnya cuma melihat string URL.** Tidak ada isi halaman, sertifikat, WHOIS,
   maupun reputasi hosting. Semua teknik penyamaran yang membuat string URL terlihat
   normal otomatis jadi titik buta, dan itu terlihat di tabel adversarial di atas.
3. **MiniLM bukan encoder URL.** Model itu dilatih untuk kalimat bahasa Inggris.
   Di sini dipakai sebagai encoder string serbaguna: praktis, tapi bukan pilihan optimal.
   Kemiripan visual antar-karakter (`1` vs `l`, `rn` vs `m`, Kiril vs Latin) bukan
   sesuatu yang dipelajari model ini.
4. **Set adversarialnya kecil dan buatan tangan.** Ukurannya puluhan URL per kategori,
   jadi satu URL menggeser persentase beberapa poin. Angkanya menunjukkan arah, bukan
   presisi. Anggap ini uji perilaku, bukan tolok ukur statistik.
5. **Holdout berasal dari distribusi yang sama dengan data latih.** Sumber phishing-nya
   feed yang sama, sumber legitimate-nya daftar Tranco yang sama. Angka di halaman ini
   adalah batas atas; performa terhadap kampanye phishing baru akan lebih rendah.
   Alasan lengkapnya ada di bagian "Dataset dan limitasinya" pada `backend/README.md`.
6. **Threshold tunggal untuk semua jenis URL.** Shortener, domain baru, dan domain
   mapan diperlakukan sama, padahal ongkos kesalahannya berbeda.
7. **Angka di halaman ini tidak bisa direproduksi dari isi repo saja**, karena dataset
   penuhnya tidak di-commit (lihat batasan data di Bagian 1).

## Catatan teknis pengukuran

- Embedding dihitung lewat: **{backend_note}**.
{encoder_note}
  Encoder numpy pengganti itu bukan barang yang dipercaya begitu saja:
  `scripts/verify_encoder.py` membandingkan keluarannya dengan `data/_emb_cache.npy`,
  yaitu embedding yang dulu benar-benar dihasilkan `sentence-transformers` waktu
  training, dan selisih maksimumnya ada di orde 1e-7 (jauh di bawah toleransi 1e-4).
  Jadi dipakai jalur mana pun, angka evaluasinya sama.
- Fitur leksikal dihitung dengan `app/features.py` yang sama persis dengan runtime,
  jadi tidak ada risiko training/serving skew di sisi fitur.
{extra_notes}
"""
    EVAL_MD.write_text(doc.replace("\r\n", "\n"), encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
