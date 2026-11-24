from __future__ import annotations

import threading
import time
from typing import Any

import httpx

from backend.app.config import settings
from backend.app.observability import record_prediction_api_request


class PredictionAPIError(RuntimeError):
    """Raised when the external diabetes prediction API is unavailable."""


# Background warm-up state
_warmup_lock = threading.Lock()
_warmup_thread: threading.Thread | None = None
_model_ready = threading.Event()


def _warmup_worker() -> None:
    """Wake up the model API and wait until it becomes available."""

    url = settings.model_api_url.rstrip("/") + "/health"
    deadline = time.monotonic() + 300

    while time.monotonic() < deadline:
        try:
            response = httpx.get(url, timeout=15)

            if response.is_success:
                _model_ready.set()
                return

        except httpx.HTTPError:
            pass

        time.sleep(5)


def start_model_warmup(force: bool = False) -> None:
    global _warmup_thread

    with _warmup_lock:
        if _warmup_thread is not None and _warmup_thread.is_alive():
            return

        if _model_ready.is_set() and not force:
            return

        _model_ready.clear()

        _warmup_thread = threading.Thread(
            target=_warmup_worker,
            daemon=True,
        )
        _warmup_thread.start()


def is_model_ready() -> bool:
    return _model_ready.is_set()


def wait_for_model_ready(timeout: int = 300) -> bool:
    """Wait until the model API becomes available."""

    start_model_warmup()
    return _model_ready.wait(timeout=timeout)


def check_prediction_api_health() -> None:
    url = settings.model_api_url.rstrip("/") + "/health"

    try:
        response = httpx.get(url, timeout=15)

        if not response.is_success:
            raise PredictionAPIError(
                f"Prediction API unavailable: HTTP {response.status_code}"
            )

    except httpx.HTTPError as exc:
        raise PredictionAPIError(
            f"Prediction API unavailable: {exc}"
        ) from exc


def get_prediction(payload: dict[str, Any]) -> dict[str, Any]:
    url = settings.model_api_url.rstrip("/") + "/predict"

    started_at = time.perf_counter()
    outcome = "failure"

    try:
        # Ensure the model is awake before making a prediction.
        if not wait_for_model_ready(timeout=300):
            raise PredictionAPIError(
                "Model API did not become ready within 5 minutes."
            )

        response = httpx.post(
            url,
            json=payload,
            timeout=settings.model_api_timeout,
        )

        if response.status_code >= 400:
            raise PredictionAPIError(
                f"Prediction API unavailable: HTTP {response.status_code}"
            )

        result = response.json()
        outcome = "success"

        return result

    except httpx.HTTPError as exc:
        raise PredictionAPIError(
            f"Prediction API unavailable: {exc}"
        ) from exc

    finally:
        record_prediction_api_request(
            outcome,
            time.perf_counter() - started_at,
        )
