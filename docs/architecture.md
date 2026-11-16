# Architecture and Milestone Plan

## 1. Revised architecture decisions

The project plan retains the original assessment scope but updates the BMI decision as follows:

- The app still integrates with the external diabetes-risk prediction API without changing the trained model.
- BMI can be derived from height and weight or entered directly.
- Missing BMI is not sent to the external diabetes-risk prediction API until the API explicitly supports it and continues to rely on its fitted median imputation.

## 2. System context

The app remains a full-stack system with a React frontend, a FastAPI backend, the external model API dependency, and monitoring/operations services.

### Request and data flow

1. User enters prediction inputs in the React frontend.
2. The frontend validates client-side data and optionally computes BMI from height and weight.
3. The FastAPI backend validates payloads again and checks the external model contract before forwarding requests.
4. The backend sends a request to the external diabetes-risk prediction API only if the payload is valid under the current contract.
5. The model returns a prediction response that the backend preserves and relays to the frontend.
6. Prometheus collects backend metrics and Grafana displays them. Alert rules can identify conditions; the initial responder is manually invoked with the alert and redacted telemetry because automatic alert delivery is not configured.

## 3. BMI handling policy

The application must support the following BMI workflow:

- Height and weight input to compute BMI automatically.
- Direct BMI input when the user already knows the value.
- Missing BMI is not sent to the external model until the external API contract explicitly supports nullable BMI and the model’s median imputation logic remains the authoritative source.

This preserves the requirement that the application must not compute or replace the model’s own median imputer.

## 5. Issue plan and state

The project retains the existing 12 GitHub issues and updates them rather than creating duplicates. The updated issue set remains aligned with the original implementation lifecycle and the revised BMI decisions.

### Issue 1 — Confirm external prediction contract and BMI handling
- Verify the live model API request schema, response contract, and BMI rules.
- Dependency: none.

### Issue 2 — Scaffold backend and validation foundation
- Create the FastAPI app shell, validation structure, and request boundary to the external API.
- Dependency: Issue 1.

### Issue 3 — Create FastAPI prediction integration and error handling
- Implement the client call, timeout strategy, and error handling for external model failures.
- Dependency: Issue 2.

### Issue 4 — Build React prediction form with BMI workflow
- Add the prediction form, direct BMI input, height and weight calculation, and clear user feedback.
- Dependency: Issues 1 and 2.

### Issue 5 — Add Docker Compose orchestration
- Bring up the app stack locally with service startup, health checks, and environment configuration.
- Dependency: Issue 2.

### Issue 6 — Add observability with metrics, logs, and traces
- Expose metrics, structured JSON logs, and OpenTelemetry traces.
- Dependency: Issue 2.

### Issue 7 — Configure Grafana dashboards
- Add Grafana views for service availability, latency, and health.
- Dependency: Issue 6.

### Issue 8 — Configure Prometheus alerting
- Add alert rules for error rate, latency, and service unavailability.
- Dependency: Issues 6 and 7.

### Issue 9 — Implement responder agent summarization
- Add a manually invoked responder agent that summarizes supplied alert evidence and proposes reviewable code fixes only after explicit human approval.
- Do not allow production access, deployment, rollback, or automatic remediation.
- Dependency: Issue 8.

### Issue 10 — Add GitHub Actions CI and deployment checks
- Configure CI, pull-request validation, and deployment gating.
- Dependency: Issues 2, 4, 5, 6, and 8.

### Issue 11 — Validate end-to-end release and operational readiness
- Run end-to-end validation, release checks, and readiness review before sign-off.
- Dependency: Issues 5 through 10.

### Issue 12 — Finalize documentation and project sign-off
- Confirm the architecture, assumptions, and operational policy before implementation approval.
- Dependency: Issues 1 through 11.

## 6. Implementation milestones

### Milestone 1 — Contract verification and project foundation
- Confirm the external model API contract.
- Validate current BMI handling requirements.
- Document the architecture and risk boundaries.
- Establish the initial repo structure and test scaffolding.

### Milestone 2 — Backend contract and integration layer
- Add FastAPI structure and validation.
- Implement model API client logic safely.
- Add error handling and timeout policy.
- Add backend unit and integration tests.

### Milestone 3 — Frontend prediction workflow
- Add form fields and validation.
- Implement BMI calculation and direct BMI input.
- Show results and disclaimers clearly.
- Add frontend tests.

### Milestone 4 — Containerization and local orchestration
- Add Docker Compose stack.
- Configure service startup order and environment values.
- Verify local readiness.

### Milestone 5 — Observability
- Expose bounded Prometheus HTTP and prediction API request/duration metrics.
- Instrument FastAPI and outbound HTTPX requests with OpenTelemetry; export spans through an optional OTLP/HTTP collector endpoint.
- Emit JSON request logs with trace IDs and route/status/timing fields, without request data or health inputs.
- Disable FastAPI's built-in telemetry in favor of privacy-safe request spans that omit query strings and payloads.
- Add Grafana dashboards.

### Milestone 6 — Alerting and responder flow
- Add alert rules and thresholds.
- Create responder summarization workflow.
- Verify incident handling procedure.

### Milestone 7 — CI/CD and deployment readiness
- Run backend, frontend, and container checks with GitHub Actions on pull requests to `main`.
- Require review approval and passing checks before merging to `main`.
- Configure Render to deploy only after CI checks pass, then verify backend health.

### Milestone 8 — Final documentation and release sign-off
- Confirm the architecture and all acceptance criteria before implementation approval.

## 7. Assessment-rubric mapping

| Assessment criterion | Coverage in plan |
|---|---|
| Problem description | Milestone 1, architecture overview |
| Product specification | SPEC and issue set |
| Agent team | docs/agent-team.md and role boundaries |
| Context management | Issue-based scope and documentation |
| Full-stack application | Milestones 2, 3, 4 |
| Testing | Milestones 2, 3, 4, 6, 7 |
| Containerization | Milestone 4 |
| Deployment | Milestone 7 |
| CI/CD | Milestone 7 |
| Observability | Milestone 5 |
| Alerting | Milestone 6 |
| On-call agent | Milestone 6 |

## 8. Technical risks and mitigations

### Risk: external BMI contract mismatch
Mitigation: verify the model API contract before sending any BMI payload. Do not send missing BMI until the service explicitly supports it.

### Risk: contract drift in the model API
Mitigation: maintain a contract verification checkpoint at the start of each milestone and validate request shape in tests.

### Risk: operational alert noise
Mitigation: use thresholds that are meaningful and keep the responder workflow advisory only.

## 9. Recommendation

The revised plan should begin with Milestone 1 and then proceed through the backend and frontend milestones without broadening scope. This keeps the project aligned with the verified external API contract and the corrected BMI policy while preserving all other rubric criteria.
