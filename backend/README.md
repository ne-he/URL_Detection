---
title: PhishGuard API
emoji: 🛡️
colorFrom: green
colorTo: gray
sdk: gradio
sdk_version: 4.44.1
app_file: app.py
pinned: false
---

# PhishGuard API (v2)

FastAPI backend for URL phishing detection. A URL string is embedded with
`all-MiniLM-L6-v2` (sentence-transformers), then a small Keras dense network
outputs P(legitimate).

Runs as a Gradio Space (free CPU tier). `app.py` serves the full FastAPI app
on port 7860 with an interactive Gradio demo mounted at the landing page.

## Endpoints

```
GET  /health          -> 200 {"status":"ok"} | 503 + reason
POST /predict         {"url": "https://..."}
POST /predict/batch   {"urls": [... up to 50]}
GET  /docs            Swagger UI
```

## Config (Settings -> Variables and secrets)

| Variable | Example | What it does |
|---|---|---|
| `FRONTEND_ORIGINS` | `https://hci-update.vercel.app` | Comma-separated CORS allowlist (no trailing slash) |
| `PHISHING_THRESHOLD` | `0.5` | P(phishing) above this means PHISHING |

Frontend repo: https://github.com/ne-he/URL_Detection
