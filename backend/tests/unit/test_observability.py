from __future__ import annotations

import json
import logging
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import httpx
from fastapi.testclient import TestClient
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import SpanKind

from backend.app.main import app
from backend.app.observability import JsonLogFormatter, tracer_provider

client = TestClient(app)


class PredictionAPIHandler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:
        self.server.received_traceparent = self.headers.get("traceparent")
        body = json.dumps({"prediction": 0, "probability": 0.1}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        return


class PredictionAPITestServer(ThreadingHTTPServer):
    received_traceparent: str | None = None


def test_metrics_endpoint_exposes_http_and_prediction_api_metrics(monkeypatch) -> None:
    fail_request = False

    class FakeResponse:
        status_code = 200

        @staticmethod
        def json() -> dict[str, int | float]:
            return {"prediction": 0, "probability": 0.1}

    def fake_post(url, json, timeout):
        if fail_request:
            raise httpx.RequestError("upstream unavailable")
        return FakeResponse()

    monkeypatch.setattr(
        "backend.app.services.prediction_service.httpx.post",
        fake_post,
    )
    prediction_payload = {
        "age_group": 2,
        "sex": 1,
        "bmi": 22.5,
        "general_health": 3,
        "exercise_30d": 1,
        "smoking_status": 0,
        "heavy_drinker": 0,
        "heart_disease": 0,
    }
    prediction_response = client.post("/predict", json=prediction_payload)
    fail_request = True
    failed_prediction_response = client.post("/predict", json=prediction_payload)
    metrics_response = client.get("/metrics")

    assert prediction_response.status_code == 200
    assert failed_prediction_response.status_code == 502
    assert metrics_response.status_code == 200
    assert "http_requests_total" in metrics_response.text
    assert "http_request_duration_seconds" in metrics_response.text
    assert 'prediction_api_requests_total{outcome="success"}' in metrics_response.text
    assert 'prediction_api_requests_total{outcome="failure"}' in metrics_response.text
    assert "prediction_api_request_duration_seconds" in metrics_response.text


def test_request_logs_include_trace_context_without_query_or_health_data(
    caplog, monkeypatch
) -> None:
    exporter = InMemorySpanExporter()
    tracer_provider.add_span_processor(SimpleSpanProcessor(exporter))
    monkeypatch.setattr(
        "backend.app.services.prediction_service.httpx.get",
        lambda url, timeout: httpx.Response(200),
    )

    with caplog.at_level(logging.INFO, logger="backend.http"):
        response = client.get("/health?bmi=33.2&secret=not-for-logs")

    assert response.status_code == 200
    request_log = next(
        record
        for record in caplog.records
        if record.name == "backend.http" and record.getMessage() == "http_request_completed"
    )
    payload = json.loads(JsonLogFormatter().format(request_log))

    assert re.fullmatch(r"[0-9a-f]{32}", payload["trace_id"])
    assert re.fullmatch(r"[0-9a-f]{16}", payload["span_id"])
    assert payload["route"] == "/health"
    assert payload["status_code"] == 200
    assert "33.2" not in json.dumps(payload)
    assert "not-for-logs" not in json.dumps(payload)
    server_span = next(
        span
        for span in exporter.get_finished_spans()
        if span.kind == SpanKind.SERVER and span.name == "GET /health"
    )
    span_attributes = json.dumps(dict(server_span.attributes))
    assert "not-for-logs" not in span_attributes
    assert "33.2" not in span_attributes
    assert not any("query" in key.lower() for key in server_span.attributes)


def test_outbound_prediction_call_propagates_trace_context(monkeypatch, caplog) -> None:
    server = PredictionAPITestServer(("127.0.0.1", 0), PredictionAPIHandler)
    server.received_traceparent = None
    thread = threading.Thread(target=server.serve_forever)
    thread.start()
    monkeypatch.setattr(
        "backend.app.services.prediction_service.settings.model_api_url",
        f"http://127.0.0.1:{server.server_port}",
    )
    with caplog.at_level(logging.INFO, logger="backend.http"):
        try:
            response = client.post(
                "/predict",
                json={
                    "age_group": 2,
                    "sex": 1,
                    "bmi": 22.5,
                    "general_health": 3,
                    "exercise_30d": 1,
                    "smoking_status": 0,
                    "heavy_drinker": 0,
                    "heart_disease": 0,
                },
            )
        finally:
            server.shutdown()
            thread.join()
            server.server_close()

    assert response.status_code == 200
    assert server.received_traceparent is not None
    traceparent_match = re.fullmatch(
        r"00-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}",
        server.received_traceparent,
    )
    assert traceparent_match is not None
    request_log = next(
        record
        for record in caplog.records
        if record.name == "backend.http"
        and record.getMessage() == "http_request_completed"
        and record.http_method == "POST"
    )
    assert traceparent_match.group(1) == request_log.trace_id
