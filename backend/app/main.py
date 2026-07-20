"""PhishGuard v2: API deteksi URL phishing.

Perbaikan utama dibanding v1:
- CORS: origin spesifik dari env, bukan "*" + credentials.
- Lifespan startup: model gagal load => /health 503, tidak pernah "diam-diam broken".
- Validasi & normalisasi URL (Pydantic) => input aneh ditolak 422, bukan diprediksi.
- Threshold & konfigurasi dari environment, bukan hardcode.
- Warmup saat startup => request pertama tidak lambat.

`register_api()` dipisah dari `create_app()` supaya entrypoint Space (yang pakai
`gradio.Server`, juga subclass FastAPI) bisa menempelkan endpoint yang sama persis
tanpa menduplikasi logika prediksi.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, get_settings
from .predictor import MODEL_VERSION, KerasURLPredictor, Predictor
from .schemas import BatchRequest, HealthResponse, PredictionResponse, URLRequest
from .threat import Blocklist, DomainAge, in_allowlist

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("phishguard")


def classify(
    url: str,
    p_legit: float,
    threshold: float,
    source: str = "model",
    domain_age_days: int | None = None,
) -> PredictionResponse:
    """Ubah P(legitimate) jadi keputusan label. Satu-satunya tempat aturan ini hidup."""
    p_phish = 1.0 - p_legit
    is_phishing = p_phish > threshold
    return PredictionResponse(
        url=url,
        label="PHISHING" if is_phishing else "LEGITIMATE",
        confidence=round((p_phish if is_phishing else p_legit) * 100, 2),
        legitimate_chance=round(p_legit * 100, 2),
        is_dangerous=is_phishing,
        threshold=threshold,
        model_version=MODEL_VERSION,
        source=source,
        domain_age_days=domain_age_days,
    )


def classify_blocklisted(url: str, threshold: float) -> PredictionResponse:
    """URL yang persis ada di feed phishing publik: vonis PHISHING 100% tanpa nebak."""
    return PredictionResponse(
        url=url,
        label="PHISHING",
        confidence=100.0,
        legitimate_chance=0.0,
        is_dangerous=True,
        threshold=threshold,
        model_version=MODEL_VERSION,
        source="blocklist",
    )


def classify_allowlisted(url: str, threshold: float) -> PredictionResponse:
    """Host tepercaya terkurasi: vonis LEGITIMATE tanpa nebak (cegah false positive)."""
    return PredictionResponse(
        url=url,
        label="LEGITIMATE",
        confidence=100.0,
        legitimate_chance=100.0,
        is_dangerous=False,
        threshold=threshold,
        model_version=MODEL_VERSION,
        source="allowlist",
    )


def register_api(
    app: FastAPI, settings: Settings, predictor: Predictor, add_cors: bool = True
) -> None:
    """Pasang endpoint (/, /health, /predict, /predict/batch) ke `app`.

    `app` boleh FastAPI biasa atau subclass-nya (mis. gradio.Server di Space).
    `add_cors=False` dipakai saat host sudah punya CORS sendiri (gradio.Server
    memantulkan Origin lewat CORS bawaannya); pasang dua-duanya bikin header
    Access-Control-Allow-Origin dobel dan browser menolaknya.
    """
    if add_cors:
        # allow_credentials=False karena API ini tidak pakai cookie/session.
        # Kalau nanti butuh credentials, WAJIB origin eksplisit (spec browser menolak "*").
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.frontend_origins,
            allow_credentials=False,
            allow_methods=["GET", "POST"],
            allow_headers=["*"],
        )

    # Level 3 & 4: sinyal non-ML. Blocklist di-load di thread terpisah supaya
    # startup (dan endpoint pertama) tidak nunggu jaringan; kalau gagal, backend
    # tetap jalan pakai ML saja.
    blocklist = Blocklist(enabled=settings.enable_blocklist)
    domain_age = DomainAge(enabled=settings.enable_domain_age)
    if settings.enable_blocklist:
        import threading

        threading.Thread(target=blocklist.load, daemon=True).start()

    def get_predictor() -> Predictor:
        return predictor

    @app.get("/", include_in_schema=False)
    def home():
        # Jujur soal kondisi: jangan bilang "Ready" kalau model belum siap.
        return {
            "service": "PhishGuard v2",
            "status": "ready" if predictor.ready else "degraded",
            "blocklist_size": blocklist.size,
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
        blocklist.maybe_refresh()
        # Urutan keputusan: (1) blocklist phishing menang duluan (bisa jadi ada 1
        # halaman phishing di domain yang di-compromise), (2) allowlist tepercaya,
        # (3) ML buat sisanya.
        if blocklist.check(request.url):
            return classify_blocklisted(request.url, settings.phishing_threshold)
        if in_allowlist(request.url):
            return classify_allowlisted(request.url, settings.phishing_threshold)
        p_legit = pred.prob_legitimate([request.url])[0]
        # Level 4: perkaya dengan umur domain (best-effort; None kalau nonaktif/gagal).
        age = domain_age.days(request.url)
        return classify(request.url, p_legit, settings.phishing_threshold, domain_age_days=age)

    @app.post("/predict/batch", response_model=list[PredictionResponse])
    def predict_batch(request: BatchRequest, pred: Predictor = Depends(get_predictor)):
        if not pred.ready:
            raise HTTPException(status_code=503, detail=pred.error or "Model belum siap")
        blocklist.maybe_refresh()
        # Validasi per-URL lewat schema yang sama dengan endpoint tunggal.
        validated = [URLRequest(url=u).url for u in request.urls]
        # Hanya URL yang lolos blocklist & allowlist yang perlu di-ML (hemat komputasi).
        blocked = {u: bool(blocklist.check(u)) for u in validated}
        allowed = {u: (not blocked[u] and in_allowlist(u)) for u in validated}
        to_score = [u for u in validated if not blocked[u] and not allowed[u]]
        scores = dict(zip(to_score, pred.prob_legitimate(to_score))) if to_score else {}
        out: list[PredictionResponse] = []
        for u in validated:
            if blocked[u]:
                out.append(classify_blocklisted(u, settings.phishing_threshold))
            elif allowed[u]:
                out.append(classify_allowlisted(u, settings.phishing_threshold))
            else:
                out.append(classify(u, scores[u], settings.phishing_threshold))
        return out


def create_app(settings: Settings | None = None, predictor: Predictor | None = None) -> FastAPI:
    """App factory. `predictor` bisa di-inject (dipakai test dengan stub)."""
    settings = settings or get_settings()
    injected = predictor is not None
    predictor = predictor or KerasURLPredictor(
        settings.model_path, settings.embedder_name, settings.embedder_device
    )

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        if not injected:
            try:
                predictor.load()  # type: ignore[attr-defined]
            except Exception:
                # JANGAN crash proses: biarkan /health melaporkan 503 dengan alasan jelas,
                # supaya operator melihat servisnya sakit, bukan restart-loop tanpa log.
                logger.error("Startup selesai TANPA model, /predict akan menolak request.")
        yield

    app = FastAPI(
        title="PhishGuard v2",
        version="2.0.0",
        description="Deteksi URL phishing: MiniLM embedding + dense classifier (numpy).",
        lifespan=lifespan,
    )
    register_api(app, settings, predictor)
    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=7860)
