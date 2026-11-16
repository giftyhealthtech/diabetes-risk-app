from __future__ import annotations

import json
import logging
import logging.config
import os
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI
from fastapi.responses import Response
from opentelemetry import propagate, trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace import SpanKind, Status, StatusCode
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    Counter,
    Histogram,
    generate_latest,
)
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from .config import settings

logger = logging.getLogger("backend.http")

registry = CollectorRegistry(auto_describe=True)
http_requests = Counter(
    "http_requests",
    "Number of completed HTTP requests.",
    labelnames=("method", "route", "status_class"),
    registry=registry,
)
http_request_duration = Histogram(
    "http_request_duration_seconds",
    "Duration of completed HTTP requests.",
    labelnames=("method", "route"),
    registry=registry,
)
prediction_api_requests = Counter(
    "prediction_api_requests",
    "Number of requests made to the upstream prediction API.",
    labelnames=("outcome",),
    registry=registry,
)
prediction_api_request_duration = Histogram(
    "prediction_api_request_duration_seconds",
    "Duration of requests made to the upstream prediction API.",
    registry=registry,
)

resource = Resource.create(
    {
        "service.name": settings.app_name,
        "service.version": settings.app_version,
        "deployment.environment.name": settings.environment,
    }
)
tracer_provider = TracerProvider(resource=resource)
trace.set_tracer_provider(tracer_provider)

if os.getenv("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT") or os.getenv(
    "OTEL_EXPORTER_OTLP_ENDPOINT"
):
    tracer_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))

_httpx_instrumented = False


def _trace_context_fields() -> dict[str, str | None]:
    span_context = trace.get_current_span().get_span_context()
    if not span_context.is_valid:
        return {"trace_id": None, "span_id": None}
    return {
        "trace_id": f"{span_context.trace_id:032x}",
        "span_id": f"{span_context.span_id:016x}",
    }


class JsonLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        trace_fields = _trace_context_fields()
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, timezone.utc)
            .isoformat(timespec="milliseconds")
            .replace("+00:00", "Z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "trace_id": getattr(record, "trace_id", trace_fields["trace_id"]),
            "span_id": getattr(record, "span_id", trace_fields["span_id"]),
        }
        for field in ("http_method", "route", "status_code", "duration_ms"):
            if hasattr(record, field):
                payload[field] = getattr(record, field)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {"json": {"()": JsonLogFormatter}},
            "handlers": {
                "stdout": {
                    "class": "logging.StreamHandler",
                    "stream": "ext://sys.stdout",
                    "formatter": "json",
                }
            },
            "root": {"level": "INFO", "handlers": ["stdout"]},
            "loggers": {
                "uvicorn": {"level": "INFO", "handlers": ["stdout"], "propagate": False},
                "uvicorn.error": {"level": "INFO", "handlers": ["stdout"], "propagate": False},
                "uvicorn.access": {"level": "WARNING", "handlers": [], "propagate": False},
                "httpx": {"level": "WARNING", "handlers": [], "propagate": False},
            },
        }
    )


def instrument_app(app: FastAPI) -> None:
    global _httpx_instrumented
    if not _httpx_instrumented:
        HTTPXClientInstrumentor().instrument(tracer_provider=tracer_provider)
        _httpx_instrumented = True
    app.add_middleware(TraceContextMiddleware)


def record_prediction_api_request(outcome: str, duration: float) -> None:
    prediction_api_requests.labels(outcome=outcome).inc()
    prediction_api_request_duration.observe(duration)


def metrics_response() -> Response:
    return Response(content=generate_latest(registry), media_type=CONTENT_TYPE_LATEST)


def _method_label(method: str) -> str:
    allowed_methods = {"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"}
    return method if method in allowed_methods else "OTHER"


def _route_label(scope: Scope) -> str:
    route = scope.get("route")
    route_path = getattr(route, "path", None)
    return route_path if isinstance(route_path, str) else "unmatched"


def _status_class(status_code: int) -> str:
    if 100 <= status_code < 600:
        return f"{status_code // 100}xx"
    return "other"


class RequestObservabilityMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        started_at = time.perf_counter()
        status_code = 500

        async def send_with_status(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        request_failed = False
        try:
            await self.app(scope, receive, send_with_status)
        except Exception:
            request_failed = True
            raise
        finally:
            duration = time.perf_counter() - started_at
            method = _method_label(scope.get("method", ""))
            route = _route_label(scope)
            status_class = _status_class(status_code)
            http_requests.labels(
                method=method,
                route=route,
                status_class=status_class,
            ).inc()
            http_request_duration.labels(method=method, route=route).observe(duration)
            logger.log(
                logging.ERROR if status_code >= 500 else logging.INFO,
                "http_request_failed" if request_failed else "http_request_completed",
                extra={
                    "http_method": method,
                    "route": route,
                    "status_code": status_code,
                    "duration_ms": round(duration * 1000, 3),
                    **_trace_context_fields(),
                },
            )


class TraceContextMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app
        self.tracer = tracer_provider.get_tracer(__name__)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = {
            key.decode("latin-1").lower(): value.decode("latin-1")
            for key, value in scope.get("headers", [])
            if key.lower() in {b"traceparent", b"tracestate"}
        }
        parent_context = propagate.extract(headers)
        method = _method_label(scope.get("method", ""))
        status_code = 500

        async def send_with_status(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        with self.tracer.start_as_current_span(
            "http.server",
            context=parent_context,
            kind=SpanKind.SERVER,
            attributes={"http.request.method": method},
            record_exception=False,
            set_status_on_exception=False,
        ) as span:
            try:
                await self.app(scope, receive, send_with_status)
            except Exception as exc:
                span.set_attribute("error.type", type(exc).__name__)
                span.set_status(Status(StatusCode.ERROR))
                raise
            finally:
                route = _route_label(scope)
                span.update_name(f"{method} {route}")
                span.set_attribute("http.route", route)
                span.set_attribute("http.response.status_code", status_code)
                if status_code >= 500:
                    span.set_status(Status(StatusCode.ERROR))


def add_metrics_endpoint(app: FastAPI) -> None:
    async def get_metrics() -> Response:
        return metrics_response()

    app.add_api_route("/metrics", get_metrics, methods=["GET"], include_in_schema=False)
