from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .schemas import PredictionInput
from .services.prediction_service import PredictionAPIError, get_prediction

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Diabetes Risk App backend foundation.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
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
