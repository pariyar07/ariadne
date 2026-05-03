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

## Guardrail

Do not let task-running agents restructure the vault opportunistically. Durable structural changes should follow this processing workflow and [[Agent/Vault Navigation Standard]].
