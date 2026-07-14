FROM python:3.12-slim

WORKDIR /app

# Layer deps terpisah supaya rebuild kode tidak re-download TF/torch.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY models ./models

ENV MODEL_PATH=models/phishing_detection_deeplearning.h5 \
    PHISHING_THRESHOLD=0.5 \
    FRONTEND_ORIGINS=http://localhost:5173

EXPOSE 7860

# Healthcheck memakai endpoint /health yang jujur (503 kalau model gagal load).
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:7860/health').status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
