---
name: ariadne:closeout
description: Close or checkpoint meaningful completed work in an agent-maintained Obsidian vault. Use when the user asks to run Ariadne closeout, make work durable, close the loop, checkpoint this work, capture the outcome, decide whether a chat can close, draft a handoff, or update vault memory after incidents, releases, evaluations, feature work, architecture/product decisions, research sprints, or substantial planning sessions.
---

# Ariadne Closeout

## Overview

Use this skill at the end of a meaningful work unit, or at a checkpoint inside a larger chat, to decide what should survive in the vault and whether the chat can safely close or continue.

Closeout is a thin orchestration skill. It decides whether to use existing Ariadne skills, what artifact shape fits the work, and what safety gates apply. It does not create new default folders, templates, or board systems by itself.

## Modes

- Assess only: read-only. Determine completion state, likely vault/scope, recommended artifacts, follow-ups, and safe-to-close status. Do not write, stage, commit, push, or run mutating cleanup.
- Lightweight closeout: for small but meaningful work. Prefer one existing-note update, one board card update, or one short output.
- Full closeout: for incidents, production behavior changes, releases, evaluations, significant feature work, architecture/product decisions, or durable planning.
- Checkpoint: for a completed work unit inside a longer chat. Update the same durable docs when the work belongs to the same thread; create new docs only for a distinct decision, evidence source, verification event, incident, release, or follow-up stream.

Handoff is an output flag, not a mode. Include a handoff or team update when another person, agent, or future session needs a concise current-state message.

## Start

1. Classify the request mode and whether a handoff output is needed.
2. Reconstruct the completed work: goal, actions, changed files or PRs, decisions, verification, evidence, unresolved risks, and next actions.
3. Decide whether durable capture is warranted. If not, explain why and end with a closeout verdict.
4. Use registered vault discovery when the target vault is not explicit.
5. In a multi-scope vault, require a current-turn explicit target before the first write-producing closeout. A target is explicit only when the current prompt names the scope, domain, customer, project, or workstream, or the user confirms one after being asked.
6. For later checkpoints in the same chat, reuse the previously confirmed target only when you restate the vault/scope and the new work still belongs to the same thread. Any scope, vault, artifact class, or workstream drift re-triggers confirmation.
7. Read the selected vault and scope entrypoints: root `AGENTS.md`, root index, agent navigation, task routing matrix, local `AGENTS.md`, local hub, and relevant existing notes. For repeat checkpoints, cheaply re-verify the cached route unless the target changed.

Do not scan the whole vault by default. Prefer hubs, indexes, decisions, boards, and synthesis notes over raw sources.

## Artifact Decision Tree

Choose artifacts from the shape of the completed work, not from a fixed checklist.

Use artifact count discipline:

1. Prefer no durable capture when nothing reusable was created.
2. Prefer updating one existing canonical note over creating a new note.
3. Prefer one new note over multiple notes.
4. Use multiple artifacts only when each has a distinct job.
5. More than three artifacts requires briefly stating why each earns its existence.

Common choices:

- No durable capture: use for trivial, self-contained work with no decision, reusable learning, follow-up, or verification burden. If the user explicitly asks to capture the outcome, use the lightest durable form.
- Existing note update: use when the work advances an existing decision, product plan, release, incident thread, or workstream note.
- Decision note: use for accepted product, architecture, process, scope, naming, release, safety, or implementation commitments. Separate context, options, rationale, consequences, and evidence links.
- RCA or incident content: use for failures, outages, regressions, production-relevant errors, security concerns, production/preprod issues, data drift, or substantial debugging lessons. Capture symptom, cause, impact, fix, verification, prevention, and follow-ups inside the nearest existing local convention.
- Verification content: use for manual QA, preprod/prod validation, migrations, dry-runs, evals, or environment-specific proof. Capture what was checked, where, when, result, evidence pointer, and residual risk. Create a standalone note only when the scope already has that convention or the proof needs its own route.
- Raw source note: use only when the source itself must be inspectable later, such as a review thread, external report, transcript, user artifact, evaluation transcript, or important incident excerpt. For review threads, command output, PRs, and eval transcripts, save pointers and short excerpts by default; store the full raw source only when the user asks or the source itself must be independently inspectable later.
- Processing item or question: use for follow-up, ambiguity, research, monitoring, cleanup, or risk that should not block closing the current chat.
- Board or dashboard update: use when a recurring workstream already tracks this work. Do not create a board just because a closeout happened.
- Achievement or impact content: use only when the selected vault already has an achievement, impact, milestone, release, customer-evidence, or progress convention.
- Output or team update: use for a handoff, stakeholder update, release note draft, or teammate message. Apply the same evidence and sensitivity rules to handoff text. Store it only when it should be reused later.

## Evidence Policy

Save evidence by exception, not by default.

Save durable evidence when it is needed to audit or reproduce an incident, explain a decision, prove verification, preserve a hard-to-rediscover source, separate source claims from interpretation, or support an impact or communication record.

Prefer pointers over bulky captures. Every pointer must include what it proved, such as:

- PR number or URL, commit hash, release tag, deployment, issue, run ID, command, timestamped environment check, plus a one-line "what this proves".
- Short excerpts only when exact detail matters.
- Summaries of command output unless exact output is needed for future debugging.

Do not save full raw logs, secrets, tokens, credentials, customer data, private production payloads, sensitive screenshots, noisy terminal transcripts, or duplicate copies of repo code/docs that already live canonically elsewhere. If evidence is useful but sensitive, record a redacted pointer and what it proved.

## Safety Gates

Before any write:

- Confirm the vault and target scope are explicit enough for a write-producing closeout.
- Snapshot `git status --short` if the selected vault is git-backed.
- Preserve unrelated dirty changes and do not revert user work.
- Keep source evidence, interpretation, decisions, and generated outputs distinct.

Before staging or committing in a git-backed vault:

- Commit only when the user explicitly requests it in the current session.
- Verify the git root is the intended vault root, not a nested repo.
- Abort on detached HEAD.
- Abort if the index already contains unrelated staged changes.
- Identify closeout-created or closeout-modified paths.
- Stage explicit paths only. Never use `git add -A` or `git add .`.
- Scan closeout-owned files for secrets, tokens, credentials, private production payloads, and sensitive customer identifiers before staging. Abort and report if found.

Push only when the user explicitly asks to push or sync in the current session, the commit contains only closeout-owned files, branch and remote are clear, no unrelated dirty files are staged, and the repo is not on detached HEAD.

Hedged phrasing such as "commit/push if needed", "as appropriate", or "if you think so" is not sufficient authorization to push. Treat it as permission to assess whether git action would be useful, then ask for explicit current-session confirmation before pushing.

For non-git vaults, update docs only when explicitly targeted and report that commit/push is unavailable.

## Companion Skills

- Use `ariadne:global-discovery` when vault selection starts from the machine registry.
- Use `ariadne:knowledge-capture` when new raw material or a user artifact needs compilation.
- Use `ariadne:synthesis` when closeout updates multi-source understanding or a thread hub.
- Use `ariadne:workstream-tracking` when board or dashboard state needs updating.
- Use `ariadne:maintenance` when closeout finds stale queues, broken navigation, or health drift.
- Use `ariadne:navigation` when new routes, hubs, or indexes are needed for discoverability.
- Use `ariadne:validator` after structural link, hub, Base, or routing changes when practical.

## Subagents

Do not use subagents by default.

Use read-only subagents only when the closeout would bloat the main task context, independent audit surfaces exist, a large incident or production change needs a second pass, or a long chat needs checkpoint audit without losing forward-working context.

Subagents should return summaries and pointers, not raw logs or bulky transcripts. The main agent owns artifact selection, edits, validation, staging, committing, pushing, and the final safe-to-close judgment. Do not allow concurrent vault edits.

## End Output

End every closeout with:

- `safe to close`: yes, no, or conditional
- for checkpoints, `safe to continue`: yes, no, or conditional
- completion status
- selected vault and scope
- artifacts created or updated
- evidence policy used, including intentionally unsaved evidence
- what is durable and what still exists only in chat
- validation result or why validation was skipped
- unresolved follow-ups
- git status: not git-backed, not requested, committed, pushed, or blocked
- concise handoff or team update when useful
