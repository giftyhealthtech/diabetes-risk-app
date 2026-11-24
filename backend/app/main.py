from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .observability import (
    RequestObservabilityMiddleware,
    add_metrics_endpoint,
    configure_logging,
    instrument_app,
)
from .schemas import PredictionInput
from .services.prediction_service import (
    PredictionAPIError,
    check_prediction_api_health,
    get_prediction,
    start_model_warmup,
    is_model_ready,
)

configure_logging()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Diabetes Risk App backend foundation.",
    telemetry={
        "tracing": False,
        "metrics": False,
        "logs": False,
        "operation_spans": False,
    },
)

app.add_middleware(RequestObservabilityMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
add_metrics_endpoint(app)
instrument_app(app)


@app.get("/health/live")
def liveness_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.environment,
    }


@app.post("/warmup")
def warmup_model() -> dict[str, str]:
    """Start waking up the external model API in the background."""

    start_model_warmup(force=True)

    return {
        "status": "warming",
        "message": "Model warm-up started.",
    }


@app.get("/warmup/status")
def warmup_status() -> dict[str, str]:
    """Check whether the model is ready."""

    return {
        "status": "ready" if is_model_ready() else "warming",
    }


@app.get("/health")
def health_check() -> dict[str, str]:
    try:
        check_prediction_api_health()
    except PredictionAPIError as exc:
        raise HTTPException(status_code=503, detail="Prediction API unavailable") from exc

    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.environment,
    }


@app.post("/predict")
def predict(input_payload: PredictionInput) -> dict:
    try:
        return get_prediction(input_payload.to_model_payload())
    except PredictionAPIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
