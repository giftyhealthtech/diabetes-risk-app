# Diabetes Risk App — Software Requirements Specification

## 1. Project Overview

### 1.1 Project Name
Diabetes Risk App

### 1.2 Purpose

The Diabetes Risk App is a web application that allows users to submit selected demographic, health, and lifestyle information through a user-friendly interface and receive a machine learning classification from the existing Diabetes Prediction API developed in the diabetes-risk-prediction repository.

The application will also demonstrate backend integration, frontend development, containerization, automated testing, application monitoring, alerting, and human-reviewed incident response.

### 1.3 Project Objectives

- Provide a simple interface for submitting prediction inputs.
- Integrate with the existing diabetes risk prediction FastAPI prediction service.
- Display prediction results in an understandable format.
- Validate user inputs before sending requests.
- Monitor API availability, response time, and error rates.
- Generate alerts when defined service conditions occur.
- Use a responder agent to summarize monitoring alerts.
- Automate testing and deployment using GitHub Actions.

## 2. Scope

### 2.1 In Scope

- React frontend.
- FastAPI backend.
- Integration with the deployed diabetes risk prediction API.
- Input validation and error handling.
- Prediction result presentation.
- Prometheus metrics collection.
- Grafana monitoring dashboards.
- Alert rules.
- Automated alert summarization using a responder agent.
- Docker and Docker Compose.
- Automated testing and CI/CD pipelines.

### 2.2 Out of Scope for the Initial MVP

- User registration and authentication.
- Patient accounts and profiles.
- Medical diagnosis or treatment recommendations.
- Integration with hospital information systems.

## 3. System Architecture

The application will contain the following components:

1. **React Frontend:** Collects user inputs and displays prediction results.
2. **FastAPI Backend:** Validates requests, communicates with the diabetes risk prediction API, and returns results to the frontend.
3. **Diabetes risk prediction API:** Loads the trained Logistic Regression model and performs predictions.
4. **Prometheus:** Collects application metrics.
5. **Grafana:** Displays monitoring dashboards.
6. **Alerting System:** Detects defined application and service failures.
7. **Responder Agent:** Manually investigates supplied alert context and generates concise incident summaries and reviewable fix proposals.
8. **Docker Compose:** Runs the application services together.
9. **GitHub Actions:** Runs automated tests and deployment workflows.

### 3.1 Request Flow

React Frontend → FastAPI Backend → diabetes risk prediction API → FastAPI Backend → React Frontend.

Prometheus independently collects metrics from the backend, while Grafana displays them and alerting rules detect service conditions. The initial responder is manually invoked with an alert; automatic alert delivery is not configured.

## 4. Functional Requirements

### FR1: User Input

The frontend must provide fields for:

- Age group
- Sex
- BMI
- General health
- Exercise in the past 30 days
- Smoking status
- Heavy drinking classification
- Heart disease history
- Height and weight fields for automatic BMI calculation, or a direct BMI input field

The input fields must follow the accepted values and validation rules of the diabetes risk prediction API.

The interface must present these categories with human-readable labels and translate survey encodings to the prediction API's accepted values using the model's training preprocessing. Diabetes status is the prediction target and must not be collected as an input.

### FR2: Input Validation

The backend must:

- Validate required fields.
- Reject invalid categorical values.
- Validate BMI.
- Return meaningful validation errors.
- Prevent invalid requests from reaching the prediction API.
- Omit the BMI field when it is unavailable; the verified external API accepts requests without BMI and handles its own preprocessing.

### FR3: Prediction Integration

The backend must:

- Send validated inputs to the diabetes risk prediction API.
- Receive the prediction response.
- Handle connection failures and timeouts.
- Return the prediction result to the frontend.
- Avoid exposing internal service errors or sensitive configuration.

### FR4: Prediction Results

The frontend must display:

- Predicted classification.
- Estimated class probability.
- A clear explanation of the result.
- An educational and medical disclaimer.

The application must not present the output as a diagnosis or as a prediction of future diabetes development.

### FR5: Error Handling

The application must handle:

- Invalid user inputs.
- Prediction API unavailability.
- Request timeouts.
- Unexpected server errors.
- Invalid or unexpected responses from the prediction API.

Users must receive understandable error messages.

### FR6: Monitoring

The backend must expose metrics that allow Prometheus to monitor:

- Total prediction requests.
- Successful requests.
- Failed requests.
- Request duration.
- API availability.

### FR7: Alerting

Prometheus alert rules must detect configured conditions such as:

- High API error rate.
- Increased response time.
- Backend service unavailability.
- Prediction API connectivity failures.

### FR8: Responder Agent

The responder agent must:

- Accept monitoring alerts and redacted telemetry supplied by the project lead. Automatic alert delivery is not part of the initial responder configuration.
- Identify the affected service.
- Summarize verified evidence, likely impact, confidence, and missing information.
- Explain the likely operational impact.
- Suggest relevant investigation steps and a minimal, reversible code fix.
- Wait for explicit human approval before making local workspace changes.
- Never access or modify production, deploy, roll back, or automatically remediate an incident.

The responder is advisory and human-in-the-loop. Approved code changes must be reviewed, tested, and deployed through the normal protected CI/CD workflow.

### FR9: Automated Testing

The project must include:

- Backend unit tests.
- Backend integration tests.
- Frontend tests.
- Tests for successful prediction requests.
- Tests for invalid inputs.
- Tests for prediction API failures.
- Tests for error handling.

### FR10: CI/CD

GitHub Actions must:

- Run automated tests on pull requests.
- Prevent deployment when required checks fail.
- Support deployment after approved changes are merged into the main branch.

## 5. Non-Functional Requirements

### NFR1: Reliability
The backend must handle prediction service failures gracefully.

### NFR2: Maintainability
The codebase must use modular components with clearly separated responsibilities.

### NFR3: Security
- Secrets must be stored in environment variables.
- `.env` must not be committed.
- The application must avoid collecting unnecessary personal information.
- API errors must not expose secrets or internal implementation details.

### NFR4: Performance
The backend should minimize unnecessary processing and use configurable request timeouts when communicating with the prediction API.

### NFR5: Usability
The frontend must provide clear labels, input guidance, loading indicators, and understandable error messages.

## 6. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Backend | FastAPI |
| Prediction service | Existing diabetes risk prediction FastAPI API |
| Machine learning | Scikit-learn |
| Monitoring | Prometheus |
| Dashboards | Grafana |
| Responder | Python |
| Containerization | Docker |
| Service orchestration | Docker Compose |
| Testing | Pytest and frontend testing tools |
| CI/CD | GitHub Actions |
| Version control | Git and GitHub |

## 7. Environment Configuration

The application must use environment variables for service configuration.

Initial configuration:

- `MODEL_API_URL`: URL of the deployed diabetes risk prediction API.
- `MODEL_API_TIMEOUT`: Maximum time allowed for prediction requests.
- `BACKEND_PORT`: Backend service port.
- `FRONTEND_PORT`: Frontend service port.

An `.env.example` file must document the required variables without containing secrets.

## 8. Acceptance Criteria

The MVP will be considered complete when:

- [ ] A user can access the React application.
- [ ] A user can submit valid prediction inputs.
- [ ] BMI can be calculated from height and weight or entered directly.
- [ ] When BMI is unavailable, the backend omits the `bmi` field; the verified model API accepts this request and applies its existing preprocessing.
- [ ] Invalid inputs are rejected with understandable messages.
- [ ] The backend successfully communicates with the diabetes risk prediction API.
- [ ] The prediction result is displayed correctly.
- [ ] Prediction API failures are handled gracefully.
- [ ] Prometheus successfully collects backend metrics.
- [ ] Grafana displays the monitoring metrics.
- [ ] Configured alert rules trigger when their conditions are met.
- [ ] The manually invoked responder agent can summarize a supplied, redacted alert and propose a local fix for human approval without changing production.
- [ ] Docker Compose can run the application services.
- [ ] Automated tests pass.
- [ ] GitHub Actions successfully runs the CI workflow.
- [ ] The application is deployed and accessible.

## 10. Project Development Phases

| Phase | Deliverable |
|---|---|
| 1 | Project setup and specification |
| 2 | FastAPI backend and diabetes risk prediction API integration |
| 3 | React frontend |
| 4 | Backend and frontend testing |
| 5 | Docker and Docker Compose |
| 6 | Prometheus and Grafana monitoring |
| 7 | Alert rules and responder agent |
| 8 | GitHub Actions CI/CD |
| 9 | Cloud deployment and final documentation |

## 11. Medical Disclaimer

This application is an educational software project that demonstrates machine learning API integration and application monitoring.

Its underlying model identifies patterns associated with self-reported diabetes status in the BRFSS survey data. Its output does not establish a medical diagnosis, determine an individual's clinical risk, or predict future diabetes development.

Users should consult qualified healthcare professionals and undergo appropriate laboratory testing for medical evaluation.
