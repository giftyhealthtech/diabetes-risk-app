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

## Run services without Docker

See [frontend/README.md](frontend/README.md) for frontend setup. Start the backend with `uv run uvicorn backend.app.main:app --reload --port 8000`.

## Project documentation

- [Software requirements](SPEC.md)
- [Architecture and milestones](docs/architecture.md)
- [Acceptance criteria](docs/acceptance-criteria.md)