from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


class StubPredictor:
    """Predictor palsu: URL ber-IP / non-https dianggap phishing.

    Cukup deterministik untuk menguji seluruh alur API tanpa TensorFlow.
    """

    def __init__(self, ready: bool = True):
        self._ready = ready

    @property
    def ready(self) -> bool:
        return self._ready

    @property
    def error(self) -> str | None:
        return None if self._ready else "stub: model sengaja dimatikan"

    def prob_legitimate(self, urls: list[str]) -> list[float]:
        out = []
        for u in urls:
            host = u.split("://", 1)[-1].split("/", 1)[0]
            looks_phishy = any(c.isdigit() for c in host.split(":")[0].replace(".", ""))
            out.append(0.05 if looks_phishy else 0.95)
        return out


@pytest.fixture
def client() -> TestClient:
    app = create_app(settings=Settings(), predictor=StubPredictor())
    return TestClient(app)


@pytest.fixture
def sick_client() -> TestClient:
    """App yang model-nya gagal load — untuk menguji /health jujur."""
    app = create_app(settings=Settings(), predictor=StubPredictor(ready=False))
    return TestClient(app)
