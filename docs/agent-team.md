
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
- Manually investigate alert context supplied by the project lead using repository code and redacted telemetry.
- Summarize verified evidence, likely operational impact, confidence, and missing information.
- Propose a minimal, reversible code fix and wait for explicit approval before editing the workspace.
- Make approved workspace changes only; request human validation through the normal tests and protected CI/CD workflow.
- Never access or modify production, deploy, roll back, commit, push, or perform automatic remediation.
- Escalate unresolved causes, sensitive-data exposure, and any production-affecting action to the project lead.

The workspace agent is defined in `.github/agents/on-call-responder.agent.md`. It is manually invoked; no Alertmanager, Grafana, or Render alert delivery integration is configured.

## Agent Collaboration Process

1. Planner defines a task and its acceptance criteria.
2. Human reviews and approves the task.
3. Relevant implementation agent completes the task.
4. QA agent verifies the implementation.
5. DevOps agent handles infrastructure changes when required.
6. Human reviews and approves merging.
7. Documentation and GitHub Projects status are updated.

GitHub Copilot may perform these roles sequentially; do not claim that separate autonomous agents exist unless they have actually been configured.
