# Coordinator Loop

Keep coordination calm. The coordinator should preserve context, not become a noisy status bot.

## Activation Gate

Use the persistent loop only when the work has an accepted goal and clear route: implementation plan, workstream board, inventory, ADR/HLD/LLD, release gate, or worker set.

Do not activate the loop for casual questions, tiny fixes, or early fuzzy ideation. Use lightweight intake first, then switch on the loop when the user accepts the goal and execution mode.

When active, the loop applies to both the coordinator and delegated workers. The coordinator keeps the control record; workers receive a compact workstream contract and report back instead of inventing a separate lifecycle.

## Loop Primitives

Treat each delegated worker or parallel chat as a leased execution slot:

- objective: accepted goal, phase, and done condition
- state: control record plus per-worker lease/status record
- lease: owned scope, runtime reference, heartbeat due, timeout, budget, and final return format
- guardrails: forbidden actions, approval gates, sensitive-action checks, and verification
- handoff: explicit delegation, context injection, redirect, pause/resume, or cancellation
- termination: done, pause, stop, and budget-exhaustion conditions
- integration: summary-first review, conflict resolution, coordinator verification, and vault capture

## Status Record

Track each worker or parallel chat with:

- `id`
- `runtime`: codex-same-chat, codex-parallel-chat, claude-code-subagent, claude-agent-sdk, langgraph, autogen, other
- `thread_or_chat_ref`
- `role`
- `scope`
- `status`: queued, running, blocked, needs-input, reviewing, succeeded, failed, cancelled
- `phase`
- `current_action`
- `updated_at`
- `last_seen_at`
- `next_heartbeat_due`
- `timeout_after`
- `artifacts_or_files`
- `blockers`
- `risks`
- `next_action`
- `budget`: time, token, turn, or cost ceiling if relevant
- `approval_request`
- `verification_status`
- `done_condition`
- `pause_condition`
- `confidence`: low, medium, high
- `escalation_required`

For durable workstreams, also keep a compact workstream control record in the vault. It can live in the board, inventory, design note, or another existing workstream artifact.

Record:

- active skill and workstream name
- coordinator thread/chat id, if available
- current phase and lifecycle class
- execution mode and rationale
- unresolved gates
- worker policy and model/thinking defaults
- next verification or approval gate
- vault capture destination
- stop condition
- pause condition
- done condition

At the start of each later turn, re-check this record or reconstruct it from the latest coordinator summary before mutating code, docs, git state, global skills, or configuration.

## Loop Invariants

Every active loop needs:

- Objective: the accepted goal and current phase.
- State: control record, worker lease records, and unresolved gates.
- Guardrails: forbidden actions, approval gates, sensitive-action checks, and scope boundaries.
- Handoffs: clear delegation to a worker, or a handoff back to the coordinator when scope changes.
- Termination: stop condition, done condition, and pause condition.

If any invariant is missing, pause before mutation and repair the loop record or ask the user.

Repair once. If the coordinator still cannot identify the goal, phase, gate, lease owner, or stop condition after one repair attempt, stop mutation and ask the user to choose the next route.

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

## Runtime Adapter Map

- Codex same chat: coordinator does the work directly; keep the control record in the vault or final summary when the work is durable.
- Codex parallel chat: when the user explicitly requests or permits parallel agents, coordinator acts as supervisor; each chat gets a worker contract, lease fields, heartbeat expectation, and summary-only return.
- Claude Code subagent: use the same worker contract as the subagent prompt; rely on isolated context and require concise final synthesis.
- Claude Agent SDK subagent: map the worker contract to agent instructions, tools, handoffs, and approval boundaries.
- LangGraph: map the control record to graph state/checkpointer, approval gates to interrupts, redirects to commands, and workers to nodes/subgraphs.
- AutoGen: map the coordinator to the team manager, workers to team agents, lease limits to termination conditions, and user approval to a human/user proxy.

Keep the public skill runtime-agnostic. Use this map only to translate the same Ariadne contract into the runtime the user is actually using.

Do not rely on a per-chat agent instruction file for active state. Codex and Claude Code may use global/project instruction files and temporary override or hook mechanisms, but the portable pattern is: stable norms in global/project files, active workstream state in the control record, and delegated one-off behavior in the worker prompt or subagent configuration.

## Supervisor Actions

The coordinator may:

- inject missing context or a fresher source of truth
- redirect a worker to a bounded next action
- pause all or part of the loop for approval, secrets, production gates, or plan-changing evidence
- stop or cancel a worker that violates scope, burns budget, or risks unsafe action
- split work into new workers when ownership is independent and clear
- merge or serialize work when collisions, shared state, or contract coupling appear
- replan when verification or new evidence invalidates the current route
- route durable findings to the vault, board, decision log, or follow-up list

These actions should be explicit in the control record or status update when they change phase, ownership, safety, or verification.

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
- a worker lacks the active workstream contract needed to stay aligned
- the coordinator cannot identify the current phase, gate, or stop condition

## Redirect, Pause, Stop

Redirect when:

- a worker drifts from the original goal, branch, source of truth, or owned files
- a worker starts solving adjacent problems without approval
- implementation follows stale docs after newer vault/OpenSpec/code evidence appears
- a worker misses required verification but is otherwise recoverable
- a worker omits required status fields from the workstream contract

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
- the loop has no clear goal, phase, or stop condition after one repair attempt
- two heartbeat windows are missed without recoverable explanation
- the budget ceiling is reached
- verification fails in a way that changes the plan rather than the implementation detail

When redirecting, quote the original goal or source-of-truth line, state the drift, and give the next bounded action.

After stopping a worker, do not restart it on the same broad prompt. Create a fresh bounded action or ask the user/coordinator to choose the new route.

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
5. Update the workstream control record.
6. Update or queue vault capture.
7. Preserve unresolved items as questions or board cards.

## Security Review

Before integration or release, confirm workers did not:

- read or copy secrets without approval
- use production credentials or customer data without approval
- modify files outside scope
- push, publish, merge, open PRs, deploy, or run migrations without explicit permission
- hide unresolved source-of-truth conflicts
