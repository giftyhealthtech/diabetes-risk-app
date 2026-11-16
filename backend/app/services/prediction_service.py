from __future__ import annotations

from typing import Any

import httpx

from backend.app.config import settings


class PredictionAPIError(RuntimeError):
    """Raised when the external diabetes prediction API is unavailable or returns an error."""


def get_prediction(payload: dict[str, Any]) -> dict[str, Any]:
    url = settings.model_api_url.rstrip("/") + "/predict"
    try:
        response = httpx.post(url, json=payload, timeout=settings.model_api_timeout)
        if response.status_code >= 400:
            raise PredictionAPIError(
                f"Prediction API unavailable: HTTP {response.status_code} - {response.text[:200]}"
            )
        return response.json()
    except httpx.HTTPError as exc:
        raise PredictionAPIError(f"Prediction API unavailable: {exc}") from exc
