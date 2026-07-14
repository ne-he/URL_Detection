# PhishGuard v2 — Architecture

```
                       ┌──────────────────────────────────────────┐
 client / demo page ──►│ FastAPI (app/main.py)                    │
                       │  CORS: explicit origins, no credentials  │
                       │                                          │
                       │  POST /predict ─► URLRequest (schemas)   │
                       │                    strip / length check  │
                       │                    scheme whitelist      │
                       │                    host lowercased       │
                       │                        │                 │
                       │                        ▼                 │
                       │              Predictor protocol          │
                       │             ┌──────────────────┐         │
                       │   tests ───►│ StubPredictor    │         │
                       │   prod  ───►│ KerasURLPredictor│         │
                       │             │  MiniLM encode   │         │
                       │             │  Keras .h5       │         │
                       │             │  → P(legitimate) │         │
                       │             └──────────────────┘         │
                       │                        │                 │
                       │      threshold (env) ──┴─► label + resp  │
                       └──────────────────────────────────────────┘
```

## Design decisions

**1. The predictor is a protocol, TensorFlow is an implementation detail.**
`app/main.py` never imports TF. `KerasURLPredictor` imports it lazily inside `load()`.
Consequences: the API test suite runs anywhere in ~2s with a stub, and swapping the
model family later (CatBoost, ONNX) touches one file.

**2. Fail loud, run degraded.**
If the model fails to load at startup, the process stays up but `/health` returns 503
with the stored error and `/` reports `degraded`. Rationale: a crash-looping container
hides the error in restart noise; a healthy-looking server that 503s every predict
(v1 behavior) is worse. This way the orchestrator's healthcheck fails with a readable reason.

**3. Label orientation lives in one line, guarded by a test.**
`prob_legitimate()` returns the sigmoid output as-is; the phishing probability is derived
once in `main._classify`. `test_label_orientation.py` pins two anchor URLs so a retrain
with a flipped LabelEncoder fails CI instead of silently inverting every verdict.

**4. Validation before inference.**
An embedding model will happily embed garbage. Rejecting empty/oversized/non-http(s)
input with 422 keeps junk out of prediction logs and gives the frontend actionable errors.

**5. Two-speed CI.**
`api-tests` (no TF) runs on every push/PR in under a minute. `model-regression`
(installs TF + downloads MiniLM) runs on main and manual dispatch. Keeps iteration fast
without giving up the safety net.

## Known limitations

- The model sees only the URL string, no page content, WHOIS, or cert data. Bare-IP
  and odd-TLD URLs dominate its signal.
- MiniLM was trained on natural language, not URLs; it works here as a generic string
  encoder, which is a pragmatic choice, not an optimal one.
- Training is still a notebook (`backend/training/`). Turning it into a scripted,
  seeded pipeline is on the roadmap.
