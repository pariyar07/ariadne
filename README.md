# Obsidian Agentic Vault Skill

Personal skill package for creating and maintaining Obsidian vaults as agent-maintained Markdown knowledge systems.

The skill is meant for project, research, learning, life, and system vaults that should compound over time. It encodes a reusable workflow for turning raw sources, brain dumps, generated outputs, and decisions into a linked, inspectable Markdown wiki.

## Install

Install for Claude Code:

```bash
npx skills add https://github.com/pariyar07/obsidian-agentic-vault-skill \
  --global \
  --agent claude-code \
  --skill obsidian-agentic-vault \
  --copy \
  --yes
```

Install for Codex:

```bash
npx skills add https://github.com/pariyar07/obsidian-agentic-vault-skill \
  --global \
  --agent codex \
  --skill obsidian-agentic-vault \
  --copy \
  --yes
```

Install for all supported agents:

```bash
npx skills add https://github.com/pariyar07/obsidian-agentic-vault-skill \
  --global \
  --agent '*' \
  --skill obsidian-agentic-vault \
  --copy \
  --yes
```

List available skills without installing:

```bash
npx skills add https://github.com/pariyar07/obsidian-agentic-vault-skill --list
```

## Repository Shape

The repository keeps package-level docs at the root and installable skills under `skills/`.

```text
skills/
  obsidian-agentic-vault/
    SKILL.md
    agents/
    assets/
    references/
```

The `skills` CLI installs the selected skill folder, not the entire repository root.

## Skill Purpose

Use `obsidian-agentic-vault` for project, research, learning, life, or system vaults that should compound over time through:

- raw source capture
- inbox / brain dump intake
- dedicated processing queues
- compiled Markdown notes
- entity and relationship notes
- durable decisions
- open questions
- generated outputs
- contextual linking
- long-term context discovery
- vault health checks

## Operating Model

The vault is the memory. The skill is the setup and maintenance procedure.

The default architecture separates two jobs:

- **Knowledge processing:** ingest, triage, compile, link, index, lint, and archive.
- **Task execution:** answer questions, generate outputs, build things, and write durable results back into the vault.

This separation keeps the vault coherent as it grows. Task-running agents should consume the vault and file outputs back into it, but durable structural changes should follow the knowledge-processing workflow.

## Default Knowledge Flow

```text
Inbox / Raw Sources
  -> Processing Queue
  -> Extraction
  -> Compiled Notes
  -> Entities / Relationships / Concepts
  -> Indexes / Bases / Visualizations
  -> Health Checks
```

## Included Templates

The skill includes templates for:

- raw source notes
- brain dumps
- processing items
- research notes
- concept notes
- entity notes
- relationship notes
- decision notes
- question notes
- source evaluations
- knowledge health checks

It also includes Obsidian Base templates for:

- inbox
- processing queue
- research pipeline
- entities
- relationships
- decisions
- knowledge health
- all notes
