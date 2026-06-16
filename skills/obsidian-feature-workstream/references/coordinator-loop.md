# Coordinator Loop

Keep coordination calm. The coordinator should preserve context, not become a noisy status bot.

## Status Record

Track each worker or parallel chat with:

- `id`
- `role`
- `scope`
- `status`: queued, running, blocked, needs-input, reviewing, succeeded, failed, cancelled
- `phase`
- `current_action`
- `updated_at`
- `artifacts_or_files`
- `blockers`
- `risks`
- `next_action`
- `confidence`: low, medium, high
- `escalation_required`

## Polling Cadence

- First routine check: 2 to 3 minutes after launch.
- Normal active polling: about every 5 minutes.
- Stable backoff: 10 to 15 minutes after two unchanged checks.
- Long-work heartbeat: at phase changes or every 10 to 15 minutes.
- Immediate check: only when the user asks, a blocker appears, a worker finishes, or a sensitive action needs review.

## User Updates

Send user-visible updates only for:

- meaningful phase change
- new blocker
- finished worker
- conflicting findings
- user-requested status
- routine 5 to 15 minute summary during long coordination

Avoid pasting worker logs. Summarize at most: status, evidence, blockers, changed files, next action, confidence.

## Escalation Triggers

Escalate when:

- two expected heartbeats are missed
- a worker needs secrets, production access, or sensitive side effects
- same-file, branch, or worktree collision appears
- workers disagree on facts or direction
- product direction or scope is ambiguous
- verification repeatedly fails
- token/cost usage expands without clear progress
- a worker proposes changing docs or code outside its scope

## Redirect, Pause, Stop

Redirect when:

- a worker drifts from the original goal, branch, source of truth, or owned files
- a worker starts solving adjacent problems without approval
- implementation follows stale docs after newer vault/OpenSpec/code evidence appears
- a worker misses required verification but is otherwise recoverable

Pause when:

- user approval is needed
- product direction is ambiguous
- secrets, customer data, production credentials, package publish, deployment, migration, or destructive action is involved
- two workers disagree on a contract, API, schema, rollout, or source of truth
- a task discovers new information that may change the plan materially

Stop when:

- a worker repeatedly ignores scope
- a worker risks destructive or sensitive action without approval
- repeated failures show the current plan is wrong
- work cannot continue without external input or state change

When redirecting, quote the original goal or source-of-truth line, state the drift, and give the next bounded action.

## Interesting Findings

Do not bury useful surprises, but do not let them hijack the current task.

Route findings like this:

- Cross-cutting product, architecture, package, or rollout implications -> coordinator.
- Repo-local implementation detail -> owning repo worker.
- Durable decision, lesson, incident, or future capability -> vault note or workstream board.
- Security, customer-data, secret, production, or compliance concern -> coordinator and user.
- Test flake, tooling issue, or local environment problem -> owning worker unless it blocks everyone.
- Nice-to-have refactor or adjacent idea -> follow-up card, not current scope.

If a finding changes safety or correctness of the active plan, pause and reconcile before continuing.

## Integration Pass

When workers finish:

1. Read final summaries first.
2. Inspect changed files only where needed.
3. Resolve conflicts explicitly.
4. Run coordinator-level verification.
5. Update or queue vault capture.
6. Preserve unresolved items as questions or board cards.

## Security Review

Before integration or release, confirm workers did not:

- read or copy secrets without approval
- use production credentials or customer data without approval
- modify files outside scope
- push, publish, merge, open PRs, deploy, or run migrations without explicit permission
- hide unresolved source-of-truth conflicts
