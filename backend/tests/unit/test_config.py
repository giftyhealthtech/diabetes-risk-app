from backend.app.config import Settings


def test_settings_parse_comma_separated_cors_origins(monkeypatch) -> None:
    monkeypatch.setenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    )

    settings = Settings(_env_file=None)

    assert settings.cors_origins == [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


def test_model_api_timeout_defaults_to_two_minutes(monkeypatch) -> None:
    monkeypatch.delenv("MODEL_API_TIMEOUT", raising=False)

    settings = Settings(_env_file=None)

    assert settings.model_api_timeout == 120.0
