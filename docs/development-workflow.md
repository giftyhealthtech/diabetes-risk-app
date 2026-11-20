
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
4. The backend `/health/live` endpoint verifies backend process health after deployment. The `/health` endpoint also checks the upstream model API and can take up to two minutes while it wakes.

The Render Blueprint uses `autoDeployTrigger: checksPass`. For services created manually, set **After CI Checks Pass** under **Settings → Auto-Deploy** in the Render Dashboard. Changes to the Blueprint do not automatically update manually managed service settings.

## On-Call Workflow

1. Monitoring detects an alert condition; automatic delivery to the responder is not configured.
2. The project lead manually invokes the workspace **On-call Responder** agent with the alert and redacted metrics/logs/trace context.
3. The agent inspects supplied evidence and repository code, then reports findings, impact, confidence, and a proposed fix.
4. The agent waits for explicit project-lead approval before editing local workspace files.
5. The project lead reviews and validates any changes through tests and the normal protected CI/CD workflow.
6. Only the project lead approves and performs production changes or deployment; unresolved or risky incidents are escalated to the project lead.
