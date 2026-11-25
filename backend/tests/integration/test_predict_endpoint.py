import httpx

from backend.app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_predict_endpoint_forwards_valid_prediction(monkeypatch):
    prediction_result = {
        "diabetes_status": "You may not be at high risk of diabetes.",
        "chance_of_diabetes": "1.55%",
        "explanation": "Only about 1.55% of people with answers like yours reported having diabetes, which is low.",
    }

    def fake_post(url, json, timeout):
        assert url.endswith("/predict")
        assert json["bmi"] == 20.0
        return httpx.Response(
            200,
            json=prediction_result,
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(
        "backend.app.services.prediction_service.httpx.get",
        lambda url, timeout: httpx.Response(200, json={"status": "ready"}),
    )
    monkeypatch.setattr("backend.app.services.prediction_service.httpx.post", fake_post)

    payload = {
        "age_group": 2,
        "sex": 1,
        "weight_kg": 80,
        "height_m": 2.0,
        "general_health": 3,
        "exercise_30d": 1,
        "smoking_status": 0,
        "heavy_drinker": 0,
        "heart_disease": 0,
    }

    response = client.post("/predict", json=payload)

    assert response.status_code == 200
    assert response.json() == prediction_result


def test_predict_endpoint_returns_meaningful_error_when_upstream_fails(monkeypatch):
    def fake_post(url, json, timeout):
        raise httpx.RequestError("upstream unavailable")

    monkeypatch.setattr(
        "backend.app.services.prediction_service.httpx.get",
        lambda url, timeout: httpx.Response(200, json={"status": "ready"}),
    )
    monkeypatch.setattr("backend.app.services.prediction_service.httpx.post", fake_post)

    payload = {
        "age_group": 2,
        "sex": 1,
        "bmi": 22.5,
        "general_health": 3,
        "exercise_30d": 1,
        "smoking_status": 0,
        "heavy_drinker": 0,
        "heart_disease": 0,
    }

    response = client.post("/predict", json=payload)

    assert response.status_code == 502
    assert "Prediction API unavailable" in response.json()["detail"]
