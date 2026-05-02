---
name: obsidian-ingest-compile
description: Capture and compile links, documents, PDFs, tweets, transcripts, screenshots, meeting notes, brain dumps, and rough user input into an agent-maintained Obsidian Markdown vault using the Karpathy-style raw-to-wiki workflow.
---

# Obsidian Ingest Compile

Use this skill when new material enters an Obsidian vault and should become durable knowledge instead of staying in chat.

## Core Rule

Do not only answer in chat when the user shares material that should compound. Capture the input, compile it, link it, and update the relevant hub.

## Start

1. Read `00 Index.md`.
2. Read `AGENTS.md` or `CLAUDE.md`.
3. Read `Agent/00 Agent Navigation.md` if it exists.
4. Read `Agent/Ingest Compile Workflow.md` if it exists.
5. Open only the relevant folder hub and notes.

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
