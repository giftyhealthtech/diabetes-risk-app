import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


@pytest.mark.parametrize(
    "payload, expected_message",
    [
        ({"age_group": 2, "sex": 1, "bmi": 0, "general_health": 3, "exercise_30d": 1, "smoking_status": 0, "heavy_drinker": 0, "heart_disease": 0}, "bmi"),
        ({"age_group": 2, "sex": 1, "general_health": 3, "exercise_30d": 1, "smoking_status": 0, "heavy_drinker": 0, "heart_disease": 0}, "bmi"),
    ],
)
def test_prediction_request_rejects_invalid_bmi(payload, expected_message):
    response = client.post("/predict", json=payload)

    assert response.status_code == 422
    assert expected_message in str(response.text).lower()


def test_prediction_request_accepts_height_and_weight_and_computes_bmi(monkeypatch):
    def fake_post(url, json, timeout):
        assert json["bmi"] == pytest.approx(22.22222222222222)
        return __import__("httpx").Response(200, json={"prediction": 0, "probability": 0.25})

    monkeypatch.setattr("backend.app.services.prediction_service.httpx.post", fake_post)

    payload = {
        "age_group": 2,
        "sex": 1,
        "height_m": 1.8,
        "weight_kg": 72,
        "general_health": 3,
        "exercise_30d": 1,
        "smoking_status": 0,
        "heavy_drinker": 0,
        "heart_disease": 0,
    }

    response = client.post("/predict", json=payload)

    assert response.status_code == 200
    assert response.json() == {"prediction": 0, "probability": 0.25}
