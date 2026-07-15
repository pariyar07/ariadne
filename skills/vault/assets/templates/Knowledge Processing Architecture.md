---
title: Knowledge Processing Architecture
type: operating-standard
status: active
created: "{{date}}"
tags:
  - agent-workflow
  - knowledge-processing
  - obsidian
---

# Knowledge Processing Architecture

Use this reference when a vault needs to grow coherently over time instead of becoming a folder of disconnected notes.

## Principle

Knowledge management and task execution are different jobs.

Task agents may answer questions, generate outputs, or execute project work. A knowledge-processing workflow maintains the vault's structure: ingest, compile, link, index, lint, and archive.

The foundational design philosophy: the human curates what enters; agents compile raw material into a linked Markdown wiki; the compiled wiki is the source of truth; Bases and views are read-only lenses over it. Every raw input should eventually compile into a concept, thesis, decision, or open question.

Research is an opt-in capability inside a selected scope. A schema-v1 pipeline has one canonical `type: research-boundary` descriptor. Its stable `boundary_id`, vault-relative `scope_path`, hub links, `view_mode`, and explicit `rollup_boundaries` define the boundary independently of folder layout.

## Intake Interfaces

- `Raw/Sources/` for external sources.
- `Inbox/` for human brain dumps and unstructured project context.
- `Outputs/` for generated artifacts that should be filed back into the wiki if durable.

## Processing Passes

1. Triage the input.
2. Extract source claims, entities, relationships, concepts, decisions, and questions.
3. Link context meaningfully.
4. Compile durable notes in the appropriate folder.
5. Make the result visible through indexes, Bases, canvases, or health reports.

## Research Provenance And Promotion

- Use only top-level scalar metadata and flat scalar lists for research schema version 1.
- Assign membership with `research_boundary`. An exact view includes only that descriptor; rollup adds only explicitly listed child descriptors.
- Canonical provenance runs downstream to upstream through `derived_from`; reverse coverage comes from backlinks.
- Preserve source type and evidence role. Generated analysis and derivative copies require upstream provenance and do not independently corroborate it.
- Keep durable inquiry disposition history append-only.
- Promotion creates or updates an explicitly authorized downstream note with `research_basis`; it does not move, duplicate, or silently rewrite research evidence. `promoted_to` is optional.

## Guardrail

Do not let task-running agents restructure the vault opportunistically. Durable structural changes should follow this processing workflow and [[Agent/Vault Navigation Standard]].
