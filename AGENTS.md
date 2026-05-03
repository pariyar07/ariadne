# Ariadne — Agent Instructions

Ariadne is a skill package for building Obsidian vaults that AI agents can navigate, maintain, and operate reliably.

## What This Repo Contains

```
skills/
  obsidian-agentic-vault/        ← vault bootstrap skill + templates
  obsidian-scope-manager/        ← scope creation and wiring
  obsidian-navigation-architect/ ← hub and routing design
  obsidian-ingest-compile/       ← raw input → durable notes
  obsidian-research-synthesis/   ← multi-source synthesis
  obsidian-vault-maintainer/     ← health checks and repair
  obsidian-vault-validator/      ← deterministic structural validation
    scripts/validate_vault.js    ← the validator (Node.js, no deps)
    scripts/validate_vault.sh    ← shell wrapper
    test/                        ← test fixtures and runner
docs/
  guides/validator.md            ← validator counter reference
  pressure-scenarios/            ← edge case documentation
```

## How Skills Are Structured

Each skill is a folder with:
- `SKILL.md` — the agent instructions (this is what Claude Code, Gemini CLI, and others read)
- `agents/openai.yaml` — display metadata for Codex CLI UI
- `assets/templates/` — files the skill copies into the target vault (obsidian-agentic-vault only)
- `references/` — supporting documentation the agent can read for deeper context

## Routing

| Task | Where to look |
| --- | --- |
| Edit skill instructions | `skills/<skill-name>/SKILL.md` |
| Edit vault templates | `skills/obsidian-agentic-vault/assets/templates/` |
| Edit reference documentation | `skills/obsidian-agentic-vault/references/` |
| Edit the validator | `skills/obsidian-vault-validator/scripts/validate_vault.js` |
| Run the validator | `node skills/obsidian-vault-validator/scripts/validate_vault.js "/path/to/vault"` |
| Run the test suite | `node skills/obsidian-vault-validator/test/test_recursive_scopes.js` |
| Read validator counter docs | `docs/guides/validator.md` |

## Rules

- Skills are Markdown — no build step, no dependencies beyond Node.js for the validator.
- The validator uses only built-in Node.js modules. Never add external dependencies to it.
- All validator checks must be deterministic — same vault always produces same output.
- New validator warnings must be non-fatal unless they represent a structural impossibility.
- Every new validator counter needs: logic in JS + return object entry + counters array entry + `docs/guides/validator.md` update + `SKILL.md` healthy output update + `README.md` healthy output update + test fixture.
- `agents/openai.yaml` is required for each skill for Codex CLI display metadata.
- Do not commit `CLAUDE.local.md` or `GEMINI.local.md` — these are machine-local.
