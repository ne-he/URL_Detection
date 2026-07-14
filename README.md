# 🛡️ Phishing URL Detection System

> **⚠️ Superseded by [PhishGuard v2](https://github.com/ne-he/phishguard).**
> The backend here has known issues that v2 fixes properly: `*`+credentials CORS, a server that reports "Ready" even when the model failed to load, no input validation, a hardcoded threshold, and zero tests. v2 is a clean rebuild (same model, same response contract) with an honest `/health`, strict URL validation, env-based config, 18 tests, and a regression test that locks the label orientation. This repo stays up as the v1 archive with the original frontend.

A high-performance, deep learning-based application designed to identify and classify phishing URLs. This project is fully containerized and optimized for CPU-only environments to ensure a lightweight and fast deployment process on machines like the MSI Katana.

## ✨ Key Features
* **Deep Learning Engine**: Utilizes a Keras `.h5` model for precise URL classification.
* **Intelligent Embeddings**: Implements `all-MiniLM-L6-v2` via `sentence-transformers` for robust text vectorization.
* **Dockerized Architecture**: Orchestrated with Docker Compose for seamless backend and frontend integration.
* **CPU Optimized**: Specially configured with `torch+cpu` and `tensorflow-cpu` to skip heavy GPU libraries, significantly reducing build time and image size.

## 🛠️ Tech Stack
* **Backend**: FastAPI, TensorFlow CPU, PyTorch CPU, Uvicorn.
* **Frontend**: React, Vite.
* **Data Science**: Scikit-learn, Numpy, Pandas.

## 🚀 Activation Guide

Follow these steps to get the system running on your local machine:

### 1. Clone the Repository
```bash
git clone https://github.com/ne-he/URL_Detection.git
cd URL_Detection
```
### 2. Docker compose
```bash
docker-compose up --build
```
### 3. Access the Application
Once the logs show SEMUA SISTEM GO!, you can access the services at:

Frontend Dashboard: http://localhost:5173

API Endpoint: http://localhost:8000

API Documentation (Swagger): http://localhost:8000/docs
