"""PhishGuard v2 — API deteksi URL phishing.

Perbaikan utama dibanding v1:
- CORS: origin spesifik dari env, bukan "*" + credentials.
- Lifespan startup: model gagal load => /health 503, tidak pernah "diam-diam broken".
- Validasi & normalisasi URL (Pydantic) => input aneh ditolak 422, bukan diprediksi.
- Threshold & konfigurasi dari environment, bukan hardcode.
- Warmup saat startup => request pertama tidak lambat.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, get_settings
from .predictor import MODEL_VERSION, KerasURLPredictor, Predictor
from .schemas import BatchRequest, HealthResponse, PredictionResponse, URLRequest

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("phishguard")


def create_app(settings: Settings | None = None, predictor: Predictor | None = None) -> FastAPI:
    """App factory. `predictor` bisa di-inject (dipakai test dengan stub)."""
    settings = settings or get_settings()
    injected = predictor is not None
    predictor = predictor or KerasURLPredictor(settings.model_path, settings.embedder_name)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        if not injected:
            try:
                predictor.load()  # type: ignore[attr-defined]
            except Exception:
                # JANGAN crash proses — biarkan /health melaporkan 503 dengan alasan jelas,
                # supaya operator melihat servisnya sakit, bukan restart-loop tanpa log.
                logger.error("Startup selesai TANPA model — /predict akan menolak request.")
        yield

    app = FastAPI(
        title="PhishGuard v2",
        version="2.0.0",
        description="Deteksi URL phishing — MiniLM embedding + Keras classifier.",
        lifespan=lifespan,
    )

    # allow_credentials=False karena API ini tidak pakai cookie/session.
    # Kalau nanti butuh credentials, WAJIB origin eksplisit (spec browser menolak "*").
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.frontend_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    def get_predictor() -> Predictor:
        return predictor

    def _classify(url: str, p_legit: float) -> PredictionResponse:
        p_phish = 1.0 - p_legit
        is_phishing = p_phish > settings.phishing_threshold
        return PredictionResponse(
            url=url,
            label="PHISHING" if is_phishing else "LEGITIMATE",
            confidence=round((p_phish if is_phishing else p_legit) * 100, 2),
            legitimate_chance=round(p_legit * 100, 2),
            is_dangerous=is_phishing,
            threshold=settings.phishing_threshold,
            model_version=MODEL_VERSION,
        )

    @app.get("/", include_in_schema=False)
    def home():
        # Jujur soal kondisi: jangan bilang "Ready" kalau model belum siap.
        return {
            "service": "PhishGuard v2",
            "status": "ready" if predictor.ready else "degraded",
            "docs": "/docs",
            "health": "/health",
        }

    @app.get("/health", response_model=HealthResponse)
    def health(pred: Predictor = Depends(get_predictor)):
        if not pred.ready:
            raise HTTPException(status_code=503, detail=pred.error or "Model belum siap")
        return HealthResponse(status="ok", model_ready=True)

    @app.post("/predict", response_model=PredictionResponse)
    def predict(request: URLRequest, pred: Predictor = Depends(get_predictor)):
        if not pred.ready:
            raise HTTPException(status_code=503, detail=pred.error or "Model belum siap")
        p_legit = pred.prob_legitimate([request.url])[0]
        return _classify(request.url, p_legit)

    @app.post("/predict/batch", response_model=list[PredictionResponse])
    def predict_batch(request: BatchRequest, pred: Predictor = Depends(get_predictor)):
        if not pred.ready:
            raise HTTPException(status_code=503, detail=pred.error or "Model belum siap")
        # Validasi per-URL lewat schema yang sama dengan endpoint tunggal.
        validated = [URLRequest(url=u).url for u in request.urls]
        probs = pred.prob_legitimate(validated)
        return [_classify(u, p) for u, p in zip(validated, probs)]

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=7860)
