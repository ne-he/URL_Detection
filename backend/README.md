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

1. **Blocklist** — exact URL/host match against live public phishing feeds
   (OpenPhish, Phishunt), refreshed hourly. A hit is `PHISHING` with no guessing.
2. **Allowlist** — exact-host match against curated trusted domains (major
   Indonesian institutions `.ac.id`/`.go.id`/`.co.id` + global brands). Prevents
   false positives on obviously-legit sites; subdomain-spoof safe.
3. **Model** — the URL string is embedded with `all-MiniLM-L6-v2`
   (sentence-transformers) and concatenated with 20 handcrafted lexical features
   (brand-mismatch, risky TLD, IP literal, entropy, digit ratio, ...). A small
   dense net (numpy forward pass, no TensorFlow at runtime) outputs P(legitimate).

Trained on a refreshed dataset: Tranco popular domains + curated Indonesian
domains for the legitimate class, fresh OpenPhish/Phishunt/Phishing.Database
feeds for the phishing class. Held-out accuracy ~95.9%, ROC-AUC ~0.985.

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

## Config (Settings -> Variables and secrets)

| Variable | Example | What it does |
|---|---|---|
| `FRONTEND_ORIGINS` | `https://hci-update.vercel.app` | Comma-separated CORS allowlist (no trailing slash) |
| `PHISHING_THRESHOLD` | `0.5` | P(phishing) above this means PHISHING |

Frontend repo: https://github.com/ne-he/URL_Detection
