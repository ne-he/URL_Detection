from __future__ import annotations


def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["model_ready"] is True


def test_health_503_when_model_broken(sick_client):
    r = sick_client.get("/health")
    assert r.status_code == 503


def test_home_never_claims_ready_when_broken(sick_client):
    r = sick_client.get("/")
    assert r.status_code == 200
    assert r.json()["status"] == "degraded"


def test_predict_rejected_when_model_broken(sick_client):
    r = sick_client.post("/predict", json={"url": "https://www.google.com"})
    assert r.status_code == 503


def test_predict_contract_v1_compatible(client):
    r = client.post("/predict", json={"url": "https://www.google.com"})
    assert r.status_code == 200
    body = r.json()
    # Kontrak v1 harus tetap ada — frontend lama bergantung ke field ini.
    for field in ("url", "label", "confidence", "legitimate_chance", "is_dangerous"):
        assert field in body
    assert body["label"] == "LEGITIMATE"
    assert body["is_dangerous"] is False
    assert 0 <= body["confidence"] <= 100


def test_predict_flags_ip_url(client):
    r = client.post("/predict", json={"url": "http://58.23.215.31:8765/wzoptup.exe"})
    assert r.status_code == 200
    body = r.json()
    assert body["label"] == "PHISHING"
    assert body["is_dangerous"] is True


def test_batch_predict(client):
    r = client.post(
        "/predict/batch",
        json={"urls": ["https://www.google.com", "http://58.23.215.31:8765/x.exe"]},
    )
    assert r.status_code == 200
    labels = [b["label"] for b in r.json()]
    assert labels == ["LEGITIMATE", "PHISHING"]


def test_batch_limit_50(client):
    r = client.post("/predict/batch", json={"urls": ["https://a.com"] * 51})
    assert r.status_code == 422
