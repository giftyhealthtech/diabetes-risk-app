
# Diabetes Risk App — Agent Instructions

## 1. Project Overview

Build a full-stack educational diabetes classification application using the existing diabetes risk prediction machine learning prediction API.

The application must provide:
- A React frontend.
- A FastAPI backend.
- Integration with the deployed diabetes risk prediction API.
- Automated unit and integration tests.
- Docker and Docker Compose.
- CI/CD using GitHub Actions.
- Observability using metrics, traces, and structured logs.
- Prometheus and Grafana monitoring.
- An alerting system.
- An on-call responder agent.

Read `SPEC.md` before implementing features.

## 2. Existing diabetes risk prediction Model

The diabetes risk prediction API is already deployed:

https://diabetes-risk-prediction-tmkn.onrender.com

API documentation:

https://diabetes-risk-prediction-tmkn.onrender.com/docs

Health endpoint:

https://diabetes-risk-prediction-tmkn.onrender.com/health

diabetes risk prediction uses:
- BRFSS 2024 survey data.
- Logistic Regression.
- A classification threshold of 0.15.
- Median imputation fitted during model training.
- A saved Joblib model artifact.

Important:
- Do not retrain or duplicate the diabetes risk prediction model.
- Do not invent API fields or accepted categorical values.
- Inspect the diabetes risk prediction OpenAPI schema before implementing integration.
- Preserve the original prediction response.
- Treat predictions as classification of self-reported diabetes status, not diagnosis or prediction of future diabetes.

## 3. BMI Requirements

The frontend must support:
1. Height and weight input with automatic BMI calculation.
2. Direct BMI input.
3. Leaving BMI unavailable only as an application-level UX option when the external model API contract still requires a value.

BMI formula:

BMI = weight in kilograms / (height in metres × height in metres)

The backend must validate the supplied values.

Do not send missing BMI to the diabetes risk prediction API until its API contract explicitly supports nullable BMI and its existing fitted preprocessing pipeline includes the intended median imputation for the missing value.

Never calculate a new median from an individual request or from the frontend.

## 4. Architecture

Use:
- React for the frontend.
- FastAPI for the backend.
- Prometheus for metrics.
- Grafana for dashboards.
- OpenTelemetry for traces.
- Structured JSON logging with trace IDs.
- Docker Compose for local orchestration.
- GitHub Actions for CI/CD.

Use environment variables for configuration and secrets.

## 5. Development Rules

- Work on one milestone at a time.
- Read the relevant project documentation before implementation.
- Inspect existing files before modifying them.
- Do not overwrite working code without explaining why.
- Do not generate unnecessary files.
- Keep frontend, backend, and monitoring responsibilities separate.
- Use clear naming and modular code.
- Write tests alongside features.
- Run relevant tests after each implementation.
- Never claim a test passed without executing it.
- Never commit secrets, credentials, or `.env` files.
- Do not store unnecessary personal or health information.
- Do not send customer inputs or credentials to telemetry.
- Document important architectural decisions.

## 6. Testing Requirements

Include:
- Backend unit tests.
- Backend integration tests.
- Frontend tests.
- diabetes risk prediction API integration tests using mocks where appropriate.

All tests must be runnable through a documented single command.

## 7. Agent Responsibilities

Follow the roles and handoff process in `docs/agent-team.md`.

Use the public GitHub Projects board to track implementation tasks.

Do not silently skip acceptance criteria.

## 8. Completion Requirements

Before declaring a task complete:
1. Implement the requested feature.
2. Run relevant tests.
3. Report test results.
4. Check acceptance criteria.
5. Update relevant documentation.
6. Summarize changed files and remaining limitations.

Do not start the next milestone without reporting the current milestone's result.
