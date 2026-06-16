---
name: obsidian-feature-workstream
description: Use when ideating, planning, implementing, coordinating, or reviewing important product, architecture, integration, multi-repo, production-facing, API/contract, agent workflow, or feature work from an Ariadne/Obsidian vault context.
---

# Obsidian Feature Workstream

Use this skill to route significant feature work through an Ariadne-backed Obsidian vault without turning every task into heavyweight process.

The vault is canonical for durable product, architecture, decision, and learning knowledge. Repo-local systems such as OpenSpec and Superpowers may create working artifacts, but they do not replace vault ADRs, HLDs, LLDs, workstream notes, or post-work learning when those are needed.

## Core Rule

Choose the smallest safe lifecycle for the work.

Small fixes should stay light. Mature, production-facing, multi-repo, contract, schema, integration, package-boundary, or agent-workflow changes need explicit vault context, artifact ownership, and verification gates.

## Start

1. Classify the work:
   - fresh project
   - existing product feature
   - mature product or production-facing change
   - multi-repo change
   - API, schema, contract, package-boundary, or integration change
   - incident or production learning
   - exploratory spike
   - small bugfix or refactor
2. Check whether an existing repo or vault process overrides this workflow.
3. Confirm the explicit vault target before writing in a multi-scope vault.
4. Enter the smallest relevant Ariadne vault scope before creating artifacts.
5. Ask only missing high-signal questions.
6. Tell the user what docs or workstream artifacts are likely needed before creating them.

Do not scan a whole vault by default. Follow Ariadne discovery: registry, `00 Index.md`, `AGENTS.md` or `CLAUDE.md`, `Agent/00 Agent Navigation.md`, routing matrix, then local hubs and targeted search.

## Global Discovery Boundary

When a thread starts outside a vault, use the Ariadne global registry and marker-managed agent-file blocks only as discovery signposts. They should point to `~/.ariadne/vaults.md`; they should not duplicate this skill's lifecycle, loop, worker, or phase-gate rules.

If global discovery is missing or stale, use `obsidian-vault-discovery` to inspect or repair it before relying on vault context. Repairing global agent files requires explicit approval because those files may contain user-maintained instructions outside Ariadne markers.

Do not require every global `AGENTS.md`, `CLAUDE.md`, or adapter file to contain feature-workstream details. The detailed behavior belongs here, in the selected vault's local instructions, and in the active workstream control record.

Do not assume Codex or Claude Code has a per-chat `AGENTS.md` or `CLAUDE.md` that is reloaded every turn. Use global/project instruction files for stable discovery and norms, this skill for reusable lifecycle behavior, the workstream control record for active state, and worker prompts or subagent configs for one-off delegated behavior.

## Required Questions

Ask these only when the answer is not already clear:

- Is this a fresh project, existing feature, mature product change, incident, or exploratory spike?
- Is the vault the canonical home for ADR, HLD, LLD, and durable decisions?
- Does an existing vault, repo, RFC, OpenSpec, issue, or team process override the default?
- Are Ariadne, OpenSpec, and Superpowers available, or should the agent use fallback prompts / help install them?
- Should repo-local OpenSpec or Superpowers artifacts be committed, gitignored, or kept local-only?
- For parallel chats or worker agents, what model and thinking capability should workers use?

## Tool Availability

Do not assume optional tools are installed.

- If Ariadne is unavailable, offer to install it or continue with a lightweight Markdown fallback.
- If OpenSpec is unavailable and the task warrants it, explain briefly that it is optional for repo-local change contracts and ask whether to install/init or skip.
- If Superpowers is unavailable, explain briefly that it is useful for brainstorming, planning, TDD, debugging, and verification, then ask whether to install or use fallback checklists.

Keep installation UX short. Give only the commands relevant to the user's runtime and ask before installing.

See `references/installation-and-artifact-policy.md`.

## Document Ownership

Use this default split:

- Vault: product brief, problem framing, ADR, HLD, LLD, cross-repo coordination, workstream board/dashboard, RCA, lessons, post-implementation learning, and links to repo artifacts.
- OpenSpec: repo-local proposal, behavior/spec deltas, design, task list, and archived accepted repo behavior.
- Superpowers: brainstorming design spec, implementation plan, TDD checklist, verification notes, and worker handoff prompts.
- Repo docs: README, package/API usage docs, migration guide, generated reference docs, or team-required docs that need to live next to code.

See `references/document-decision-matrix.md` before creating non-trivial docs.

Precedence rule:

1. Vault decisions and ADR/HLD/LLD own durable intent and architecture.
2. OpenSpec owns repo-local behavior/change contracts.
3. Superpowers owns execution planning and verification.
4. Code and tests own final implementation truth.

If these disagree, stop and align the source of truth before implementing.

## Artifact Manifest

For significant work, maintain a compact artifact manifest before dispatching implementation:

- artifact
- owner
- path
- source of truth
- status
- commit policy
- reviewer or approval gate
- verification

See `references/artifact-manifest-template.md`.

## Execution Mode

Pick the lightest execution mode that keeps ownership clear:

- Same chat: small or medium sequential work.
- Same chat with subagents: independent research, codebase exploration, audits, or verification.
- Parallel chats: large multi-repo or independent project surfaces.
- Worktrees: parallel same-repo edits that might otherwise collide.
- Automation or routine: recurring status checks, stale-worker detection, CI/watch loops, or follow-up.

For parallel chats or workers, ask for model and thinking capability before launch unless the user has already set a default. Give every worker a clear scope, allowed files or responsibility, forbidden actions, verification command, and stop condition.

See `references/worker-prompt-template.md`.

Use predictable names:

- thread/chat: `<workstream>: <repo-or-scope> <role>`
- branch/worktree: use the repo's naming convention, avoid runtime-branded prefixes unless the user asks
- worker docs: put repo-local plans where the repo or user policy expects them

## Active Workstream State

Activate persistent workstream mode only when the task is important enough and the direction is clear enough to benefit from continuity: durable feature, architecture, integration, production, API/schema, package-boundary, multi-repo, or agent-workflow work with an accepted goal, implementation plan, board, inventory, or explicit next gate.

Do not activate it for casual questions, early fuzzy ideation, tiny fixes, or exploratory reading. In those cases, use lightweight intake or planning first, then activate persistent mode after the user accepts the goal and route.

When activated, keep the workstream active until the user pauses, closes, or replaces it. Do not treat the skill as a one-turn planning aid.

For an active workstream, every later coordinator turn starts by treating this skill as active: use this skill, identify the current phase and gate from the control record or latest coordinator summary, then answer, delegate, or act. This applies to status questions, "what next" prompts, planning, and implementation; do not wait for the user to re-name the skill.

Because runtimes may load global/project instruction files at session start rather than per turn, the control record is the durable continuity mechanism for active workstream state. Update it or reconstruct it from the latest coordinator summary when the phase, gate, worker set, or approval boundary changes.

Use a compact workstream control record when the work has a board, dashboard, ADR, HLD, LLD, inventory, release gate, or worker set. The record can live in the workstream note, board, inventory, or another existing vault artifact. It does not need a separate file unless the workstream needs one.

Record:

- active skill
- workstream name
- coordinator thread/chat id, if available
- current phase
- lifecycle class
- execution mode and rationale
- unresolved gates
- worker policy and model/thinking defaults, if workers are used
- next verification or approval gate
- vault capture destination
- stop condition
- pause condition
- done condition

On later turns in the same workstream, re-check the control record or reconstruct it from the latest coordinator summary before answering, delegating, or mutating code, docs, git state, global skills, or configuration. State the current phase before acting when the user asks "what next?" or resumes after a pause.

For parallel chats, subagents, or workers, pass a compact workstream contract in the worker prompt: active skill, workstream name, goal, phase, execution mode, owned scope, forbidden actions, current gates, stop condition, and return format. Workers should not invent a separate lifecycle unless their delegated task becomes its own durable workstream; they should report findings back to the coordinator.

Before first code or vault mutation in mature, production-facing, multi-repo, API, schema, package-boundary, integration, or agent-workflow changes, record an execution-mode decision:

- selected mode
- why that mode is safe
- why the next-more-parallel option is not needed or not safe
- branch/worktree plan
- collision risk
- unresolved approvals
- verification gate
- stop condition

If two or more repos can proceed independently after the current gate, prefer proposing parallel read-only inventory or worker implementation when the user and runtime permit it. In runtimes such as Codex where subagents require an explicit user request, do not silently spawn workers; record the parallelization recommendation and ask or wait for permission. Same-chat multi-repo implementation is allowed only when dependency order, shared-state risk, or contract coupling makes it safer, and that reason is recorded. Keep package publish, deploy, migration, merge, production access, and customer-data gates coordinator-owned.

Treat the loop as stateful orchestration: clear delegation, bounded context, guardrails before sensitive actions, human review at approval gates, and explicit stop conditions. Tight loops are for safety and drift correction, not noisy polling.

## Coordinator Boundary

The coordinator owns:

- process selection
- vault and repo context discovery
- artifact manifest
- branch/worktree coordination
- worker prompts
- compact status loop
- conflict resolution
- final synthesis
- verification gate
- vault capture decision

The coordinator should not:

- implement deep code while a worker owns that scope
- copy raw worker logs into the main context
- allow same-file collisions without explicit ownership
- hide worker disagreements
- create competing docs when a vault or repo process already exists

## Worker Boundary

Each worker or parallel chat gets a leased scope, not an open-ended mandate:

- active workstream contract, when persistent mode is active
- task goal, repo/vault path, branch/worktree, and owned scope
- required tools or skills
- heartbeat, budget, approval boundaries, and stop condition
- forbidden actions and files not to edit
- expected verification
- expected final return format

Workers should return status, phase, changed files/artifacts, verification, key evidence, blockers, risks, approval needs, remaining gates, next action, and confidence.

## Coordinator Loop

Keep the loop calm and sparse.

- First routine check: after 2 to 3 minutes.
- Normal polling: about every 5 minutes while active.
- Stable backoff: 10 to 15 minutes after two unchanged checks.
- Long-work heartbeat: phase changes or every 10 to 15 minutes.
- User-visible updates: meaningful change, blocker, user request, or routine 5 to 15 minute cadence.

Treat each worker or parallel chat as a leased execution slot with owned scope, heartbeat, budget, approval boundaries, verification, and stop condition. Read `references/coordinator-loop.md` before launching long-running workers, parallel chats, or multi-runtime coordination.

Escalate when a worker needs secrets, production access, sensitive side effects, same-file collision resolution, product direction, repeated verification failure, or has missed two expected heartbeats.

The loop is also a control system:

- inject missing context or updated source-of-truth evidence when a worker is operating from stale assumptions
- redirect workers that drift from the agreed scope, source of truth, branch, or verification plan
- pause work when the next step depends on user approval, product direction, secrets, production access, or conflict resolution
- stop work when a worker repeatedly violates scope, risks destructive action, or cannot make meaningful progress
- split, merge, or serialize workers when independence, collisions, or contract coupling changes
- replan when verification or new evidence invalidates the route
- route interesting findings to the right place: coordinator for cross-cutting decisions, repo worker for implementation details, vault note or board for durable follow-up
- keep serendipitous findings as follow-up items unless they change the current plan's safety or correctness

See `references/coordinator-loop.md`.

## Scenario Routing

- Fresh project: vault product brief, problem framing, initial architecture, and decision log first; repo docs after direction stabilizes.
- Existing feature: read existing vault/repo process, then update product or architecture docs only when behavior or system shape changes.
- Mature production change: require vault ADR/HLD/LLD for significant changes and use OpenSpec when repo behavior, contracts, schemas, workflows, packages, or integrations change.
- Multi-repo feature: vault owns cross-repo coordination and durable decisions; each repo uses OpenSpec only when its behavior changes; each worker uses a repo-local implementation plan when useful.
- Small bugfix/refactor: skip OpenSpec by default; use TDD or focused verification; update vault only for durable learning.
- Incident: vault owns RCA, lessons, decisions, and follow-up; OpenSpec only if the fix becomes planned behavior change.
- Spike: keep artifacts light; prefer findings/questions in the vault; defer ADR/HLD/LLD until direction is chosen.

## Before Implementation

Before code edits:

1. Confirm the chosen lifecycle and docs with the user.
2. Confirm branch/worktree strategy.
3. Confirm repo-local artifact commit/gitignore/local-only policy.
4. Confirm OpenSpec/Superpowers use or fallback.
5. Confirm worker model/thinking settings when dispatching parallel chats.
6. Record the active workstream state and execution-mode decision when the work class requires it.
7. Resolve, move, or intentionally carry forward open gates before mutation.
8. Confirm production safety needs: feature flags, migrations, versioning, compatibility, observability, rollout, rollback, and approvals.
9. Create or update only the docs needed for this task class.

Use the phase gates in `references/phase-gates-and-rollout.md` for mature or production-facing work.

## Security And Approval Boundaries

Escalate before:

- reading, copying, or writing secrets
- using production credentials or customer data
- publishing packages
- pushing, merging, opening PRs, or deploying
- making network calls, migrations, destructive commands, or sensitive MCP actions
- changing files outside the agreed repo/vault scope

## Finish

Before claiming completion:

1. Run the smallest meaningful repo verification.
2. Validate vault structure if vault navigation or links changed.
3. Summarize code/docs touched by repo or vault scope.
4. State the vault decision: updated, queued, recommended, or not needed.
5. State whether active workstream gates remain unresolved.
6. Leave unresolved decisions visible as questions or follow-up cards.

## Related Skills

- Use `obsidian-agentic-vault` to bootstrap a new vault.
- Use `obsidian-vault-discovery` when the vault target is unclear or globally unregistered.
- Use `obsidian-scope-manager` when a new durable scope is needed.
- Use `obsidian-navigation-architect` for hub, routing, or view-layer changes.
- Use `obsidian-workstream-board` for Kanban boards and Dataview dashboards.
- Use `obsidian-ingest-compile`, `obsidian-research-ingest`, and `obsidian-research-synthesis` for raw source and research-heavy flows.
- Use Superpowers skills when available for brainstorming, writing plans, TDD, debugging, verification, and branch finishing.
