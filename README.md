# Obsidian Agentic Vault Skill

Personal skill package for creating and maintaining Obsidian vaults as agent-maintained Markdown knowledge systems.

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
- compiled Markdown notes
- durable decisions
- open questions
- generated outputs
- long-term context discovery
- vault health checks
