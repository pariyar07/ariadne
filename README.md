# Obsidian Agentic Vault Skill

Personal agent skill for creating and maintaining Obsidian vaults as durable, agent-maintained knowledge systems.

The skill is intended for broad use: projects, research topics, learning systems, startup work, life/admin systems, and any new vault that should compound over time.

## Install

Copy or symlink `skills/obsidian-agentic-vault` into an agent skills directory, for example:

```bash
ln -s "$PWD/skills/obsidian-agentic-vault" "$HOME/.agents/skills/obsidian-agentic-vault"
```

For Codex-specific discovery, copy or symlink it into:

```bash
$HOME/.codex/skills/obsidian-agentic-vault
```

## What It Does

- Creates a standard agentic Obsidian vault structure.
- Adds `AGENTS.md` and `CLAUDE.md` for local agent memory.
- Adds workflows for raw ingest, compiled notes, decisions, outputs, and long-term context discovery.
- Adds reusable note templates.
- Adds Obsidian Bases for source, decision, and note tracking.

Vaults remain the source of truth. The skill is only the reusable setup and maintenance procedure.
