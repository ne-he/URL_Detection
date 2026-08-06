---
title: PhishGuard API
emoji: 🛡️
colorFrom: green
colorTo: gray
sdk: gradio
sdk_version: 6.20.0
app_file: app.py
pinned: false
---

# PhishGuard API (v2.2)

FastAPI backend for URL phishing detection with a layered decision pipeline:

1. **Blocklist**: exact URL/host match against live public phishing feeds
   (OpenPhish, Phishunt), refreshed hourly. A hit is `PHISHING` with no guessing.
2. **Allowlist**: exact-host match against curated trusted domains (major
   Indonesian institutions `.ac.id`/`.go.id`/`.co.id` + global brands). Prevents
   false positives on obviously-legit sites; subdomain-spoof safe.
3. **Model**: the URL string is embedded with `all-MiniLM-L6-v2`
   (sentence-transformers) and concatenated with 20 handcrafted lexical features
   (brand-mismatch, risky TLD, IP literal, entropy, digit ratio, ...). A small
   dense net (numpy forward pass, no TensorFlow at runtime) outputs P(legitimate).

Trained on a refreshed dataset: Tranco popular domains + curated Indonesian
domains for the legitimate class, fresh OpenPhish/Phishunt/Phishing.Database
feeds for the phishing class. On a strict holdout of 1,000 URLs never seen in
training: accuracy 95.70%, phishing recall 95.80%, phishing precision 95.61%,
ROC-AUC 0.983. Full numbers, an adversarial breakdown, and the failure modes
are in [`docs/EVAL.md`](../docs/EVAL.md). Read that before trusting the
headline number, because the model is measurably over-eager to call legitimate
login pages phishing.

Runs as a Gradio Space on ZeroGPU hardware (the GPU itself is unused; a dummy
`@spaces.GPU` function satisfies the runtime). `app.py` serves the full FastAPI
app on port 7860.

## Endpoints

```
GET  /health          -> 200 {"status":"ok"} | 503 + reason
POST /predict         {"url": "https://..."}
POST /predict/batch   {"urls": [... up to 50]}
GET  /docs            Swagger UI
```

Response adds `source` (`model` | `blocklist` | `allowlist`) and optional
`domain_age_days`. Older fields (`label`, `confidence`, `legitimate_chance`,
`is_dangerous`) are unchanged, so existing frontends keep working.

## Dataset and its limitations

### Where the training data comes from

The current model (`v2.2-minilm-lexical`) is trained on `backend/data/data_v2.csv`,
assembled by `backend/scripts/build_dataset.py` on **20 July 2026**. That script is
the pipeline, so the composition below is checkable, not remembered:

| Class | Source | Roughly how many |
|---|---|---|
| legitimate | Curated legitimate rows carried over from the v1 dataset (`data.csv`) | up to 30,000 |
| legitimate | Tranco top-1m domains, expanded into `https://www.`, `https://`, `http://` variants | up to 34,000 |
| legitimate | 75 hand-picked Indonesian domains (`.ac.id`, `.go.id`, `.co.id`, banks, marketplaces, media) expanded into path variants and **upweighted 3x** | a few thousand |
| phishing | Phishing rows carried over from the v1 dataset (`data.csv`) | up to 35,000 |
| phishing | Live feeds pulled that day: Phishing.Database ACTIVE, OpenPhish, Phishunt | up to 34,000 |

After de-duplication (on conflict, phishing wins, because the safer error is to
distrust a URL): **132,742 rows, 68,944 phishing (`ClassLabel=0`) and 63,798
legitimate (`ClassLabel=1`)**, so roughly 52/48.

The model does not see all of that. `scripts/train_model.py` takes a balanced
subsample of **10,000 URLs per class (20,000 total, seed 42)** because computing
MiniLM embeddings on CPU for 132k URLs is not worth the hours. That subsample is
then split 85/15 for training and testing.

### What is in the repo, and what is not

`data.csv` and `data_v2.csv` are **not committed** (see `.gitignore`) because they are tens
of megabytes. What ships is `backend/data/sample_100.csv`, and two honest caveats
about it: it is only 100 rows, and it is the first 100 rows of the **v1** dataset
(18 precomputed feature columns), not of the `data_v2.csv` that trained the current
model. It is there to document the label convention, not to evaluate anything.
To reproduce the numbers you have to rebuild the dataset with
`scripts/build_dataset.py` first, and the result will not be byte-identical because
the phishing feeds have moved on since.

### Open question: where the v1 dataset originally came from

`data.csv` (80,974 rows: 50,550 phishing, 30,424 legitimate) was inherited from the
original group coursework, and **nothing in this repo records its provenance**. The
training notebook (`backend/training/training.ipynb`) just calls
`pd.read_csv('../data/data.csv')`, and its saved output paths point at a teammate's
machine. So the collection date, licence, and original source of roughly half the
training data are unknown. That is a real gap, not a formality: it is documented here
rather than guessed at, and it needs an answer from the original dataset owner before
this model is described as production-ready anywhere.

### Why performance on today's phishing URLs will be lower than the table above

1. **The phishing class is a one-day snapshot.** About half of it came from OpenPhish,
   Phishunt, and Phishing.Database as they looked on 20 July 2026. Phishing URLs are
   short-lived, and campaigns rotate hosting, TLDs, and URL shapes continuously. A model
   fitted to that snapshot is fitted to campaigns that are largely already dead.
2. **The holdout is drawn from that same snapshot.** The 95.70% is measured on URLs the
   model never saw, but they come from the same feeds on the same day. It answers "can it
   recognise URLs from campaigns it was trained on", not "can it recognise a campaign that
   started this morning". A time-based split would be the honest test, and it is not
   implemented yet.
3. **The legitimate class is shaped unlike real browsing.** It is dominated by bare Tranco
   domains such as `https://www.example.com`, with no path, no query string, no tracking
   parameters. Real legitimate traffic is full of long paths and login flows. The
   measured consequence is in `docs/EVAL.md`: the model on its own labels genuine login
   pages including `accounts.google.com` and `www.paypal.com/signin` as phishing, and the
   hand-written allowlist in `app/threat.py` is what actually prevents most of those false
   positives today.
4. **The Indonesian coverage is narrow and memorised.** 75 domains were upweighted 3x to
   kill false positives such as `binus.ac.id`. It worked for those exact hosts. Nothing
   here measures how the model treats the other several hundred thousand Indonesian sites.

### What would have to happen before this is used for real

- **Scheduled retraining**, weekly, rebuilding from live feeds. `build_dataset.py` and
  `train_model.py` are already scripts rather than notebooks, so this is a cron job and a
  storage bucket, not a rewrite.
- **Time-based evaluation instead of random split.** Train on everything before date X,
  evaluate only on URLs first seen after date X. This is the single change that would turn
  the accuracy figure from flattering into meaningful.
- **Fix the legitimate class first.** Add legitimate URLs with deep paths, query strings,
  and real login flows. On the evidence in `docs/EVAL.md`, this matters more than any
  further model tuning.
- **Log predictions and monitor drift**: score distribution over time, the share of
  verdicts coming from the blocklist rather than the model (a rising share means the model
  is going stale), and the false-positive reports from users.
- **Version datasets alongside models**, so a regression can be traced to the data that
  caused it. Right now the `.npz` has no dataset fingerprint in it.

## Config (Settings -> Variables and secrets)

| Variable | Example | What it does |
|---|---|---|
| `FRONTEND_ORIGINS` | `https://hci-update.vercel.app` | Comma-separated CORS allowlist (no trailing slash) |
| `PHISHING_THRESHOLD` | `0.5` | P(phishing) above this means PHISHING |

Frontend repo: https://github.com/ne-he/URL_Detection
