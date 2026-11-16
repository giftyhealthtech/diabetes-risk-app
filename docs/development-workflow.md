
# Development Workflow

## Task Lifecycle

Backlog → Ready → In Progress → In Review → Testing → Done

## Rules

- Every feature must have a GitHub issue.
- Every issue must include acceptance criteria.
- Copilot must reference the relevant issue while working.
- Large tasks must be divided into smaller tasks.
- Implementation must include tests.
- A task cannot be marked Done until its acceptance criteria are verified.

## Git Workflow

- `main`: production-ready code.
- `develop`: integration and development.
- `feature/*`: individual feature branches.
- `fix/*`: bug-fix branches.

Use pull requests for merging changes.

## Deployment Workflow

1. Pull requests targeting `main` run backend tests, frontend lint/tests/build, and Docker image builds through GitHub Actions.
2. Protect `main` with required CI checks and review approval; only approved, passing changes may merge.
3. Render deploys changes from its linked `main` branch after all CI checks pass.
4. The backend `/health` endpoint verifies backend service health after deployment.

The Render Blueprint uses `autoDeployTrigger: checksPass`. For services created manually, set **After CI Checks Pass** under **Settings → Auto-Deploy** in the Render Dashboard. Changes to the Blueprint do not automatically update manually managed service settings.

## On-Call Workflow

1. Monitoring detects an alert condition.
2. Alert is delivered to the responder agent.
3. Agent inspects logs, metrics, and traces.
4. Agent summarizes the incident.
5. Agent performs only predefined safe remediation actions.
6. Agent verifies recovery or escalates to the human project lead.
