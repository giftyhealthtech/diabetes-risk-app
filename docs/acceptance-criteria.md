# Acceptance Criteria and Assessment Mapping

## 1. Project acceptance criteria

The MVP is complete only when all of the following are satisfied:

- [ ] The React frontend is accessible and usable.
- [ ] The user can submit valid prediction inputs.
- [ ] BMI can be calculated from height and weight or entered directly.
- [ ] The app does not send missing BMI to the diabetes-risk prediction API until the external API supports nullable BMI and continues to use the model’s existing fitted median imputer.
- [ ] Invalid inputs are rejected with clear feedback.
- [ ] The backend validates requests before sending them to the model API.
- [ ] The backend successfully communicates with the deployed diabetes-risk prediction API.
- [ ] The prediction result is displayed to the user correctly.
- [ ] Prediction API failures are handled gracefully.
- [ ] Prometheus exposes bounded HTTP and prediction API request counts and durations at `/metrics`.
- [ ] Backend request logs are structured JSON with trace IDs and do not contain submitted health information.
- [ ] OpenTelemetry traces cover FastAPI requests and outbound prediction API calls and can be exported through OTLP/HTTP.
- [ ] Grafana dashboards display the correct monitoring views.
- [ ] Alert rules can detect service degradation and availability issues.
- [ ] The manually invoked responder agent summarizes supplied, redacted alert evidence, assesses impact, and proposes a minimal fix for explicit human approval; it cannot change production.
- [ ] Docker Compose runs the local stack successfully.
- [ ] Automated tests pass through a single documented command.
- [ ] GitHub Actions runs backend/frontend checks and builds both containers for pull requests to `main`; Render deploys `main` only after CI checks pass.
- [ ] The application is deployable and the release process is documented.

## 2. Assessment rubric mapping

| Assessment area | Evidence in the plan |
|---|---|
| Problem description | Project overview and objective statements in SPEC |
| Product specification | Updated SPEC and architecture narrative |
| Agent team | docs/agent-team.md and issue ownership boundaries |
| Context management | Issue-based milestones and documentation control |
| Full-stack application | Frontend, backend, and app flow |
| Testing | Unit, integration, frontend, and API tests |
| Containerization | Docker Compose and local orchestrated stack |
| Deployment | Deployment readiness stage |
| CI/CD | GitHub Actions gating and release workflow |
| Observability | Metrics, logs, traces, and Grafana |
| Alerting | Prometheus alert rules and incident workflow |
| On-call agent | Responder agent summarization and escalation workflow |

## 3. Risk gate

The project must stop before broad implementation if any of the following remain unresolved:

- The external model API contract remains unverified.
- The BMI handling policy conflicts with the model’s contract.
- The observability and alerting flow is not separated from app logic.

## 4. Approval condition

Proceed to implementation only after the revised architecture, persistence plan, and BMI policy are approved by the project lead.
