"""Entrypoint Hugging Face Gradio Space (hardware ZeroGPU).

Akun free HF sekarang cuma boleh ZeroGPU untuk Gradio Space (Docker & CPU basic
di-lock PRO), jadi backend FastAPI v2 dibungkus di sini. Yang dijalankan tetap
API yang sama persis:

    GET  /            UI Gradio interaktif (landing Space)
    POST /predict     kontrak v1-compatible; frontend Vercel manggil ini
    POST /predict/batch
    GET  /health      503 kalau model belum siap
    GET  /docs        Swagger

Catatan ZeroGPU (mahal dipelajari, jangan diubah tanpa alasan):
- Runtime NOLAK start kalau tidak ada fungsi ber-@spaces.GPU, dan deteksinya
  STATIS di top-level app_file. Fungsi nested di dalam `if` TIDAK terdeteksi
  (itu bikin error "No @spaces.GPU function detected"). Makanya _zerogpu_probe
  ditaruh di top-level. Backend ini CPU-only, fungsi itu murni formalitas.
- Embedding dipaksa CPU (lihat config.EMBEDDER_DEVICE): GPU cuma boleh diakses
  DI DALAM fungsi @spaces.GPU, jadi inference di route biasa harus CPU.
- Gradio 5 di Spaces menyalakan SSR (butuh Node.js) yang memperumit lifecycle;
  kita matikan via GRADIO_SSR_MODE sebelum impor gradio.
"""
from __future__ import annotations

import os

# Matikan SSR SEBELUM impor gradio (kita cuma butuh demo sederhana + REST API).
os.environ.setdefault("GRADIO_SSR_MODE", "False")

# `spaces` selalu ada di hardware ZeroGPU. Fallback no-op hanya supaya modul ini
# tetap bisa diimpor di mesin lokal tanpa paket itu (app.py cuma dipakai di Space;
# dev lokal jalan lewat `uvicorn app.main:app`).
try:
    import spaces
except ImportError:  # pragma: no cover - hanya di luar Space

    class _NoSpaces:
        @staticmethod
        def GPU(fn=None, **_):
            return fn if callable(fn) else (lambda f: f)

    spaces = _NoSpaces()

import gradio as gr
import requests

from app.main import app as fastapi_app


@spaces.GPU
def _zerogpu_probe():
    """Formalitas ZeroGPU: harus ada minimal satu @spaces.GPU di top-level.

    Tidak pernah dipanggil; prediksi asli jalan CPU lewat /predict.
    """
    return None


# UI memanggil endpoint /predict di proses yang sama (loopback) supaya validasi
# & konvensi label persis sama dengan yang dipakai frontend.
_LOCAL_API = "http://127.0.0.1:7860"


def _inspect(url: str) -> dict:
    url = (url or "").strip()
    if not url:
        return {"error": "Masukkan URL dulu."}
    try:
        resp = requests.post(f"{_LOCAL_API}/predict", json={"url": url}, timeout=60)
    except requests.RequestException as exc:
        return {"error": f"Request gagal: {exc}"}
    if resp.status_code != 200:
        try:
            detail = resp.json().get("detail", resp.text)
        except ValueError:
            detail = resp.text
        return {"error": detail, "status_code": resp.status_code}
    return resp.json()


with gr.Blocks(title="PhishGuard v2", theme=gr.themes.Soft()) as demo:
    gr.Markdown(
        "# 🛡️ PhishGuard v2\n"
        "Deteksi URL phishing: embedding **MiniLM** + dense classifier. "
        "REST API lengkap ada di [`/docs`](/docs)."
    )
    url_in = gr.Textbox(label="URL", placeholder="https://contoh.com", lines=1)
    check = gr.Button("Periksa", variant="primary")
    result = gr.JSON(label="Hasil")
    check.click(_inspect, inputs=url_in, outputs=result)
    url_in.submit(_inspect, inputs=url_in, outputs=result)
    gr.Examples(
        examples=["https://www.google.com", "http://192.168.0.1/login-verify.exe"],
        inputs=url_in,
    )

# Gradio mengambil alih landing "/"; hapus route home JSON bawaan agar tidak bentrok.
fastapi_app.router.routes = [
    r for r in fastapi_app.router.routes if getattr(r, "path", None) != "/"
]

app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=7860)
