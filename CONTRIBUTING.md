# Contributing to Ariadne

## What This Is

Ariadne is a skill package for Claude Code and other AI agents. Skills are Markdown files — no build step, no dependencies beyond Node.js for the validator.

## Structure

```
skills/
  vault/     ← vault bootstrap skill + templates (`ariadne:vault`)
  scope/     ← scope creation and wiring (`ariadne:scope`)
  navigation/ ← hub and routing design (`ariadne:navigation`)
  knowledge-capture/ ← raw input → durable notes (`ariadne:knowledge-capture`)
  research-ingest/   ← research input routing and handoff (`ariadne:research-ingest`)
  research-synthesis/ ← synthesis disposition and promotion candidates (`ariadne:research-synthesis`)
  research-stewardship/ ← scoped research audit and repair (`ariadne:research-stewardship`)
  research-pipeline/ ← domain research pipeline setup (`ariadne:research-pipeline`)
  workstream-tracking/  ← Kanban boards and Dataview dashboards (`ariadne:workstream-tracking`)
  global-discovery/ ← existing vault discovery registration (`ariadne:global-discovery`)
  workspace-instructions/ ← workspace instruction files (`ariadne:workspace-instructions`)
  maintenance/ ← health checks and repair (`ariadne:maintenance`)
  validator/   ← deterministic structural validation (`ariadne:validator`)
    scripts/validate_vault.js ← the validator (Node.js, no deps)
docs/
  guides/global-discovery.md  ← global discovery registration guide
  guides/validator.md         ← validator counter reference
  pressure-scenarios/         ← edge case docs
```

## How to Contribute

Read `PUBLIC_BOUNDARY.md` before proposing new behavior. Ariadne owns Obsidian vault structure, scopes, navigation, Bases, validation, maintenance, ingest, and vault-specific adapters. Generic runtime-adaptive coordination belongs outside this repository.

Read `SECURITY.md` before reporting a vulnerability. Do not paste private vault content, secrets, client data, production logs, or maintainer-local paths into public issues or pull requests.

### Improving a skill

Each skill is a `SKILL.md` file — plain Markdown instructions for the agent. Edit the relevant `SKILL.md` directly.

Good contributions:
- Tightening rules that are ambiguous in practice
- Adding missing edge cases you encountered
- Fixing instructions that produce wrong agent behavior

### Adding a new check to the validator

1. Add the check logic in `skills/validator/scripts/validate_vault.js`
2. Add the counter to the `return` object and the `counters` print loop in `printResults()`
3. Add a row to the counter reference table in `docs/guides/validator.md`
4. Add the counter to the healthy output in `SKILL.md` and `README.md`
5. Add a test fixture under `skills/validator/test/fixtures/`

### Adding a new skill

1. Create `skills/<skill-name>/SKILL.md`
2. Add an `agents/` folder with at least `openai.yaml` if you want multi-agent support
3. Add a row to the Skills table in `README.md`
4. Run `node scripts/validate_repo.js --skills-only`

Do not add placeholder skill folders. Planned skills should stay in docs until they are ready to ship as complete skills.

### Changing global discovery

1. Update `skills/vault/scripts/register_vault.js`
2. Update `skills/vault/test/test_register_vault.js`
3. Update `skills/global-discovery/SKILL.md`
4. Update `docs/guides/global-discovery.md`

### Changing workspace instructions

1. Update `skills/workspace-instructions/SKILL.md` for judgment rules.
2. Update `skills/workspace-instructions/references/workspace-instruction-files.md` for file patterns.
3. Update `skills/workspace-instructions/references/workspace-instruction-scenarios.md` for scenario expectations.
4. Update `skills/workspace-instructions/scripts/check_workspace.js` only for deterministic mechanical signals.
5. Add or update JSON fixtures under `skills/workspace-instructions/test/fixtures/`.
6. Run `node skills/workspace-instructions/test/test_workspace_instructions.js`.

### Test fixtures

The validator has fixtures under `skills/validator/test/fixtures/`. Each fixture is a minimal vault that exercises one check. Add a fixture for any new check.

Workspace-instructions fixtures live under `skills/workspace-instructions/test/fixtures/`. They must use JSON-embedded file content and materialize local-only filenames only in temporary directories during tests.

## Validator rules

- The validator uses only built-in Node.js modules — no `npm install` required
- All checks must be deterministic — same vault always produces same output
- New warnings should be non-fatal (don't add to the exit-code check) unless they represent a structural impossibility
- Every new counter needs: logic in JS, entry in return object, entry in counters array, docs update, healthy output update

## Repository guardrails

Run these before opening a pull request:

```bash
node scripts/validate_repo.js
node scripts/validate_repo.js --skills-only
node scripts/test_validate_repo.js
node skills/workspace-instructions/test/test_workspace_instructions.js
node skills/validator/test/test_recursive_scopes.js
node skills/vault/test/test_register_vault.js
```

The repo validator blocks placeholder skill folders, missing skill entrypoints, maintainer-local absolute paths, private vault references, OS metadata files, and local-only agent override files.

## Style

- Skill instructions: direct imperative ("Read X", "Add a row", "Do not duplicate")
- No filler ("In order to", "Please", "You should")
- Reference file paths explicitly — agents need exact paths, not vague descriptions
