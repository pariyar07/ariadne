# Artifact Manifest Template

Use this for significant work before implementation starts. Keep it compact.

| Artifact | Owner | Path | Source of truth | Status | Commit policy | Reviewer/gate | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Product brief | Coordinator | Vault path | Vault | planned | vault-versioned | user | linked from scope hub |
| ADR | Coordinator | Vault path | Vault | planned | vault-versioned | user/tech lead | decision accepted |
| HLD | Coordinator | Vault path | Vault | planned | vault-versioned | user/tech lead | architecture reviewed |
| LLD | Repo owner | Vault path | Vault | planned | vault-versioned | repo reviewer | implementation-ready |
| OpenSpec change | Repo worker | Repo path | OpenSpec | optional | ask | repo reviewer | openspec validate |
| Implementation plan | Repo worker | Repo/local path | Superpowers or fallback | optional | ask | coordinator | plan reviewed |
| Workstream board | Coordinator | Vault path | Vault | optional | vault-versioned | user | board/dashboard linked |
| Workstream control record | Coordinator | Existing board/note/inventory path | Vault | active | vault-versioned | coordinator | marker, phase, gates, mode, and next approval are current |
| Worker leases | Coordinator | Same control record or linked worker-status artifact | Vault | optional | vault-versioned | coordinator | running workers have current heartbeat, scope, approval, and stop fields |
| Release notes / RCA / lessons | Coordinator | Vault path | Vault | later | vault-versioned | user | final review |
| Interesting finding / follow-up | Coordinator or worker | Vault board/note path | Vault | optional | vault-versioned | coordinator | routed or explicitly skipped |

## Status Values

- proposed
- planned
- in-progress
- blocked
- reviewing
- accepted
- complete
- skipped

## Source Of Truth Rules

- Vault owns product, architecture, decisions, and post-work learning.
- OpenSpec owns repo-local behavior deltas when used.
- Superpowers or fallback plans own execution details.
- Code and tests own final implementation behavior.

If two artifacts disagree, pause and reconcile before continuing.

## Workstream Control Record

Use this when the work is durable enough to have a board, dashboard, ADR, HLD, LLD, inventory, release gate, or worker set. Keep it compact and place it in the existing workstream artifact when possible.

Use one control record per active workstream. Do not treat the active feature-workstream marker as a global singleton.

For note-level artifacts, prefer frontmatter plus a `## Workstream Control Record` heading:

```yaml
---
active_skill: obsidian-feature-workstream
workstream_status: active
workstream_id:
workstream_scope:
---
```

For embedded board cards or task items, keep the same searchable keys inside the card:

```text
Workstream control record:
active_skill: obsidian-feature-workstream
workstream_status:
workstream_id:
workstream_scope:
workstream:
coordinator_thread:
phase:
lifecycle_class:
execution_mode:
execution_mode_rationale:
unresolved_gates:
worker_policy:
model_thinking_defaults:
next_verification_or_approval:
vault_capture_destination:
stop_condition:
done_condition:
pause_condition:
```

Use `workstream_status: active` while the coordinator should keep using this skill on continuation turns. Change it to `paused`, `blocked`, `complete`, or `closed` when that is the actual state.

When resuming a cold or ambiguous thread, search progressively:

```text
active_skill: obsidian-feature-workstream
workstream_status: active
workstream_status: blocked
workstream_status: paused
```

Then narrow by vault, scope, workstream id/name, coordinator thread/chat id, repo, branch, linked files, and user wording. If multiple plausible active records remain, ask the user to choose before mutating code, docs, git state, global skills, configuration, or vault records.

## Worker Leases

Use this when workers, parallel chats, routines, or subagents span turns, run in separate threads, or may need follow-up after the coordinator's current response. Same-turn read-only subagents can stay ephemeral only when no worker state needs to survive the turn.

```text
## Worker Leases

| id | runtime | thread_or_chat_ref | role | owned_scope | status | phase | last_seen_at | next_heartbeat_due | timeout_after | budget | approval_request | verification_status | done_condition | pause_condition | stop_condition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
```

Valid worker statuses: queued, running, blocked, needs-input, reviewing, succeeded, failed, cancelled.

## Worker Workstream Contract

Pass this compact contract to parallel chats, subagents, or delegated workers when persistent mode is active.

```text
active_skill: obsidian-feature-workstream
workstream_status:
workstream_id:
workstream_scope:
workstream:
goal:
phase:
execution_mode:
status_record_id:
lease_record_id:
owned_scope:
forbidden_actions:
current_gates:
heartbeat_due:
budget:
approval_boundaries:
nested_workers_allowed:
stop_condition:
return_format:
```

Do not use this contract for casual one-off tasks. Use it when the coordinator has an accepted goal and a clear implementation or investigation route.
