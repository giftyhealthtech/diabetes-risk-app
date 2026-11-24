import httpx
from fastapi.testclient import TestClient

from backend.app.config import settings
from backend.app.main import app

client = TestClient(app)


def test_health_endpoint_returns_ok(monkeypatch) -> None:
    def fake_get(url, timeout):
        assert url == f"{settings.model_api_url.rstrip('/')}/health"
        assert timeout == 15
        return httpx.Response(200)

    monkeypatch.setattr("backend.app.services.prediction_service.httpx.get", fake_get)
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "diabetes-risk-app"


def test_health_endpoint_reports_model_unavailable(monkeypatch) -> None:
    def fail_request(url, timeout):
        raise httpx.TimeoutException("model API timed out")

    monkeypatch.setattr(
        "backend.app.services.prediction_service.httpx.get",
        fail_request,
    )

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json() == {"detail": "Prediction API unavailable"}


def test_health_endpoint_reports_unhealthy_model_response(monkeypatch) -> None:
    monkeypatch.setattr(
        "backend.app.services.prediction_service.httpx.get",
        lambda url, timeout: httpx.Response(503),
    )

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json() == {"detail": "Prediction API unavailable"}


def test_liveness_endpoint_does_not_call_model_api(monkeypatch) -> None:
    def fail_request(url, timeout):
        raise AssertionError("liveness must not call the model API")

    monkeypatch.setattr(
        "backend.app.services.prediction_service.httpx.get",
        fail_request,
    )

    response = client.get("/health/live")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_cors_headers_are_present_for_allowed_origin(monkeypatch) -> None:
    monkeypatch.setattr(
        "backend.app.services.prediction_service.httpx.get",
        lambda url, timeout: httpx.Response(200),
    )
    response = client.get("/health", headers={"Origin": "http://localhost:3000"})

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
