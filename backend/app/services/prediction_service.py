from __future__ import annotations

import threading
import time
from typing import Any

import httpx

from backend.app.config import settings
from backend.app.observability import record_prediction_api_request

import logging

logger = logging.getLogger(__name__)


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

            if response.is_success and response.json().get("status") == "ready":
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
    """
    Keep contacting the model API until the actual ML model is ready.

    This works independently of the background thread's readiness event.
    """

    url = settings.model_api_url.rstrip("/") + "/health"
    deadline = time.monotonic() + timeout
    attempt = 0

    while time.monotonic() < deadline:
        attempt += 1

        try:
            logger.info(
                "Checking model readiness. Attempt %s",
                attempt,
            )

            response = httpx.get(url, timeout=20)

            if response.is_success:
                data = response.json()

                if data.get("status") == "ready":
                    _model_ready.set()

                    logger.info("ML model is ready.")
                    return True

                logger.info(
                    "Model API responded but model is not ready: %s",
                    data,
                )

            else:
                logger.warning(
                    "Model health check returned HTTP %s",
                    response.status_code,
                )

                if response.status_code == 404:
                    raise PredictionAPIError(
                        "Model API health endpoint was not found."
                    )

        except httpx.HTTPError:
            logger.exception(
                "Could not reach model API. Retrying..."
            )

        time.sleep(5)

    logger.error("Model did not become ready within %s seconds", timeout)

    return False


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
        # Wait for the actual ML model, not just the backend event.
        if not wait_for_model_ready(timeout=300):
            raise PredictionAPIError(
                "The prediction model is still unavailable. "
                "Please try again shortly."
            )

        logger.info("Sending prediction request to model API.")

        response = httpx.post(
            url,
            json=payload,
            timeout=settings.model_api_timeout,
        )

        response.raise_for_status()

        result = response.json()
        outcome = "success"

        return result

    except httpx.HTTPError as exc:
        logger.exception("Prediction request failed.")

        raise PredictionAPIError(
            f"Prediction API unavailable: {exc}"
        ) from exc

    finally:
        record_prediction_api_request(
            outcome,
            time.perf_counter() - started_at,
        )
