# Contributing to Ariadne

## What This Is

Ariadne is a skill package for Claude Code and other AI agents. Skills are Markdown files — no build step, no dependencies beyond Node.js for the validator.

## Structure

```
skills/
  obsidian-agentic-vault/     ← vault bootstrap skill + templates
  obsidian-scope-manager/     ← scope creation and wiring
  obsidian-navigation-architect/ ← hub and routing design
  obsidian-ingest-compile/    ← raw input → durable notes
  obsidian-research-ingest/   ← cold-start research source routing
  obsidian-research-synthesis/ ← multi-source synthesis
  obsidian-research-pipeline/ ← domain research pipeline setup
  obsidian-vault-maintainer/  ← health checks and repair
  obsidian-vault-validator/   ← deterministic structural validation
    scripts/validate_vault.js ← the validator (Node.js, no deps)
docs/
  guides/validator.md         ← validator counter reference
  pressure-scenarios/         ← edge case docs
```

## How to Contribute

### Improving a skill

Each skill is a `SKILL.md` file — plain Markdown instructions for the agent. Edit the relevant `SKILL.md` directly.

Good contributions:
- Tightening rules that are ambiguous in practice
- Adding missing edge cases you encountered
- Fixing instructions that produce wrong agent behavior

### Adding a new check to the validator

1. Add the check logic in `skills/obsidian-vault-validator/scripts/validate_vault.js`
2. Add the counter to the `return` object and the `counters` print loop in `printResults()`
3. Add a row to the counter reference table in `docs/guides/validator.md`
4. Add the counter to the healthy output in `SKILL.md` and `README.md`
5. Add a test fixture under `skills/obsidian-vault-validator/test/fixtures/`

### Adding a new skill

1. Create `skills/<skill-name>/SKILL.md`
2. Add an `agents/` folder with at least `openai.yaml` if you want multi-agent support
3. Add a row to the Skills table in `README.md`

### Test fixtures

The validator has fixtures under `skills/obsidian-vault-validator/test/fixtures/`. Each fixture is a minimal vault that exercises one check. Add a fixture for any new check.

## Validator rules

- The validator uses only built-in Node.js modules — no `npm install` required
- All checks must be deterministic — same vault always produces same output
- New warnings should be non-fatal (don't add to the exit-code check) unless they represent a structural impossibility
- Every new counter needs: logic in JS, entry in return object, entry in counters array, docs update, healthy output update

## Style

- Skill instructions: direct imperative ("Read X", "Add a row", "Do not duplicate")
- No filler ("In order to", "Please", "You should")
- Reference file paths explicitly — agents need exact paths, not vague descriptions
