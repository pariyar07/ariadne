---
title: Vault Navigation Standard
type: operating-standard
status: active
created: "{{date}}"
tags:
  - navigation
  - agent-workflow
  - obsidian
---

# Vault Navigation Standard

This vault uses hub notes, meaningful wikilinks, and Bases as the primary navigation system.

## Principle

Do not optimize for a beautiful graph view. Optimize for reliable human and agent traversal.

Bases are the view layer: they inspect the Markdown wiki, but they do not replace the wiki as the source of truth.

## Navigation Layers

### 1. Global Entry

- [[00 Index]]
- [[Agent/00 Agent Navigation]]

### 2. Folder Hubs

Each durable folder should have a `00 ... Index` note when it contains important notes or will receive future work.

### 3. Thread Hubs

Use thread hubs for ongoing arguments, debates, and synthesis.

### 4. View Layer

Use [[Bases/00 Bases Index]] to discover database-like views over the vault.

`.base` files should be linked from [[Bases/00 Bases Index]] with wikilinks. Validation checks should resolve both Markdown notes and `.base` files.

### 5. Note-Level Links

Individual notes should link to:

- source notes they depend on
- concepts they use
- entities they discuss
- decisions they support
- relationship notes that contextualize them

## What Counts As Connected

A Markdown note is connected if it has meaningful incoming links, meaningful outgoing links, or inclusion in a relevant Base view.

A `.base` file is connected when it is linked from [[Bases/00 Bases Index]] and associated with a relevant workflow or folder hub.

## Proactive Bloat Signals

Agents should call out navigability drift when they encounter it:

- entry files becoming giant indexes
- folders with many durable notes but no hub
- hubs that are too long to scan
- recurring workstreams missing from [[Agent/Task Routing Matrix]]
- Bases missing from [[Bases/00 Bases Index]]
- raw sources, inbox items, outputs, or questions piling up without compilation
- repeated need for user guidance because global instructions are too generic for a folder

If the current task already involves navigation or maintenance, fix the issue directly when safe. Otherwise, mention it briefly and continue the requested task.

## Local Agent Instructions

When working inside a durable workstream folder, check for a local `AGENTS.md`. If present, follow it as local operating guidance in addition to the root instructions. If absent, use the root `AGENTS.md`, [[Agent/00 Agent Navigation]], and the relevant folder hub.

Create or propose a local `AGENTS.md` only when a folder has specialized workflow rules that the global instructions do not cover well.

## Workstream Graph Protocol

Do not pre-create graph categories just because they might be useful later.

Create a new workstream graph when a recurring use case needs a dedicated traversal path. When promoting a workstream:

1. Choose or create the right folder.
2. Create a `00 ... Index` hub.
3. Link the hub from [[Agent/00 Agent Navigation]] if it becomes a primary route.
4. Add a row to [[Agent/Task Routing Matrix]].
5. Add or update templates only if the pattern repeats.
6. Add or update a Base only if metadata inspection helps.
7. Update [[00 Index]] only if the workstream is strategically important.
8. Update [[Agent/Vault Health Check Procedure]] if the workstream creates a recurring maintenance check.

## Folder Index Rules

Use a `00 ... Index.md` hub for any durable folder that has recurring work, important notes, or enough files that agents need a local map.

Use nested folder hubs only when a subfolder becomes its own recurring workflow.

Keep [[00 Index]] as the strategic map and [[Agent/00 Agent Navigation]] as the routing map. Put detailed lists in folder hubs, thread hubs, or Bases.

## Local AGENTS.md Rules

Optional folder-level `AGENTS.md` files are allowed for specialized workstreams.

Use them for local instructions such as:

- folder purpose and boundaries
- local note types and frontmatter
- local ingest or processing flow
- templates and Bases to update
- done criteria
- local bloat/drift signals

Do not create local `AGENTS.md` files just to repeat global rules.

## Related

- [[Agent/Knowledge Processing Architecture]]
- [[Agent/Long Term Knowledge Workflow]]
- [[Agent/Task Routing Matrix]]
- [[Agent/Vault Health Check Procedure]]
