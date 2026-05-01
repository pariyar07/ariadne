---
name: obsidian-agentic-vault
description: Create and maintain Satyam's agentic Obsidian vaults for projects, research, learning, life systems, and other long-running knowledge work. Use when creating a new Obsidian vault, setting up an agent-maintained Markdown wiki, ingesting sources into raw/ and compiled notes, adding AGENTS.md or CLAUDE.md to a vault, creating project memory, processing brain dumps, maintaining indexes, or running vault health checks.
---

# Obsidian Agentic Vault

Use this skill to create or maintain an Obsidian vault as a durable, agent-maintained knowledge system.

This skill complements Obsidian mechanics skills:

- Use `obsidian-markdown` for notes, properties, wikilinks, embeds, and callouts.
- Use `obsidian-bases` for `.base` views.
- Use `json-canvas` for `.canvas` maps.
- Use `defuddle` for clean Markdown extraction from web pages.
- Use `obsidian-cli` when Obsidian is open and CLI interaction is useful.

## Core Model

The vault is the memory. The skill is the setup and maintenance procedure.

The human curates direction. A dedicated knowledge-processing workflow captures, compiles, links, indexes, and maintains the wiki. Task-running agents should consume the vault and write outputs back, but should not casually restructure it.

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
6. Add relevant mode folders from `references/vault-structure.md`.
7. Create Bases from the `.base` files in `assets/templates/` when useful.
8. Validate that Markdown frontmatter and Base YAML parse.

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

## Source Ingest Workflow

When the user shares links, documents, tweets, repos, papers, screenshots, transcripts, brain dumps, or rough notes:

1. Capture raw/source material in `Raw/Sources/`.
2. Include source metadata: title, author, URL/path, source type, created/accessed date, and why it matters.
3. Put unstructured user input in `Inbox/` and create a processing item in `Processing Queue/` when it needs follow-up.
4. Extract source claims separately from interpretation.
5. Identify entities, relationships, concepts, decisions, and questions.
6. Compile durable synthesis into the right folder: `Research/`, `Concepts/`, `Notes/`, `Product/`, `Architecture/`, `Life/`, or another relevant area.
7. Link related notes with wikilinks.
8. Add unresolved questions to `Questions/`.
9. Update indexes or hub notes when the project map changes.

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

## Health Checks

When asked to audit or maintain a vault, check for:

- raw sources not compiled
- orphan notes
- duplicate concepts
- stale open questions
- decisions without rationale
- notes missing frontmatter
- broken wikilinks
- unprocessed inbox items
- processing queue items stuck in `needs-review`
- important notes without meaningful contextual links
- claims without source links
- stale index notes
- generated outputs that should be filed back into the wiki

## Templates

Use the files in `assets/templates/` as starting points. Copy them into the target vault and customize placeholders.

See:

- `references/vault-structure.md`
- `references/maintenance.md`
- `references/knowledge-processing-architecture.md`
