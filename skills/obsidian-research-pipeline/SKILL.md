---
name: obsidian-research-pipeline
description: Create or upgrade a research pipeline inside an existing Obsidian vault scope or domain. Use when a user asks to add research infrastructure, source intake, raw-to-compiled workflow, synthesis/thread hubs, local Concepts/Entities/Relationships/Questions folders, research templates, Bases, or routing for a domain-specific research workflow.
---

# Obsidian Research Pipeline

Use this skill when an existing scope needs recurring research intake and synthesis, but the user is not creating a whole new vault.

This skill promotes research from "a folder of notes" into a navigable pipeline: raw sources, compiled research, synthesis/thread hubs, durable semantic extraction, task routing, templates, and optional local Bases.

## Start

1. Read root `AGENTS.md` or `CLAUDE.md`.
2. Read root `00 Index.md`, `Agent/00 Agent Navigation.md`, and `Agent/Task Routing Matrix.md` if present.
3. Read the target scope's `AGENTS.md`, `00 Index.md`, `Agent/00 Agent Navigation.md`, and `Agent/Task Routing Matrix.md` if present.
4. Read the existing `Research/00 Research Index.md` if it exists.
5. Read `Agent/Knowledge Processing Architecture.md` or the local equivalent before structural changes.

Use `obsidian-navigation-architect` with this skill when the change affects hubs, routing, Bases, or recurring traversal. Use `obsidian-research-ingest` when a user gives a source and the target scope may be unclear. Use `obsidian-ingest-compile` after the pipeline exists and a concrete source needs ingestion. Use `obsidian-research-synthesis` when updating the actual synthesis content.

## Pipeline Shape

Create only what the scope needs. A full domain research pipeline usually includes:

- `Raw/Sources/00 Source Index.md` for source captures.
- `Inbox/00 Inbox Index.md` for rough human input.
- `Processing Queue/00 Processing Queue Index.md` for follow-up compilation work.
- `Research/00 Research Index.md` for compiled research.
- `Research/00 <Scope> Research Synthesis.md` as the primary read-first synthesis.
- `Relationships/<Scope> Research Thread.md` for ongoing debates, sequence, tensions, and implications.
- `Concepts/00 Concepts Index.md` for reusable ideas and definitions.
- `Entities/00 Entities Index.md` for recurring people, projects, tools, companies, protocols, or platforms.
- `Relationships/00 Relationships Index.md` for durable comparisons and thread maps.
- `Questions/00 Questions Index.md` for unresolved prompts.
- `Agent/Ingest Compile Workflow.md` for local intake rules.
- `Agent/Knowledge Processing Architecture.md` for local filing targets.
- `Templates/00 Templates Index.md` and minimal note templates when repeated note shapes are expected.
- `Bases/00 Bases Index.md` and a local `Research Pipeline.base` when metadata/status inspection helps.

For a small scope, prefer a lighter version: research index, synthesis note, thread hub, source index, ingest workflow, and routing rows. Add concepts/entities/relationships/questions/templates/Bases when recurring use justifies them.

## Workflow

1. Identify the target scope path and parent scope.
2. Inventory existing research, source, concept, entity, relationship, question, template, Base, and Agent files.
3. Choose the minimum pipeline shape that supports the recurring job.
4. Create missing folders and `00 ... Index.md` hubs.
5. Create or update the research synthesis and thread hub.
6. Create or update local `Agent/Ingest Compile Workflow.md` and `Agent/Knowledge Processing Architecture.md`.
7. Add routing rows to the nearest useful `Agent/Task Routing Matrix.md`:
   - shared source material for the scope
   - research synthesis for the scope
   - Bases or research pipeline views, if local Bases exist
8. Link primary research hubs from `Agent/00 Agent Navigation.md`.
9. Link the pipeline from the scope `00 Index.md` only at the strategic level; keep detailed note lists in folder hubs and Bases.
10. Add local templates only for repeated note shapes.
11. Add local Bases only when they will help inspect status, raw-vs-compiled coverage, or metadata.
12. Link local Bases from `Bases/00 Bases Index.md`.
13. If a new local Bases index exists, link it from the nearest parent/root Bases index when that parent already tracks project-local Bases.
14. Run vault validation.

## Local Ingest Workflow Content

A local ingest workflow should add only scope-specific filing rules. It should not repeat the whole root policy.

Include:

- scope-specific source types
- local folder roles
- source metadata requirements
- the raw capture to compiled research pattern
- required synthesis/thread maintenance
- rules for extracting concepts, entities, relationships, decisions, roadmap items, and questions
- links to the local research synthesis, thread hub, source index, and templates

## Research Note Standard

Compiled research notes should separate:

- source claims
- interpretation
- relevance to the scope
- implications
- related concepts, entities, relationships, decisions, roadmap items, and questions

Synthesis notes should summarize what is known, inferred, contested, strategically important, and still open.

Thread hubs should track the research sequence, major tensions, implications, open questions, and links to source-backed research.

## Base Pattern

For a local research pipeline Base:

```yaml
filters:
  and:
    - file.inFolder("<scope_path>")
    - or:
        - type == "raw-source"
        - type == "research"
        - type == "research-synthesis"
formulas:
  scope: '"<scope_name>"'
properties:
  formula.scope:
    displayName: Scope
views:
  - type: table
    name: "<scope_name> Research Pipeline"
    order:
      - file.name
      - formula.scope
      - type
      - status
      - source_type
      - author
      - created
      - accessed
      - file.folder
```

Local Bases must include a folder-scope filter matching the scope path.

## Guardrails

- Do not duplicate root principles in local files; local files add scope deltas.
- Do not create local `AGENTS.md` unless the research pipeline has specialized rules beyond existing scope instructions.
- Do not pre-create entity or concept notes just because they might be useful. Use indexes with candidate lists until extraction is justified.
- Do not make the scope `00 Index.md` a full table of contents.
- Use path-qualified wikilinks in navigation files.
- Read raw sources only when compiled notes are insufficient.
- Preserve existing notes and user changes.

## Validation

Before finishing:

- confirm all new hubs are linked from the right parent or agent navigation route
- confirm routing points future agents to the smallest useful context set
- confirm local Bases are linked from their local Bases index
- confirm local Base filters include `file.inFolder("<scope_path>")`
- run `obsidian-vault-validator`
- call out any remaining validator warnings instead of hiding them
