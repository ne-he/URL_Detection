"""Entrypoint Hugging Face Gradio Space (hardware ZeroGPU).

Akun free HF sekarang cuma boleh ZeroGPU untuk Gradio Space (Docker & CPU basic
di-lock PRO). ZeroGPU hanya "menyala" kalau app dijalankan lewat mekanisme Gradio
(`app.launch()`), BUKAN uvicorn manual, dan menolak start tanpa fungsi @spaces.GPU.

Solusinya `gradio.Server`: subclass FastAPI resmi dari Gradio yang boleh menambah
route sendiri (jadi kontrak /predict v1 tetap ada untuk frontend) tapi tetap
dilaunch lewat Gradio (jadi ZeroGPU happy). Endpoint API-nya identik dengan versi
lokal karena dipasang oleh register_api() yang sama.

    GET  /            status JSON
    POST /predict     kontrak v1-compatible; frontend Vercel manggil ini
    POST /predict/batch
    GET  /health      503 kalau model belum siap
    GET  /docs        Swagger

Catatan ZeroGPU (mahal dipelajari):
- Embedding dipaksa CPU (config.EMBEDDER_DEVICE): GPU cuma boleh diakses DI DALAM
  fungsi @spaces.GPU, jadi inference di route biasa harus CPU.
- `spaces` wajib ada di requirements.txt; tanpa itu decorator @spaces.GPU tidak
  ter-register dan Space mati "No @spaces.GPU function detected".
"""
from __future__ import annotations

import os

# gradio.Server tidak butuh SSR (tidak ada UI Blocks); matikan sebelum impor gradio
# supaya tidak ada server Node.js yang memperumit lifecycle di ZeroGPU.
os.environ["GRADIO_SSR_MODE"] = "False"

import spaces
from gradio import Server

from app.config import get_settings
from app.main import classify, register_api
from app.predictor import KerasURLPredictor
from app.schemas import URLRequest

settings = get_settings()
predictor = KerasURLPredictor(
    settings.model_path, settings.embedder_name, settings.embedder_device
)
# gradio.Server tidak memakai lifespan FastAPI kita, jadi model di-load eager di sini.
# Kalau gagal, biarkan lanjut: /health akan melaporkan 503 dengan alasan jelas.
try:
    predictor.load()
except Exception:  # noqa: BLE001 - alasan sudah tersimpan di predictor.error
    pass

app = Server()
# add_cors=False: gradio.Server sudah memantulkan Origin lewat CORS bawaannya
# (di host non-localhost seperti *.hf.space). Menambah CORS kedua bikin header dobel.
register_api(app, settings, predictor, add_cors=False)


@app.api(name="check")
@spaces.GPU
def check(url: str) -> dict:
    """Endpoint API Gradio ber-@spaces.GPU: WAJIB ada supaya ZeroGPU mau start.

    Backend ini CPU-only, jadi fungsi ini bukan jalur utama (frontend pakai
    POST /predict biasa). Ada supaya runtime mendeteksi minimal satu fungsi GPU.
    """
    req = URLRequest(url=url)
    p_legit = predictor.prob_legitimate([req.url])[0]
    return classify(req.url, p_legit, settings.phishing_threshold).model_dump()


if __name__ == "__main__":
    app.launch(server_name="0.0.0.0", server_port=7860)
