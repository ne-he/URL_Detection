# PhishGuard v2

URL phishing detection, full stack. The React frontend (cyber dark UI, PWA, threat globe, gamification) lives at the repo root; the backend is a ground-up rebuild with honest health checks, strict input validation, configurable thresholds, and a regression test that locks the label orientation so a retrained model can never silently flip "phishing" and "legitimate".

**How it works:** the URL string is embedded with `all-MiniLM-L6-v2` (sentence-transformers), then a small Keras dense network outputs P(legitimate). Trained on ~81k labeled URLs.

## Why v2 exists

v1 worked, but had the classic demo-project problems:

| v1 | v2 |
|---|---|
| `allow_origins=["*"]` together with `allow_credentials=True` (rejected by the browser spec, and unsafe) | Explicit origins from `FRONTEND_ORIGINS` env, credentials off |
| Model load failure only `print`ed; server still said "Ready" | Fail-fast startup; `/health` returns 503 with the actual error |
| Raw string straight into the model | Pydantic validation: scheme check, length limit, host normalization → invalid input gets 422, not a prediction |
| Threshold hardcoded `0.5` | `PHISHING_THRESHOLD` env |
| First request slow (cold encode+predict) | Warmup at startup |
| No tests | 17 tests: schema validation, full API flow (stub model, no TF needed), label-orientation regression |

## Quickstart

```bash
docker compose up --build
# API:       http://localhost:7860/docs
# Frontend:  http://localhost:5173
```

Frontend only (talks to the deployed backend by default):

```bash
npm install
npm run dev          # set VITE_API_BASE in .env.local to point elsewhere
```

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
| `MODEL_PATH` | `models/phishing_detection_deeplearning.h5` | Keras artifact |
| `EMBEDDER_NAME` | `all-MiniLM-L6-v2` | sentence-transformers model |

Frontend env (Vite, set in `.env.local` or Vercel):

| Env | Default | What it does |
|---|---|---|
| `VITE_API_BASE` | old HF Space URL | Backend base URL the UI calls |
| `VITE_FEATURE_*` | on | Feature flags (shader, globe, voice, gamification) |

## Repo layout

```
src/, index.html, package.json   React frontend (Vite), deployed on Vercel
backend/
  app/          config, schemas (validation), predictor (the only file that knows TF), main (routes)
  models/       trained .h5 artifact (712 KB)
  training/     original training notebook, kept for reference
  data/         100-row sample of the training set (full 81k-row CSV stays out of the repo)
  tests/
demo/index.html  zero-dependency test page
docs/ARCHITECTURE.md
```

## Roadmap

- Deploy to Hugging Face Spaces (Docker) and point the v1 Vercel frontend here
- Log predictions + drift monitoring (Evidently), same pattern as my [feature store](https://huggingface.co/spaces/ne-he/feature-store-mvp)
- Retraining script as code (right now the notebook is the pipeline, which is exactly the kind of thing v2 is supposed to kill)
