
# Agent Team Specification

## Project Lead — Human
Responsibilities:
- Own product decisions.
- Approve architecture.
- Review changes.
- Manage priorities.
- Approve production deployments and risky remediation.

## 1. Architect / Planner Agent
Responsibilities:
- Interpret SPEC.md.
- Break requirements into tasks.
- Define interfaces and data flow.
- Identify dependencies.
- Update architecture documentation.

## 2. Backend Agent
Responsibilities:
- Implement FastAPI endpoints.
- Integrate the diabetes risk prediction API.
- Implement BMI calculation and validation.
- Write backend unit and integration tests.

## 3. Frontend Agent
Responsibilities:
- Build React components.
- Implement the prediction form.
- Implement BMI calculation interface.
- Display prediction results.
- Handle loading, validation, and API errors.
- Write frontend tests.

## 4. QA Agent
Responsibilities:
- Review acceptance criteria.
- Write and run automated tests.
- Test API integration.
- Identify regressions.
- Report test evidence.

## 5. DevOps / SRE Agent
Responsibilities:
- Configure Docker and Docker Compose.
- Configure GitHub Actions.
- Configure deployment environments.
- Implement monitoring and observability.
- Configure alerting.

## 6. On-Call Responder Agent
Responsibilities:
- Receive monitoring alerts.
- Inspect available telemetry.
- Summarize incidents.
- Identify likely causes.
- Execute approved, predefined, reversible remediation actions.
- Verify whether remediation worked.
- Escalate unresolved or risky incidents.

## Agent Collaboration Process

1. Planner defines a task and its acceptance criteria.
2. Human reviews and approves the task.
3. Relevant implementation agent completes the task.
4. QA agent verifies the implementation.
5. DevOps agent handles infrastructure changes when required.
6. Human reviews and approves merging.
7. Documentation and GitHub Projects status are updated.

GitHub Copilot may perform these roles sequentially; do not claim that separate autonomous agents exist unless they have actually been configured.
