# Ariadne — Agent Instructions

Ariadne is a skill package for building Obsidian vaults that AI agents can navigate, maintain, and operate reliably.

## What This Repo Contains

```
skills/
  vault/        ← vault bootstrap skill + templates (`ariadne:vault`)
    scripts/register_vault.js    ← optional machine-level vault registration
    test/test_register_vault.js  ← registration script tests
  global-discovery/ ← workflow skill for registering existing vaults (`ariadne:global-discovery`)
  workspace-instructions/ ← workspace instruction files (`ariadne:workspace-instructions`)
  scope/        ← scope creation and wiring (`ariadne:scope`)
  navigation/   ← hub and routing design (`ariadne:navigation`)
  knowledge-capture/ ← raw input → durable notes (`ariadne:knowledge-capture`)
  research-ingest/      ← research input routing and handoff (`ariadne:research-ingest`)
  research-pipeline/    ← domain research pipeline setup (`ariadne:research-pipeline`)
  research-synthesis/   ← synthesis disposition and promotion (`ariadne:research-synthesis`)
  research-stewardship/ ← scoped research audit and repair (`ariadne:research-stewardship`)
  workstream-tracking/     ← Kanban boards and Dataview dashboards (`ariadne:workstream-tracking`)
  closeout/     ← work checkpoint, durable capture, and safe-to-close decisions (`ariadne:closeout`)
  maintenance/  ← health checks and repair (`ariadne:maintenance`)
  validator/    ← deterministic structural validation (`ariadne:validator`)
    scripts/validate_vault.js    ← the validator (Node.js, no deps)
    scripts/validate_vault.sh    ← shell wrapper
    test/                        ← test fixtures and runner
scripts/
  validate_repo.js               ← public-boundary and repository guardrail checks
docs/
  guides/quickstart.md          ← usage scenarios and skill chains
  guides/global-discovery.md     ← cold-agent vault discovery registration
  guides/research-lifecycle-migration.md ← breaking research lifecycle migration
  guides/weekly-maintenance-automation.md ← recurring maintenance automation prompt
  guides/validator.md            ← validator counter reference
  releases/                      ← published release notes
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
| Edit vault discovery skill | `skills/global-discovery/SKILL.md` |
| Edit global discovery audit rubric | `skills/global-discovery/references/discovery-rules.md` |
| Edit workspace instruction skill | `skills/workspace-instructions/SKILL.md` |
| Edit workspace instruction checker | `skills/workspace-instructions/scripts/check_workspace.js` |
| Edit workspace instruction scenarios | `skills/workspace-instructions/references/workspace-instruction-scenarios.md` |
| Edit workspace instruction audit rubric | `skills/workspace-instructions/references/instruction-file-rules.md` |
| Edit reference documentation | `skills/vault/references/` |
| Edit research ingest orchestration | `skills/research-ingest/SKILL.md` |
| Edit research synthesis | `skills/research-synthesis/SKILL.md` |
| Edit research stewardship | `skills/research-stewardship/SKILL.md` |
| Edit domain research pipeline setup | `skills/research-pipeline/SKILL.md` |
| Edit the validator | `skills/validator/scripts/validate_vault.js` |
| Run the validator | `node skills/validator/scripts/validate_vault.js "/path/to/vault"` |
| Run the test suite | `node skills/validator/test/test_recursive_scopes.js` |
| Run registration tests | `node skills/vault/test/test_register_vault.js` |
| Run workspace instruction tests | `node skills/workspace-instructions/test/test_workspace_instructions.js` |
| Run repo guardrails | `node scripts/validate_repo.js` |
| Run skill guardrails | `node scripts/validate_repo.js --skills-only` |
| Read validator counter docs | `docs/guides/validator.md` |
| Read usage scenarios and skill chains | `docs/guides/quickstart.md` |
| Read research lifecycle migration guidance | `docs/guides/research-lifecycle-migration.md` |
| Read global discovery docs | `docs/guides/global-discovery.md` |
| Read weekly automation prompt | `docs/guides/weekly-maintenance-automation.md` |
| Read public boundary | `PUBLIC_BOUNDARY.md` |
| Read security policy | `SECURITY.md` |

## Rules

- Skills are Markdown — no build step, no dependencies beyond Node.js for the validator.
- The validator uses only built-in Node.js modules. Never add external dependencies to it.
- All validator checks must be deterministic — same vault always produces same output.
- Registration scripts must be idempotent and marker-managed. Never overwrite user global instructions outside Ariadne marker blocks.
- Workspace instruction-file updates must be bounded and marker-managed where possible. Preserve user instructions outside Ariadne workspace-vault-link markers.
- New validator warnings must be non-fatal unless they represent a structural impossibility.
- Every new validator counter needs: logic in JS + return object entry + counters array entry + `docs/guides/validator.md` update + `SKILL.md` healthy output update + `README.md` healthy output update + test fixture.
- `agents/openai.yaml` is required for each skill for Codex CLI display metadata.
- Do not add placeholder skill folders; planned skills stay in docs until they are complete.
- Public docs must not include private vault content, maintainer-local absolute paths, secrets, client data, or personal workflow defaults.
- Ariadne behavior must stay Obsidian/vault-specific. Generic runtime-adaptive coordination belongs outside this repo.
- Do not commit `CLAUDE.local.md`, `GEMINI.local.md`, or `AGENTS.override.md` — these are machine-local.

## Local Setup (gitignored files)

To connect this repo to a local Obsidian vault, create these files (all gitignored):

- `CLAUDE.local.md` — optional Claude local memory/context; do not import it from tracked `CLAUDE.md` by default
- `GEMINI.local.md` — optional Ariadne local context convention for Gemini workflows; only use it when your local Gemini setup loads it or you explicitly add a local import
- `AGENTS.override.md` — replaces `AGENTS.md` for Codex CLI. Codex reads only one file per directory and prefers the override, so it does **not** merge with `AGENTS.md` — it fully replaces it. Copy `AGENTS.md` verbatim, then add your local vault section at the bottom inside the `ariadne:workspace-vault-link` marker block. Re-sync the copied body whenever `AGENTS.md` changes, or Codex will read stale repo guidance.
