# PhishGuard v2

URL phishing detection, full stack. The React frontend (cyber dark UI, PWA, threat globe, gamification) lives at the repo root; the backend is a ground-up rebuild with honest health checks, strict input validation, configurable thresholds, and a regression test that locks the label orientation so a retrained model can never silently flip "phishing" and "legitimate".

**How it works:** the URL string is embedded with `all-MiniLM-L6-v2` (sentence-transformers) and concatenated with 20 handcrafted lexical features, then a small dense network (numpy forward pass, no TensorFlow at runtime) outputs P(legitimate). Trained on a balanced 20k subsample of a 132k-URL dataset; see [`backend/README.md`](backend/README.md) for where that data came from and why it ages badly.

**Credits:** PhishGuard started as a 7-person university group project (Nehemiah Wilhelmus Junaidi, Adhika Gunawan, Alvin Wijaya, Felix Yung, Daniel Sebastian Winata, Andrew Yung, Tokesi Lukynawa), where my role was frontend development; the v2 rebuild in this repo (backend, hardening, evaluation) is my own work.

## Why v2 exists

v1 worked, but had the classic demo-project problems:

| v1 | v2 |
|---|---|
| `allow_origins=["*"]` together with `allow_credentials=True` (rejected by the browser spec, and unsafe) | Explicit origins from `FRONTEND_ORIGINS` env, credentials off |
| Model load failure only `print`ed; server still said "Ready" | Fail-fast startup; `/health` returns 503 with the actual error |
| Raw string straight into the model | Pydantic validation: scheme check, length limit, host normalization → invalid input gets 422, not a prediction |
| Threshold hardcoded `0.5` | `PHISHING_THRESHOLD` env |
| First request slow (cold encode+predict) | Warmup at startup |
| No tests | 33 tests: schema validation, full API flow (stub model, no TF needed), lexical features, threat layers, label-orientation regression |
| No published metrics | Measured accuracy, precision, recall, F1, and a per-technique adversarial breakdown in [`docs/EVAL.md`](docs/EVAL.md) |

## How well does it actually work

Measured by `backend/scripts/eval_report.py`, not estimated. Full report with the
adversarial breakdown and the failure modes: [`docs/EVAL.md`](docs/EVAL.md).

Strict holdout of 1,000 URLs from `data_v2.csv` that never entered training
(500 phishing, 500 legitimate), threshold 0.5:

| Metric (positive class = phishing) | Value |
|---|---|
| Accuracy | 95.70% |
| Precision | 95.61% |
| **Recall** | **95.80%** |
| F1 | 95.70% |
| ROC-AUC | 0.983 |

Recall is bolded on purpose: for a phishing detector, missing a malicious site costs
far more than flagging a safe one, so recall matters more than accuracy. Confusion
matrix on that holdout: 479 phishing caught, **21 phishing missed**, 22 legitimate
sites wrongly flagged.

Against a hand-built adversarial set (evasion rate per technique, lower is better):

| Technique | n | Evaded detection |
|---|---|---|
| typosquatting (`paypa1.com`) | 12 | 0% |
| homograph (Cyrillic lookalikes) | 8 | 12% |
| punycode (`xn--`) | 8 | 0% |
| URL shorteners | 8 | 0% |
| misleading subdomain (`paypal.com.attacker.net`) | 8 | 0% |
| userinfo obfuscation (`@`) | 6 | 0% |

**Read the honest caveat before quoting those zeroes.** A control group of 15
*legitimate* login URLs is where this model actually fails: on its own it misclassifies
**12 of 15** as phishing, including `accounts.google.com`, `www.paypal.com/signin`, and
`github.com/login`. The model is biased toward answering PHISHING for anything with a
path, so the adversarial set is largely caught by that bias rather than by genuine
recognition of the disguise, and the hand-written allowlist is what prevents most false
positives in production. Details and the likely cause (training data where legitimate
URLs are mostly bare domains) are in [`docs/EVAL.md`](docs/EVAL.md) and
[`backend/README.md`](backend/README.md).

## Quickstart

```bash
docker compose up --build
# API:       http://localhost:7860/docs
# Frontend:  http://localhost:5173
```

Frontend only:

```bash
npm install
npm run dev          # set VITE_API_BASE in .env.local
```

Without `VITE_API_BASE`, the UI falls back to a Hugging Face Space owned by a v1
collaborator, running the **v1** model, not this repo's backend. That fallback exists so a
fresh clone builds and runs, and the app logs a console warning whenever it is used. Set
`VITE_API_BASE` before any public deploy.

Native (needs Python 3.12, ~1.5 GB of deps for TF + torch):

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --port 7860
```

## API

```
GET  /health          -> 200 {"status":"ok"} | 503 + reason
POST /predict         {"url": "https://..."}
POST /predict/batch   {"urls": [... up to 50]}
```

`POST /predict` response (contract is v1-compatible — the old frontend can switch over unchanged):

```json
{
  "url": "https://www.google.com",
  "label": "LEGITIMATE",
  "confidence": 99.12,
  "legitimate_chance": 99.12,
  "is_dangerous": false,
  "threshold": 0.5,
  "model_version": "v2.0-minilm-keras"
}
```

## Label convention (important)

In the training data (`backend/data/sample_100.csv`), `ClassLabel` is **1.0 = legitimate, 0.0 = phishing**, and the model's sigmoid output is P(legitimate). This convention is enforced in exactly one place (`app/predictor.py`) and locked by `tests/test_label_orientation.py`: two anchor URLs (google.com and a bare-IP `.exe` link) must classify correctly, otherwise the test fails with a hint to check the LabelEncoder direction. If a retrain ever flips the encoding, CI catches it before deploy.

## Tests

```bash
cd backend
pip install -r requirements-dev.txt        # light, no TensorFlow
PYTHONPATH=. pytest tests -q               # schema + API tests via stub predictor
```

The label-orientation test needs the real model and skips itself when TF isn't installed. It runs in the `model-regression` CI job (push to main / manual dispatch), so PRs stay fast.

## Config

| Env | Default | What it does |
|---|---|---|
| `FRONTEND_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Comma-separated CORS allowlist |
| `PHISHING_THRESHOLD` | `0.5` | P(phishing) above this ⇒ PHISHING |
| `MODEL_PATH` | `models/phishing_detection_weights.npz` | Dense-layer weights, loaded by the numpy predictor (the old `.h5` Keras artifact is no longer the default) |
| `EMBEDDER_NAME` | `all-MiniLM-L6-v2` | sentence-transformers model |

Frontend env (Vite, set in `.env.local` or Vercel):

| Env | Default | What it does |
|---|---|---|
| `VITE_API_BASE` | v1 collaborator's HF Space (see warning above) | Backend base URL the UI calls |
| `VITE_FEATURE_*` | on | Feature flags (shader, globe, voice, gamification) |

## Repo layout

```
src/, index.html, package.json   React frontend (Vite), deployed on Vercel
backend/
  app/          config, schemas (validation), predictor (the only file that knows TF), main (routes)
  models/       trained .h5 artifact (712 KB) + converted .npz weights used at runtime
  training/     original training notebook, kept for reference
  scripts/      build_dataset, train_model, eval_report (writes docs/EVAL.md), evaluate
  data/         100-row sample only; the full 132k-row CSVs stay out of the repo
  tests/
demo/index.html  zero-dependency test page
docs/ARCHITECTURE.md      design decisions
docs/EVAL.md              measured results, adversarial set, known failure modes
docs/confusion_matrix.png
```

## Roadmap

- Deploy to Hugging Face Spaces (Docker) and point the v1 Vercel frontend here
- Log predictions + drift monitoring (Evidently), same pattern as my [feature store](https://huggingface.co/spaces/ne-he/feature-store-mvp)
- Retraining script as code (right now the notebook is the pipeline, which is exactly the kind of thing v2 is supposed to kill)
