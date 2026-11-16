# Frontend

React application for the educational diabetes-risk classification app.

## Run locally

To run the frontend and backend together in containers, follow the root [Docker Compose instructions](../README.md#run-the-full-app-with-docker-compose).

For public deployment, see the root [Render Blueprint instructions](../README.md#public-deployment-on-render).

From this directory:

```sh
npm install
npm run dev
```

The Vite development server proxies `/api/predict` to `http://localhost:8000/predict` by default. Set `VITE_BACKEND_URL` before starting Vite to use a different backend origin. For a deployment where the frontend and backend are not served behind the same origin, set `VITE_API_BASE_URL` to the backend base URL; the app then requests its `/predict` endpoint directly.

## Validate

```sh
npm test
npm run lint
npm run build
```

The model API OpenAPI schema exposes the prediction fields as numeric values but does not publish most categorical value lists. The live API reports smoking-status codes `1`, `2`, `3`, and `4`; the interface offers only those verified choices and leaves the other fields numeric rather than defining unsupported dropdown options. BMI is required: users can enter it directly or provide height in metres and weight in kilograms for calculation. Inputs are sent only to this app's FastAPI backend.
