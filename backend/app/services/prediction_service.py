from __future__ import annotations

import time
from typing import Any

import httpx

from backend.app.config import settings
from backend.app.observability import record_prediction_api_request


class PredictionAPIError(RuntimeError):
    """Raised when the external diabetes prediction API is unavailable or returns an error."""


def get_prediction(payload: dict[str, Any]) -> dict[str, Any]:
    url = settings.model_api_url.rstrip("/") + "/predict"
    started_at = time.perf_counter()
    outcome = "failure"
    try:
        response = httpx.post(url, json=payload, timeout=settings.model_api_timeout)
        if response.status_code >= 400:
            raise PredictionAPIError(
                f"Prediction API unavailable: HTTP {response.status_code}"
            )
        result = response.json()
        outcome = "success"
        return result
    except httpx.HTTPError as exc:
        raise PredictionAPIError(f"Prediction API unavailable: {exc}") from exc
    finally:
        record_prediction_api_request(outcome, time.perf_counter() - started_at)
