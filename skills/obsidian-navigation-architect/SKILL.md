---
name: obsidian-navigation-architect
description: "Design or modify Obsidian vault navigation: folder hubs, agent navigation, routing matrices, workstream graphs, Bases/view layers, templates, health-check rules, and long-term traversability."
---

# Obsidian Navigation Architect

Use this skill when changing the durable structure of an Obsidian vault.

## Core Principle

Optimize for reliable human and agent traversal, not for a beautiful graph view.

Markdown notes remain the source of truth. Bases, canvases, dashboards, and reports are view layers over the vault.

## Start

1. Read `00 Index.md`.
2. Read `AGENTS.md` or `CLAUDE.md`.
3. Read `Agent/00 Agent Navigation.md` if it exists.
4. Read `Agent/Vault Navigation Standard.md` if it exists.
5. Read `Agent/Knowledge Processing Architecture.md` before structural changes.

## Navigation Layers

Maintain these layers when useful:

1. Global entry: `00 Index.md` and agent instructions.
2. Agent entry: `Agent/00 Agent Navigation.md`.
3. Folder hubs: `00 ... Index.md` notes inside durable folders.
4. Thread hubs: synthesis or debate notes for recurring arguments.
5. View layer: `Bases/00 Bases Index.md`, `.base` files, canvases, dashboards.
6. Note-level links: meaningful links to sources, concepts, entities, relationships, questions, and decisions.

## Workstream Graph Protocol

Do not pre-create graph categories because they might be useful later.

Create or promote a workstream graph only when a recurring use case needs its own traversal path. Examples can include evidence trails, customer discovery, engineering decisions, GTM experiments, fundraising, life systems, or any other durable domain.

When promoting a workstream:

1. Choose or create the folder.
2. Create a `00 ... Index.md` hub.
3. Add a routing row to `Agent/Task Routing Matrix.md`.
4. Link from `Agent/00 Agent Navigation.md` if it becomes a primary route.
5. Add templates only if the structure repeats.
6. Add a Base only if metadata inspection helps.
7. Link the Base from `Bases/00 Bases Index.md`.
8. Update `00 Index.md` only if strategically important.
9. Add health-check coverage if the workstream creates recurring maintenance.

## Recursive Scope Protocol

A navigation scope can exist at any depth: the vault root, a top-level workstream, a child workflow, or a deep child project. Promote a child scope only when a recurring durable route needs local traversal; otherwise keep it as a normal folder under the parent scope.

When creating or updating a child scope:

1. Identify the parent scope and its hub.
2. Create or update the child hub, usually `00 ... Index.md`.
3. Link the child from the parent hub or nearest navigation route.
4. Link the parent from the child hub.
5. Add routing coverage at the nearest useful `Agent/Task Routing Matrix.md`.
6. Add a local `AGENTS.md` only for local deltas.
7. Add local templates or local Bases only when the repeated workflow justifies them.
8. Add health checks for hub links, scope queues, raw-source compilation, and Base coverage.

Warn when you see:

- child `AGENTS.md` files repeating parent or root policy instead of local deltas
- child local Bases without scope filters
- parent hub missing child link
- child hub missing parent link
- ambiguous cross-scope wikilinks that should point through the nearest useful hub, relationship note, or synthesis

## Bloat And Drift

When navigating or restructuring a vault, proactively call out:

- `00 Index.md` acting like a complete table of contents instead of a strategic map
- `Agent/00 Agent Navigation.md` carrying detailed note lists instead of routes
- folders with many durable notes but no `00 ... Index.md`
- hubs that are too long to scan and need sub-hubs or a Base
- recurring workstreams missing from the task-routing matrix
- Bases not linked from `Bases/00 Bases Index.md`
- raw/inbox/output/question buildup without a compilation route
- repeated need for user guidance because global instructions are too generic for a folder

If the current task is structural, fix the issue directly when safe. Otherwise, tell the user briefly and propose a focused maintenance pass.

## Folder Index Rules

Use:

```text
Top-level index = one per durable workstream
Nested index = only when a subfolder becomes a recurring workflow
Thread hub = when a topic becomes an ongoing argument or synthesis
Base = when dynamic filtering or status inspection helps
```

## Local AGENTS.md Pattern

When a specialized folder needs local rules, add or propose a folder-level `AGENTS.md`.

Use local `AGENTS.md` files for:

- folder purpose and boundaries
- local note types and required frontmatter
- local workflow
- templates and Bases to update
- done criteria
- local bloat/drift signals

Do not create local `AGENTS.md` files just to repeat global rules. A good trigger is repeated user guidance for the same folder-specific behavior.

## Base Layer

Base files should be linked from `Bases/00 Bases Index.md` with wikilinks, for example `[[Bases/Decisions.base]]`.

Validation should resolve both Markdown notes and `.base` files.

## Guardrails

- Avoid decorative links.
- Avoid creating wrapper notes only to make non-Markdown files appear pretty in graph view.
- Keep `00 Index.md` selective.
- Link operational files through operating hubs; link semantic notes through semantic context.
- Read raw sources only when compiled notes are insufficient.

## Validation

Before finishing:

- run or describe link validation
- confirm new hubs are linked from the right parent hubs
- confirm Bases are linked from `Bases/00 Bases Index.md`
- confirm task routing points future agents to the smallest useful context set
- confirm no existing workflow was silently replaced

## Related Skills

- Use `obsidian-agentic-vault` for new vault bootstrap.
- Use `obsidian-workstream-board` for Kanban work boards and Dataview dashboards.
- Use `obsidian-vault-maintainer` for health checks.
- Use `obsidian-research-pipeline` for domain research pipeline setup.
- Use `obsidian-research-ingest`, `obsidian-ingest-compile`, and `obsidian-research-synthesis` for content flow.
