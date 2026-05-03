---
name: obsidian-agentic-vault
description: Bootstrap an agentic Obsidian vault for projects, research, learning, life systems, and other long-running knowledge work. Use when creating a new vault, installing the base folder structure, templates, AGENTS.md, CLAUDE.md, Agent navigation files, and default Bases.
---

# Obsidian Agentic Vault

Use this skill to create or refresh the foundation of an Obsidian vault as a durable, agent-maintained Markdown knowledge system.

This skill complements Obsidian mechanics skills:

- Use `obsidian-markdown` for notes, properties, wikilinks, embeds, and callouts.
- Use `obsidian-bases` for `.base` views.
- Use `json-canvas` for `.canvas` maps.
- Use `defuddle` for clean Markdown extraction from web pages.
- Use `obsidian-cli` when Obsidian is open and CLI interaction is useful.

It also has workflow companion skills:

- `obsidian-ingest-compile` for raw inputs, links, documents, and brain dumps.
- `obsidian-research-synthesis` for multi-source research threads.
- `obsidian-vault-maintainer` for health checks and recurring maintenance.
- `obsidian-navigation-architect` for hubs, routing, workstream graphs, and Base/view-layer changes.

## Core Model

The vault is the memory. The skill is the setup and maintenance procedure.

The human curates direction. Agents compile raw material into a linked Markdown wiki. Obsidian is the readable frontend. Bases, canvases, and reports are view layers over the Markdown source of truth.

For multi-area vaults, model the vault as a recursive scope tree. The root scope owns global policy and shared view layers. Each child scope inherits parent rules and adds only local deltas.

This skill bootstraps the system. Use the companion skills for ongoing ingest, synthesis, navigation changes, and maintenance.

## Start Workflow

1. Determine the vault path and purpose.
2. Classify the vault mode:
   - `project` - shipping/building something.
   - `research` - studying a topic.
   - `learning` - building durable understanding.
   - `life` - personal operating system, admin, goals, habits.
   - `system` - procedures, workflows, infrastructure, automation.
   - `mixed` - more than one of the above.
3. Create or update the base folder structure.
4. Add core files from `assets/templates/`.
5. Customize `00 Index.md`, `AGENTS.md`, and `CLAUDE.md` for the vault purpose.
6. Add `Agent/00 Agent Navigation.md`, `Agent/Vault Navigation Standard.md`, `Agent/Task Routing Matrix.md`, and `Agent/Vault Health Check Procedure.md` when useful.
7. Add relevant mode folders from `references/vault-structure.md`.
8. Create Bases from the `.base` files in `assets/templates/` when useful.
9. Add `Bases/00 Bases Index.md` and link each Base from it.
10. Validate that Markdown frontmatter and Base YAML parse.

## Default Folder Structure

Create these folders unless the user asks for a different structure:

- `Raw/`
- `Raw/Sources/`
- `Inbox/`
- `Processing Queue/`
- `Notes/`
- `Research/`
- `Entities/`
- `Relationships/`
- `Concepts/`
- `Questions/`
- `Decisions/`
- `Outputs/`
- `Visualizations/`
- `Templates/`
- `Agent/`
- `Bases/`
- `Archive/`

Add mode-specific folders only when useful.

## Long-Term Context Discovery

Do not read the entire vault by default.

Use progressive discovery:

1. Read `00 Index.md`.
2. Read `AGENTS.md` or `CLAUDE.md`.
3. Read `Agent/Long Term Knowledge Workflow.md`.
4. Search filenames with `find`.
5. Search content with `rg`.
6. Read hub/index notes first.
7. Follow relevant wikilinks.
8. Read raw sources only when compiled notes are insufficient.
9. Use `.base` files to inspect note status and metadata.

## Navigation Pattern

New vaults should separate:

- knowledge graph: research, concepts, entities, relationships, decisions, architecture, product, and other durable semantic notes
- operating graph: agent instructions, workflows, templates, inbox, processing queue, raw sources, outputs, and health checks
- view layer: Bases, canvases, dashboards, and generated reports

Future scopes should be promoted only when recurring use needs a dedicated route. A promoted scope needs a hub, parent/child navigation links, routing coverage, optional local rules, optional templates, optional Bases, and health-check coverage.

## Templates

Use the files in `assets/templates/` as starting points. Copy them into the target vault and customize placeholders.

See:

- `references/vault-operating-model.md`
- `references/vault-modes.md`
- `references/vault-structure.md`
- `references/maintenance.md`
- `references/knowledge-processing-architecture.md`
- `references/recursive-scopes.md`
- `references/bases-scope-patterns.md`
