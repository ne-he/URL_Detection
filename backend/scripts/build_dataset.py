"""Rakit dataset training baru buat PhishGuard v2.2.

Gabungan:
  LEGIT (ClassLabel=1):
    - Legit lama dari data.csv (sudah terkurasi)
    - Tranco top domains (situs populer dunia) -> jadi URL realistis
    - Domain Indonesia terkurasi (.ac.id/.co.id/.go.id/bank/ecommerce) -> nutup
      false-positive kayak binus.ac.id
  PHISHING (ClassLabel=0):
    - Phishing lama dari data.csv
    - Feed segar: Phishing.Database ACTIVE + OpenPhish + Phishunt -> nutup
      false-negative pola modern kayak netflixama111.com

Output cuma 2 kolom yang dipakai model: URL, ClassLabel (0/1).
Model embed STRING URL mentah pakai MiniLM, jadi fitur numerik lama diabaikan
di sini (fitur handcrafted dihitung terpisah di train_model.py).
"""
from __future__ import annotations

import csv
import random
import sys
from pathlib import Path
from urllib.parse import urlparse

random.seed(42)

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SCRATCH = Path(sys.argv[1]) if len(sys.argv) > 1 else DATA

# Berapa banyak per sumber (biar seimbang & embedding ga kelamaan di CPU)
N_OLD_PHISH = 35000
N_OLD_LEGIT = 30000
N_TRANCO = 34000
N_FRESH_PHISH = 34000
IND_REPEAT_PATHS = True  # perbanyak variasi URL domain Indonesia


def norm(u: str) -> str:
    u = u.strip().strip('"').strip()
    if not u:
        return ""
    if not u.startswith(("http://", "https://")):
        u = "http://" + u
    return u


def host_ok(u: str) -> bool:
    try:
        h = urlparse(u).hostname or ""
    except ValueError:
        return False
    return "." in h and len(h) < 200


# --- Domain Indonesia terkurasi (legit) ---------------------------------------
IND_DOMAINS = [
    # Universitas
    "binus.ac.id", "ui.ac.id", "itb.ac.id", "ugm.ac.id", "its.ac.id",
    "unpad.ac.id", "undip.ac.id", "ipb.ac.id", "gunadarma.ac.id", "telkomuniversity.ac.id",
    "uajy.ac.id", "atmajaya.ac.id", "unair.ac.id", "brawijaya.ac.id", "unhas.ac.id",
    "usu.ac.id", "uns.ac.id", "uii.ac.id", "petra.ac.id", "president.ac.id",
    # Pemerintah
    "kemdikbud.go.id", "kemenkeu.go.id", "pajak.go.id", "bps.go.id", "kemkes.go.id",
    "kominfo.go.id", "bi.go.id", "ojk.go.id", "imigrasi.go.id", "polri.go.id",
    "setkab.go.id", "kemlu.go.id", "bkn.go.id", "lpdp.kemenkeu.go.id", "jakarta.go.id",
    # Bank
    "bca.co.id", "bri.co.id", "bni.co.id", "mandiri.co.id", "cimbniaga.co.id",
    "danamon.co.id", "permatabank.com", "btn.co.id", "bankmega.com", "ocbc.id",
    # E-commerce / layanan
    "tokopedia.com", "shopee.co.id", "bukalapak.com", "blibli.com", "lazada.co.id",
    "gojek.com", "grab.com", "traveloka.com", "tiket.com", "ovo.id",
    "dana.id", "bhinneka.com", "jd.id", "ralali.com", "sociolla.com",
    # Media / lain
    "detik.com", "kompas.com", "cnnindonesia.com", "tribunnews.com", "liputan6.com",
    "kumparan.com", "tempo.co", "kaskus.co.id", "idx.co.id", "pln.co.id",
    "telkomsel.com", "indihome.co.id", "garuda-indonesia.com", "kai.id", "pertamina.com",
]
IND_PATHS = ["", "/", "/login", "/about", "/produk", "/berita", "/kontak",
             "/akademik/mahasiswa", "/informasi/pengumuman", "/id/home"]


def build_indonesia() -> list[str]:
    urls = set()
    for d in IND_DOMAINS:
        urls.add(f"https://{d}")
        urls.add(f"https://www.{d}")
        if IND_REPEAT_PATHS:
            for p in random.sample(IND_PATHS, 4):
                urls.add(f"https://www.{d}{p}")
    return list(urls)


def build_tranco(path: Path, n: int) -> list[str]:
    urls = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            parts = line.split(",")
            if len(parts) < 2:
                continue
            d = parts[1].strip()
            if "." not in d:
                continue
            # variasi biar mirip URL asli, bukan cuma domain telanjang
            r = random.random()
            if r < 0.5:
                urls.append(f"https://www.{d}")
            elif r < 0.85:
                urls.append(f"https://{d}")
            else:
                urls.append(f"http://{d}")
            if len(urls) >= n:
                break
    return urls


def read_feed(path: Path) -> list[str]:
    if not path.exists():
        return []
    out = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            u = norm(line)
            if u and host_ok(u):
                out.append(u)
    return out


def read_old(path: Path) -> tuple[list[str], list[str]]:
    phish, legit = [], []
    with open(path, encoding="utf-8", errors="replace") as f:
        r = csv.DictReader(f)
        for row in r:
            u = norm(row.get("URL", ""))
            lbl = row.get("ClassLabel", "").strip()
            if not u or not host_ok(u):
                continue
            if lbl == "1.0":
                legit.append(u)
            elif lbl == "0.0":
                phish.append(u)
    return phish, legit


def main() -> None:
    old_phish, old_legit = read_old(DATA / "data.csv")
    random.shuffle(old_phish)
    random.shuffle(old_legit)

    fresh = []
    for name in ("phish_db_links.txt", "phish_openphish.txt", "phish_phishunt.txt"):
        fresh += read_feed(SCRATCH / name)
    random.shuffle(fresh)

    tranco = build_tranco(SCRATCH / "top-1m.csv", N_TRANCO)
    indo = build_indonesia()

    legit = old_legit[:N_OLD_LEGIT] + tranco + indo * 3  # upweight Indonesia
    phish = old_phish[:N_OLD_PHISH] + fresh[:N_FRESH_PHISH]

    # dedupe sambil jaga label; kalau bentrok, phishing menang (lebih aman)
    seen: dict[str, int] = {}
    for u in legit:
        seen.setdefault(u, 1)
    for u in phish:
        seen[u] = 0

    rows = list(seen.items())
    random.shuffle(rows)

    out = DATA / "data_v2.csv"
    with open(out, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["URL", "ClassLabel"])
        for u, lbl in rows:
            w.writerow([u, lbl])

    n_phish = sum(1 for _, l in rows if l == 0)
    n_legit = sum(1 for _, l in rows if l == 1)
    print(f"Sumber: old_phish={len(old_phish)} old_legit={len(old_legit)} "
          f"fresh={len(fresh)} tranco={len(tranco)} indo={len(indo)}")
    print(f"Ditulis {out}: total={len(rows)} phishing={n_phish} legit={n_legit}")


if __name__ == "__main__":
    main()
