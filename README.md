# Diabetes Risk App

Educational web application for classifying self-reported diabetes status. It is not a medical diagnostic tool and does not predict future diabetes development.

Try the live application: [https://diabetes-risk-app-z8ke.onrender.com/](https://diabetes-risk-app-z8ke.onrender.com/)

## Run the full app with Docker Compose

Requirements: Docker Engine with the Compose plugin.

```sh
cp .env.example .env
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The frontend serves the React app and proxies prediction requests to the FastAPI backend. The backend is also available at [http://localhost:8000](http://localhost:8000), with its health endpoint at `/health`.

Compose waits for the backend health check before starting the frontend. Set `FRONTEND_PORT` or `BACKEND_PORT` in `.env` to change the host ports, and `MODEL_API_URL` or `MODEL_API_TIMEOUT` to configure the upstream model request. The backend must be able to reach the configured model API.

Stop the services with:

```sh
docker compose down
```

## Observability

The backend exposes Prometheus metrics at `http://localhost:8000/metrics`, including bounded HTTP request counts/durations and upstream prediction API counts/durations. Metrics do not include request bodies or user-provided health values.

Backend application and Uvicorn logs are JSON lines with timestamps and trace/span IDs when a trace is active. Request log fields are limited to method, registered route template, status code, and duration; request bodies, query strings, and headers are not logged.

Incoming requests and outbound HTTPX calls are instrumented with OpenTelemetry. Trace context is accepted and propagated using W3C `traceparent`/`tracestate`; spans intentionally omit request URLs, query strings, headers, and bodies. To export traces to an OTLP/HTTP collector, set `OTEL_EXPORTER_OTLP_ENDPOINT` in `.env` to the collector's base URL (for example `http://localhost:4318`) before starting Compose. The exporter sends traces to `/v1/traces`; the app creates trace IDs locally even when no collector endpoint is configured, but traces will not be available in a tracing UI until an exporter/collector is configured. For Render, configure the same variable in the backend service's environment settings. Do not put credentials in the endpoint URL; use the standard `OTEL_EXPORTER_OTLP_HEADERS` environment variable for collector authentication where required.

## On-call responder

The workspace custom agent is defined in `.github/agents/on-call-responder.agent.md`. Invoke **On-call Responder** from VS Code Chat and provide the alert name, affected service, time window, and redacted metrics/log excerpts or trace ID. Do not include prediction inputs, health information, secrets, or authorization headers.

The agent investigates supplied evidence and proposes a minimal code fix. It must wait for your explicit approval before editing files. After approval, changes remain in the workspace for your review and validation; the agent has no production, deployment, commit, push, or command-execution access. No automatic Prometheus Alertmanager, Grafana, or Render alert delivery is configured yet.

## Public deployment on Render

The root [`render.yaml`](render.yaml) Blueprint defines a React Static Site and a Docker-based FastAPI Web Service. The current public URLs are:

- Frontend: [https://diabetes-risk-app-z8ke.onrender.com](https://diabetes-risk-app-z8ke.onrender.com)
- Backend: [https://diabetes-risk-app-api.onrender.com](https://diabetes-risk-app-api.onrender.com)

The Blueprint selects Render's free backend plan to avoid introducing hosting charges. Render documents free web services as suitable for testing and hobby projects, not production: the backend spins down after 15 minutes without traffic and can take about a minute to start on the next request.

1. Push the repository to GitHub.
2. In Render, choose **New → Blueprint**, connect this repository, and select the `main` branch.
3. Review the two services and deploy the Blueprint.
4. Once deployment finishes, verify the backend at `https://diabetes-risk-app-api.onrender.com/health` and open the frontend at `https://diabetes-risk-app-z8ke.onrender.com`.
5. Submit a synthetic test request through the frontend to confirm the browser-to-backend-to-model API flow.

The Blueprint configures the frontend API URL and backend CORS origin to match the current service URLs above. If Render reports either name is unavailable or assigns a different service URL, update `VITE_API_BASE_URL` on the static site and `CORS_ORIGINS` on the backend to the actual URLs, then redeploy. For an already deployed backend that is not managed by the Blueprint, update `CORS_ORIGINS` in its Render Dashboard environment settings to `https://diabetes-risk-app-z8ke.onrender.com` and redeploy the backend. The backend image listens on Render's `PORT` environment variable; Docker Compose uses port 8000 locally.

Render's official setup guides: [Blueprints](https://render.com/docs/infrastructure-as-code), [static sites](https://render.com/docs/static-sites), and [Docker web services](https://render.com/docs/docker).

## CI/CD

The GitHub Actions workflow at `.github/workflows/ci.yml` runs for pull requests targeting `main` and pushes to `main`. It runs the backend tests, frontend lint/tests/build, and builds both Docker images. It does not publish images or deploy pull requests.

Both services in `render.yaml` use `autoDeployTrigger: checksPass`, so Render deploys a commit on its linked `main` branch only after the commit's CI checks pass. If either Render service was created manually rather than from the Blueprint, set **Settings → Auto-Deploy → After CI Checks Pass** for both services in the Render Dashboard. This setting is required for manually created services; editing `render.yaml` alone does not update their settings.

Protect `main` in GitHub by requiring pull requests, the **Backend tests**, **Frontend checks**, and **Container builds** checks, and the project's required review approval before merging. This ensures approved changes are merged only after CI passes; Render then performs the production deployment automatically. No Render deploy-hook credentials are needed.

## Run services without Docker

See [frontend/README.md](frontend/README.md) for frontend setup. Start the backend with `uv run uvicorn backend.app.main:app --reload --port 8000`.

## Project documentation

- [Software requirements](SPEC.md)
- [Architecture and milestones](docs/architecture.md)
- [Acceptance criteria](docs/acceptance-criteria.md)