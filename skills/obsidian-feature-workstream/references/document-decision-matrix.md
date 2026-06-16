# Document Decision Matrix

Use the smallest document set that makes the work safe and reviewable.

## Ownership

| Artifact | Default home | Use when |
| --- | --- | --- |
| Product brief | Vault | The work starts from a new idea, problem, or customer/user workflow. |
| Problem framing | Vault | The problem, user, non-goals, or success criteria are still unclear. |
| ADR | Vault | A durable decision changes architecture, ownership, data, runtime behavior, or rollout strategy. |
| HLD | Vault | The system boundary, data flow, integration flow, or cross-repo shape matters. |
| LLD | Vault | A component/repo/module needs detailed design before implementation. |
| Workstream board/dashboard | Vault | The work spans phases, repos, workers, QA, or recurring follow-up. |
| RCA/lessons | Vault | The work comes from an incident or production learning. |
| OpenSpec proposal/spec/design/tasks | Repo | A repo-local behavior/change contract helps implementation and review. |
| Superpowers design/plan/checklists | Repo or local | Execution planning, TDD, worker prompts, or verification needs a concrete checklist. |
| README/API/migration docs | Repo | Consumers need docs next to code. |

## Scenario Defaults

Fresh project:

- Start with vault product brief, problem framing, architecture seed, and decision log.
- Create repo docs after the project shape is stable.
- Use OpenSpec once repo behavior is concrete enough to specify.

Existing feature:

- Read existing vault and repo process first.
- Update vault docs when product behavior or architecture changes.
- Use OpenSpec for durable repo behavior, API, workflow, or milestone alignment.

Mature product or production-facing change:

- Require vault ADR/HLD/LLD for significant changes.
- Use OpenSpec for APIs, schemas, contracts, integrations, workflows, package boundaries, jobs, migrations, or agent workflows.
- Ask whether repo-local docs should be committed, gitignored, or local-only.

Multi-repo work:

- Vault owns cross-repo coordination, ADR/HLD/LLD, board/dashboard, and final learning.
- Each repo gets OpenSpec only if that repo's behavior changes.
- Each worker gets an implementation plan when useful.

Small bugfix/refactor:

- Skip OpenSpec by default.
- Use TDD or focused verification.
- Update vault only when the fix reveals durable learning, incident context, product behavior, or architecture risk.

Incident:

- Vault owns RCA, lessons, decision, and follow-up.
- OpenSpec only when the fix becomes a planned behavior/API/schema/workflow change.

Exploratory spike:

- Prefer vault findings and questions.
- Do not create ADR/HLD/LLD until a direction is chosen.

## Repository Artifact Policy

Ask before deciding:

- Commit OpenSpec when it is team-facing repo behavior.
- Keep Superpowers plans local or gitignored when they are execution scratch.
- Commit Superpowers plans only when the team wants implementation plans in history.
- Never demote canonical vault ADR/HLD/LLD into repo scratch docs.
