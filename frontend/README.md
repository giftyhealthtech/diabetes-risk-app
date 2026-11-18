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

The form displays human-readable age, sex, general-health, exercise, smoking, and drinking choices without numeric prefixes. It preserves the corresponding survey encodings in form state and translates sex, exercise, heavy drinking, and heart disease to the binary values expected by the live prediction API: female/yes = `1`, male/no = `0`. Diabetes status is the model output, not a user input. BMI can be entered directly, calculated from height and weight, or omitted. Inputs are sent only to this app's FastAPI backend.
