# Installation And Artifact Policy

Do not assume optional tools are available. Ask whether to check/install and keep the setup guidance short.

## Ariadne

Use Ariadne when the task depends on an Obsidian vault as durable memory.

Global install for supported agents:

```bash
npx skills add https://github.com/pariyar07/ariadne \
  --global \
  --agent '*' \
  --copy \
  --yes
```

For Codex only:

```bash
npx skills add https://github.com/pariyar07/ariadne \
  --global \
  --agent openai \
  --copy \
  --yes
```

For Claude Code only:

```bash
npx skills add https://github.com/pariyar07/ariadne \
  --global \
  --agent claude-code \
  --copy \
  --yes
```

## OpenSpec

Use OpenSpec when a repo-local change contract is valuable.

Ask before installing or initializing. Prefer the official package/docs for the current runtime. Typical flow:

```bash
npm install -g @fission-ai/openspec
openspec init
```

Keep OpenSpec artifacts repo-local unless the user asks for a vault mirror. Link them from vault notes instead of duplicating them.

## Superpowers

Use Superpowers when available for brainstorming, implementation plans, TDD, debugging, verification, code review, and branch finishing.

Ask before installing. Prefer the user's runtime plugin or skill manager. If unavailable, continue with a fallback plan/checklist and state that the stronger workflow is not installed.

## Commit Or Ignore Policy

Ask before choosing:

- Commit OpenSpec when it is part of the team's reviewable repo behavior.
- Gitignore or keep local Superpowers execution plans when they are agent scratch.
- Commit Superpowers plans only when the team wants implementation history.
- Keep vault ADR/HLD/LLD versioned if the vault itself is versioned and those notes are canonical.
