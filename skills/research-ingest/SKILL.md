---
name: ariadne:research-ingest
description: Cold-start research source ingest for Obsidian vaults. Use when a user gives a link, article, paper, repo, tweet, transcript, PDF, or rough research source and wants it saved into the right domain/scope, especially when the domain is missing, unclear, or may need a research pipeline created before ingest.
---

# Ariadne Research Ingest

Use this skill when the user gives research material and expects the agent to figure out where it belongs, create missing research infrastructure if needed, and compile it into durable vault knowledge.

This is a cold-start orchestration skill. It routes to the correct scope, then uses the existing pipeline and ingest skills instead of duplicating their work.

## Start

1. Read root `AGENTS.md` or `CLAUDE.md`.
2. Read root `00 Index.md`, `Agent/00 Agent Navigation.md`, `Agent/Task Routing Matrix.md`, and the scope registry if present.
3. Determine whether the user named a target domain/scope.
4. If no target is named, inspect available domain/scope entry points and ask one short question: "Which domain should this research go into?"
5. If the user gave an ambiguous target, prefer the nearest matching scope from the domain registry and confirm only when multiple plausible matches exist.
6. Read the target scope's `AGENTS.md`, `00 Index.md`, `Agent/00 Agent Navigation.md`, and `Agent/Task Routing Matrix.md` if present.

## Decision Tree

Use the smallest sufficient path:

- If the target scope has no research pipeline, use `ariadne:research-pipeline` first.
- If the target scope has intake infrastructure and this is one source, use `ariadne:ingest`.
- If the source updates an ongoing multi-source argument, use `ariadne:synthesis` after ingesting.
- If the source belongs to multiple scopes, capture it once in the best primary scope and link to related scopes through relationship or synthesis notes at the nearest common parent.
- If the source is not research and is just an operational note, use `ariadne:ingest` directly.

## Workflow

1. Identify the source type: article, paper, repo, tweet, video, transcript, PDF, dataset, docs page, or rough note.
2. Resolve the target scope from user text, scope registry, local task routing, and existing folder names.
3. If needed, ask one domain-selection question before writing.
4. Check whether the target scope has:
   - `Raw/Sources/00 Source Index.md`
   - `Research/00 Research Index.md`
   - a research synthesis or thread hub
   - local `Agent/Ingest Compile Workflow.md`
5. If the pipeline is missing, create it with `ariadne:research-pipeline`.
6. Capture raw source metadata in `Raw/Sources/` when the source is substantial or externally addressable.
7. Compile a source-backed research note in `Research/`.
8. Keep source claims separate from interpretation.
9. Extract durable concepts, entities, relationships, decisions, roadmap items, and questions only when they are likely to recur.
10. Update the domain research synthesis and thread hub when the source changes the map.
11. Link new notes from the relevant folder hubs.
12. Add follow-up items to `Processing Queue/` when the source cannot be fully processed.
13. Run a focused validation check when practical.

## Domain Selection

Ask only when the domain cannot be inferred safely.

Good question:

```text
Which domain should this research go into: Operating Context Graph, Signal Theory, Perspectives, Ariadne, Website, or root/global?
```

Do not ask for a domain when the user already named one or the source clearly belongs to one active scope.

If the user says "not sure", capture into root `Processing Queue/` with a routing question instead of guessing.

## Research Note Standard

Create or update compiled notes with:

- source metadata
- summary
- claims from source
- interpretation
- relevance to the target scope
- implications
- related notes

Prefer compact synthesis updates over duplicating full article summaries in multiple places.

## Guardrails

- Do not leave useful research only in chat.
- Do not create a new scope for a one-off source.
- Do not duplicate a raw source into multiple scopes.
- Do not read the whole vault to choose a domain; use indexes, routing matrices, and filename search.
- Do not mix source claims and interpretation.
- Do not update strategic synthesis notes unless the source changes the map.
- Do not create concept/entity/relationship notes preemptively.
- Preserve user edits and existing local workflow rules.

## Validation

Before finishing:

- confirm the source is captured or intentionally source-only
- confirm compiled research is linked from a hub
- confirm synthesis/thread updates are made when needed
- confirm unresolved work is in `Processing Queue/` or `Questions/`
- run `ariadne:validator` after structural changes
