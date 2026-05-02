---
name: obsidian-research-synthesis
description: Synthesize multiple sources inside an Obsidian vault into durable research notes, thread hubs, claim/evidence maps, contradictions, concepts, entities, relationships, questions, and decisions.
---

# Obsidian Research Synthesis

Use this skill when the task is broader than a single-source ingest: comparing sources, updating a research thread, resolving claims, creating a synthesis note, or maintaining a debate map.

## Start

1. Read `00 Index.md`.
2. Read `AGENTS.md` or `CLAUDE.md`.
3. Read `Agent/00 Agent Navigation.md` if it exists.
4. Read the relevant research hub, usually `Research/00 Research Index.md`.
5. Read the thread hub if one exists.
6. Read compiled notes before raw sources.

## Scope Routing

Keep synthesis local unless it affects multiple scopes. A local project, workflow, or research thread should keep its synthesis in that scope and link from the local hub.

Cross-scope synthesis belongs at the nearest common parent scope. Link to child-scope evidence, source notes, and local syntheses rather than copying them upward. Promote to the root scope only when the synthesis is genuinely Satyam-wide.

## Synthesis Workflow

1. Define the research question or thread being updated.
2. Gather the smallest sufficient set of source notes and compiled research notes.
3. Separate source claims, interpretation, open questions, and decisions.
4. Identify agreements, disagreements, missing evidence, and stale assumptions.
5. Update or create the synthesis note.
6. Update concepts, entities, relationships, and questions when the synthesis changes durable understanding.
7. Link the synthesis from the relevant folder hub and thread hub.
8. Add processing items for sources that still need extraction or review.

## Research Note Standard

Durable synthesis should make clear:

- what is known
- what is inferred
- what is contested
- what evidence supports the claims
- which sources were used
- which concepts/entities/relationships are implicated
- what should change in strategy, product, architecture, or operations

## Thread Hubs

Use thread hubs for ongoing debates, repeated arguments, or strategic synthesis that future agents should read before reopening every source.

Thread hubs should contain:

- the current synthesis
- major source sequence
- main disagreements
- implications
- open questions
- links to source-backed research notes

## Validation

Before finishing:

- confirm source-backed claims link to sources or compiled research notes
- confirm interpretations are labeled as interpretations
- confirm important changes are reflected in relevant hubs
- avoid reading raw sources when compiled notes are sufficient
- add unresolved questions to `Questions/` or the processing queue

## Related Skills

- Use `obsidian-ingest-compile` for new single-source material.
- Use `obsidian-navigation-architect` if a research thread becomes a new workstream graph.
- Use `obsidian-vault-maintainer` for stale synthesis and source coverage checks.
