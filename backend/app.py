"""Entrypoint Hugging Face Gradio Space.

Docker Space di-lock (Paid) untuk akun free, jadi backend ini dibungkus sebagai
Gradio Space (gratis, CPU basic, RAM 16 GB). Yang dijalankan tetap FastAPI v2
yang sama persis:

    GET  /            UI Gradio interaktif (landing Space)
    POST /predict     kontrak v1-compatible — frontend Vercel manggil ini
    POST /predict/batch
    GET  /health      503 kalau model belum siap
    GET  /docs        Swagger

UI Gradio cuma "kulit" untuk demo di halaman Space; logika prediksi tetap lewat
endpoint /predict yang sama, jadi tidak ada dua sumber kebenaran.
"""
from __future__ import annotations

import gradio as gr
import requests

# app.main sudah membuat FastAPI + lifespan yang load model saat startup.
from app.main import app as fastapi_app

# UI memanggil endpoint /predict di proses yang sama (loopback) supaya
# validasi & konvensi label persis sama dengan yang dipakai frontend.
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
        "Deteksi URL phishing: embedding **MiniLM** + classifier **Keras**. "
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
# Hanya memengaruhi proses Space ini — dev lokal/`uvicorn app.main:app` tak tersentuh.
fastapi_app.router.routes = [
    r for r in fastapi_app.router.routes if getattr(r, "path", None) != "/"
]

app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=7860)
