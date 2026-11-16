from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator


class PredictionInput(BaseModel):
    age_group: int = Field(..., gt=0)
    sex: int = Field(..., ge=0)
    bmi: float | None = Field(default=None, gt=0)
    height_m: float | None = Field(default=None, gt=0)
    weight_kg: float | None = Field(default=None, gt=0)
    general_health: int = Field(..., ge=0)
    exercise_30d: int = Field(..., ge=0)
    smoking_status: int = Field(..., ge=0)
    heavy_drinker: int = Field(..., ge=0)
    heart_disease: int = Field(..., ge=0)

    @model_validator(mode="after")
    def validate_bmi(self) -> "PredictionInput":
        has_direct_bmi = self.bmi is not None
        has_height_weight = self.height_m is not None or self.weight_kg is not None

        if has_height_weight and (self.height_m is None or self.weight_kg is None):
            raise ValueError("Height and weight must both be provided together to compute BMI.")

        if not has_direct_bmi and not has_height_weight:
            raise ValueError("BMI is required. Provide bmi directly or provide both height_m and weight_kg.")

        if has_direct_bmi and has_height_weight:
            raise ValueError("Provide either bmi directly or height_m and weight_kg, not both.")

        if has_height_weight:
            computed_bmi = self.weight_kg / (self.height_m * self.height_m)
            self.bmi = computed_bmi

        return self

    def to_model_payload(self) -> dict[str, Any]:
        return {
            "age_group": self.age_group,
            "sex": self.sex,
            "bmi": self.bmi,
            "general_health": self.general_health,
            "exercise_30d": self.exercise_30d,
            "smoking_status": self.smoking_status,
            "heavy_drinker": self.heavy_drinker,
            "heart_disease": self.heart_disease,
        }
