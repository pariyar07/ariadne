---
name: obsidian-ingest-compile
description: Capture and compile links, documents, PDFs, tweets, transcripts, screenshots, meeting notes, brain dumps, and rough user input into an agent-maintained Obsidian Markdown vault. Human curates; agent compiles raw material into a durable linked wiki.
---

# Obsidian Ingest Compile

Use this skill when new material enters an Obsidian vault and should become durable knowledge instead of staying in chat.

## Core Rule

Do not only answer in chat when the user shares material that should compound. Capture the input, compile it, link it, and update the relevant hub.

## Start

1. Read `00 Index.md`.
2. Read `AGENTS.md` or `CLAUDE.md`.
3. Read `Agent/00 Agent Navigation.md` if it exists.
4. Read `Agent/Task Routing Matrix.md` to confirm the target scope for this material.
5. Read `Agent/Ingest Compile Workflow.md` if it exists (or the local scope equivalent).
6. Open only the relevant folder hub and notes.

## Intake Infrastructure Check

Before ingesting, verify the target scope has intake infrastructure. If any of the following are missing, create them before proceeding:

- `Raw/Sources/` folder and `Raw/Sources/00 Source Index.md`
- `Inbox/` folder and `Inbox/00 Inbox Index.md`
- `Processing Queue/` folder and `Processing Queue/00 Processing Queue Index.md`
- A local `Agent/Ingest Compile Workflow.md` (copy from root or create a minimal one)

Add a row to the local `Agent/Task Routing Matrix.md` for "Shared link or source material" pointing to the new workflow file if no row exists.

For root-level intake, these folders already exist. For domain scopes, they may need to be set up. Set them up silently as part of the first ingest — do not ask the user to do it manually.

## Scope Routing

Before writing, determine the target scope:

- Use the root scope for vault-wide material that belongs to no single child scope.
- Use the current scope for local work inside an active durable area.
- Use the nearest child scope for a narrower recurring workflow with its own hub.

For cross-scope material, capture the source once where it belongs, then create or update relationship notes, synthesis notes, or routing notes at the nearest common parent scope. Link to child-scope evidence instead of duplicating raw sources across scopes.

## Intake Routing

- External sources go in `Raw/Sources/`.
- Rough human input goes in `Inbox/`.
- Follow-up work goes in `Processing Queue/`.
- Source-backed synthesis goes in `Research/`.
- Durable ideas go in `Concepts/`.
- Durable objects go in `Entities/`.
- Durable connections go in `Relationships/`.
- Decisions go in `Decisions/`.
- Unresolved questions go in `Questions/`.
- Generated artifacts go in `Outputs/`.

## Workflow

1. Capture the raw material with title, source, author, URL/path, source type, created/accessed date, and why it matters.
2. Extract source claims separately from interpretation.
3. Identify candidate entities, relationships, concepts, decisions, and open questions.
4. Compile the durable understanding into the smallest appropriate note or notes.
5. Add meaningful wikilinks to sources, concepts, entities, relationships, questions, and decisions.
6. Link new durable notes from the relevant folder hub.
7. Update synthesis or thread hubs if the source changes the project map.
8. Add processing items for anything that needs later review.

## Validation

Before finishing:

- confirm raw material is either compiled or intentionally left source-only
- confirm durable notes have frontmatter
- confirm important new notes are linked from a hub
- check that claims and interpretations are not mixed together
- run a focused broken-link check when practical

## Related Skills

- Use `obsidian-research-synthesis` for multi-source research threads.
- Use `obsidian-navigation-architect` when the ingest creates a new durable workstream.
- Use `obsidian-vault-maintainer` for health checks after large ingest sessions.
