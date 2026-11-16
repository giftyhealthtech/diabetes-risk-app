# Diabetes Risk App

Educational web application for classifying self-reported diabetes status. It is not a medical diagnostic tool and does not predict future diabetes development.

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

## Run services without Docker

See [frontend/README.md](frontend/README.md) for frontend setup. Start the backend with `uv run uvicorn backend.app.main:app --reload --port 8000`.

## Project documentation

- [Software requirements](SPEC.md)
- [Architecture and milestones](docs/architecture.md)
- [Acceptance criteria](docs/acceptance-criteria.md)