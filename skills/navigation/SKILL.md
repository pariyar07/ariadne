---
name: ariadne:navigation
description: "Design or modify Obsidian vault navigation: folder hubs, agent navigation, routing matrices, workstream graphs, Bases/view layers, templates, health-check rules, and long-term traversability."
---

# Ariadne Navigation

Use this skill when changing the durable structure of an Obsidian vault.

## Core Principle

Optimize for reliable human and agent traversal, not for a beautiful graph view.

Markdown notes remain the source of truth. Bases, canvases, dashboards, and reports are view layers over the vault.

## Start

1. Read root instructions and every applicable ancestor scope instruction through the target.
2. Read relevant indexes, agent navigation, navigation standards, routing matrices, and knowledge-processing architecture.
3. In a multi-scope vault, require a current-turn named or confirmed target before writing.
4. State an explicit `allowed_write_set`. Name every parent hub, routing matrix, root Base formula, or cross-scope file separately; minimal wiring is not implicit authorization.

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

Topology ownership is strict: `sync_scope_topology.js` owns descriptors, generated files, generated blocks, scope maps/registry, routing checkpoints, root Base scope branches, redirects, and parent/child topology. Use `ariadne:scope` for any lifecycle or topology change.

Navigation may edit only user extension areas outside generated blocks: prose around marker-managed checkpoints, user-authored hub sections, semantic links, and other explicitly confirmed content. Never edit inside generated blocks or reproduce generated wiring elsewhere.

When improving a child scope's user-authored navigation:

1. Identify the parent scope and its hub.
2. Create or update the child hub, usually `00 ... Index.md`.
3. Preserve engine-owned parent/child links and routing checkpoints.
4. Add only semantic user-authored links outside generated regions.
5. Add a local `AGENTS.md` only for local deltas.
6. Add local templates or local Bases only when the repeated workflow justifies them.
7. Add health checks for hub links, scope queues, raw-source compilation, and Base coverage.

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

If a proposed fix changes scope topology, do not fix it directly: route it through `sync_scope_topology.js` via `ariadne:scope`.

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

For `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md` files in an external code repository or ordinary folder, use `ariadne:workspace-instructions`. This navigation skill owns vault-local hubs, routing, and folder rules; workspace instruction files own the bridge back to registered Ariadne context.

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

- Use `ariadne:vault` for new vault bootstrap.
- Use `ariadne:workspace-instructions` for workspace instruction files outside the vault.
- Use `ariadne:workstream-tracking` for Kanban work boards and Dataview dashboards.
- Use `ariadne:maintenance` for health checks.
- Use `ariadne:research-pipeline` for domain research pipeline setup.
- Use `ariadne:research-ingest`, `ariadne:knowledge-capture`, and `ariadne:research-synthesis` for content flow. Research topology inside a confirmed boundary belongs to `ariadne:research-pipeline`; durable cross-scope navigation remains here.
