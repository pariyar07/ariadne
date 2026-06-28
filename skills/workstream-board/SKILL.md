---
name: ariadne:workstream-board
description: Create, audit, or improve Obsidian Kanban work boards and Dataview dashboards for durable project, roadmap, evaluation, implementation, QA, or recurring workstream tracking inside an agent-maintained vault.
---

# Ariadne Workstream Board

Use this skill when a user wants a visible work board, implementation board, evaluation board, roadmap board, QA board, or dashboard for an Obsidian vault scope.

This skill creates and improves Markdown-backed workstream state. Kanban and Dataview are view plugins; the durable source of truth remains Markdown tasks, links, and metadata.

## Plugin Requirements

Call out plugin requirements before creating plugin-specific views:

- Obsidian Kanban community plugin: required for drag-and-drop board rendering.
- Obsidian Dataview community plugin: required for dynamic dashboard query rendering.

Do not block the workflow when plugins are missing or unknown. The files still remain readable Markdown. Tell the user that visual Kanban or Dataview rendering needs the relevant plugin enabled in Obsidian.

## Start

1. Read the target scope hub, usually `00 Index.md` or `00 ... Index.md`.
2. Read the nearest `AGENTS.md` or `CLAUDE.md`.
3. Read `Agent/00 Agent Navigation.md` and `Agent/Task Routing Matrix.md` when present.
4. Inspect existing `Kanban/`, `Dashboards/`, `Bases/`, and relevant roadmap or implementation notes.
5. Decide whether the task is create, audit, improve, or dashboard-only.

For create, update, file, or add-tracking requests in a multi-scope vault, require a current-turn explicit target before editing. A target is explicit only when the current prompt names a scope, domain, customer, project, or workstream, or the user confirms one after the agent asks. Search hits may identify likely boards, but a single likely match, existing matching cards, prior conversation, current working directory, or active skills are not confirmation. Show the likely target with a short reason and ask before writing.

Use `ariadne:navigation` when the board requires broader scope routing or structural navigation changes.

## Board Creation

Create `Kanban/<Board Name>.md` for recurring workstream state. Use `assets/templates/Workstream Board.md` as the starting pattern.

Default columns:

| Board type | Columns |
| --- | --- |
| Implementation | Backlog, Ready, In Progress, Review / QA, Done |
| Evaluation or testing | Backlog, Ready, Running, Evidence Review, Findings, Done |
| Roadmap | Ideas, Candidate, Shaping, Ready, Done |
| QA or validation | Backlog, Ready, Running, Failed / Follow-up, Passed |

Use cards like:

```markdown
- [ ] Define eval rubric [area:: rubric] [priority:: high] [[Relevant Context]]
  - Cold-agent context: explain enough for a future agent to route and act without asking again.
```

Card rules:

- Start each card with a concrete verb.
- Add `[area:: ...]` and `[priority:: high|medium|low]` to every durable card.
- Link to the most canonical context note, not every related note.
- Add a short child bullet only when cold-agent context materially reduces ambiguity.
- Keep completed cards in `Done` unless the user prefers archival cleanup.

## Dashboard Creation

Create `Dashboards/<Board Name> Dashboard.md` only when dynamic rollups will help. Use `assets/templates/Workstream Dashboard.md` as the starting pattern.

Dashboard queries should be narrow:

- Restrict `FROM` to the relevant `Kanban/` or scope path.
- Query tasks when work cards are task lines.
- Query notes when tracking source docs, QA records, decisions, or implementation records.
- Sort by stable fields such as `priority`, `area`, `file.mtime`, or explicit dates.

Read `references/dataview-dashboard-patterns.md` before writing non-trivial Dataview queries.

## Index And Navigation Wiring

When creating the first board in a scope:

1. Create or update `Kanban/00 Kanban Index.md`.
2. Link all active boards from the index.
3. Add `Dashboards/00 Dashboards Index.md` only if dashboards exist.
4. Link active dashboards from that index.
5. Link the Kanban or Dashboard index from the scope hub when it is part of regular work.
6. Add a routing row when future agents should start from the board for a user intent.

Do not turn `00 Index.md` into a full task list. Link the board index and keep detailed status inside the board.

## Audit And Improvement

Use this mode when the user has an existing board or dashboard and asks to verify, clean up, improve, normalize, or make it more useful.

Inspect:

- frontmatter has `kanban-plugin: board`, `type: kanban`, status, title, and tags
- columns match the workstream lifecycle
- tasks have `[area:: ...]` and `[priority:: ...]`
- cards link to canonical context notes
- child bullets provide useful cold-agent context when needed
- `%% kanban:settings` exists for Kanban boards
- dashboard Dataview queries use valid source paths and fields
- Kanban and Dashboard indexes link the files
- scope hub and routing matrix expose the board when it is a recurring route

Improve safely:

- Preserve existing column order and task completion state.
- Do not move cards between lifecycle columns unless the user asks or the evidence is explicit.
- Normalize metadata and links when the intent is clear.
- Flag ambiguous cards instead of inventing missing context.
- Convert repeated findings into board cards when the user wants a self-improving workstream loop.

## Validation

Before finishing:

- confirm created files are linked from the right index or hub
- confirm internal wikilinks point to real notes when possible
- confirm Dataview source paths match actual folders
- run the Ariadne validator when structural links changed and the repo validator is available
- report plugin-dependent parts separately from Markdown correctness

## References

- `references/kanban-board-patterns.md` - board structure, card metadata, and audit rules
- `references/dataview-dashboard-patterns.md` - Dataview query patterns for task and note rollups
- `assets/templates/Workstream Board.md` - generic board template
- `assets/templates/Workstream Dashboard.md` - generic dashboard template
