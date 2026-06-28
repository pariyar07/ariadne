# Ariadne — Agent Instructions

Ariadne is a skill package for building Obsidian vaults that AI agents can navigate, maintain, and operate reliably.

## What This Repo Contains

```
skills/
  vault/        ← vault bootstrap skill + templates (`ariadne:vault`)
    scripts/register_vault.js    ← optional machine-level vault registration
    test/test_register_vault.js  ← registration script tests
  discovery/    ← workflow skill for registering existing vaults (`ariadne:discovery`)
  scope/        ← scope creation and wiring (`ariadne:scope`)
  navigation/   ← hub and routing design (`ariadne:navigation`)
  ingest/       ← raw input → durable notes (`ariadne:ingest`)
  research-ingest/      ← cold-start research source routing (`ariadne:research-ingest`)
  research-pipeline/    ← domain research pipeline setup (`ariadne:research-pipeline`)
  synthesis/    ← multi-source synthesis (`ariadne:synthesis`)
  workstream-board/     ← Kanban boards and Dataview dashboards (`ariadne:workstream-board`)
  maintainer/   ← health checks and repair (`ariadne:maintainer`)
  validator/    ← deterministic structural validation (`ariadne:validator`)
    scripts/validate_vault.js    ← the validator (Node.js, no deps)
    scripts/validate_vault.sh    ← shell wrapper
    test/                        ← test fixtures and runner
scripts/
  validate_repo.js               ← public-boundary and repository guardrail checks
docs/
  guides/global-discovery.md     ← cold-agent vault discovery registration
  guides/weekly-maintenance-automation.md ← recurring maintenance automation prompt
  guides/validator.md            ← validator counter reference
  pressure-scenarios/            ← edge case documentation
```

## How Skills Are Structured

Each skill is a folder with:
- `SKILL.md` — the agent instructions (this is what Claude Code, Gemini CLI, and others read)
- `agents/openai.yaml` — display metadata for Codex CLI UI
- `assets/templates/` — files the skill copies into the target vault (`ariadne:vault` only)
- `references/` — supporting documentation the agent can read for deeper context

## Routing

| Task | Where to look |
| --- | --- |
| Edit skill instructions | `skills/<skill-name>/SKILL.md` |
| Edit vault templates | `skills/vault/assets/templates/` |
| Edit global discovery registration | `skills/vault/scripts/register_vault.js` |
| Edit vault discovery skill | `skills/discovery/SKILL.md` |
| Edit reference documentation | `skills/vault/references/` |
| Edit cold-start research ingest | `skills/research-ingest/SKILL.md` |
| Edit domain research pipeline setup | `skills/research-pipeline/SKILL.md` |
| Edit the validator | `skills/validator/scripts/validate_vault.js` |
| Run the validator | `node skills/validator/scripts/validate_vault.js "/path/to/vault"` |
| Run the test suite | `node skills/validator/test/test_recursive_scopes.js` |
| Run registration tests | `node skills/vault/test/test_register_vault.js` |
| Run repo guardrails | `node scripts/validate_repo.js` |
| Run skill guardrails | `node scripts/validate_repo.js --skills-only` |
| Read validator counter docs | `docs/guides/validator.md` |
| Read global discovery docs | `docs/guides/global-discovery.md` |
| Read weekly automation prompt | `docs/guides/weekly-maintenance-automation.md` |
| Read public boundary | `PUBLIC_BOUNDARY.md` |
| Read security policy | `SECURITY.md` |

## Rules

- Skills are Markdown — no build step, no dependencies beyond Node.js for the validator.
- The validator uses only built-in Node.js modules. Never add external dependencies to it.
- All validator checks must be deterministic — same vault always produces same output.
- Registration scripts must be idempotent and marker-managed. Never overwrite user global instructions outside Ariadne marker blocks.
- New validator warnings must be non-fatal unless they represent a structural impossibility.
- Every new validator counter needs: logic in JS + return object entry + counters array entry + `docs/guides/validator.md` update + `SKILL.md` healthy output update + `README.md` healthy output update + test fixture.
- `agents/openai.yaml` is required for each skill for Codex CLI display metadata.
- Do not add placeholder skill folders; planned skills stay in docs until they are complete.
- Public docs must not include private vault content, maintainer-local absolute paths, secrets, client data, or personal workflow defaults.
- Ariadne behavior must stay Obsidian/vault-specific. Generic runtime-adaptive coordination belongs outside this repo.
- Do not commit `CLAUDE.local.md`, `GEMINI.local.md`, or `AGENTS.override.md` — these are machine-local.

## Local Setup (gitignored files)

To connect this repo to a local Obsidian vault, create these files (all gitignored):

- `CLAUDE.local.md` — appended to `CLAUDE.md` by Claude Code; add your vault path and routing
- `GEMINI.local.md` — appended to `GEMINI.md` by Gemini CLI; same content
- `AGENTS.override.md` — replaces `AGENTS.md` for Codex CLI; copy `AGENTS.md` and add your local vault section at the bottom
