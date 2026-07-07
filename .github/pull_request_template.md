## What this changes

<!-- One sentence: which skill, guide, or validator check, and what it does differently -->

## Why

<!-- The agent behavior or edge case this fixes or improves -->

## Checklist

- [ ] Changes a `SKILL.md` — tested against a real vault or documented the expected agent behavior
- [ ] Changes the validator — added/updated a test fixture in `skills/validator/test/fixtures/`
- [ ] Changes the validator — updated `docs/guides/validator.md` counter reference
- [ ] Changes the validator — updated the healthy output block in both `SKILL.md` and `README.md`
- [ ] Adds a new skill — added a row to the Skills table in `README.md` and an `agents/openai.yaml`
- [ ] Adds a new skill — the folder is complete and not a placeholder
- [ ] Changes workspace instructions — added/updated scenario coverage in `skills/workspace-instructions/test/fixtures/`
- [ ] Changes workspace instructions — ran `node skills/workspace-instructions/test/test_workspace_instructions.js`
- [ ] Public boundary checked — Ariadne behavior stays Obsidian/vault-specific and does not copy generic coordination from Kybernetes
- [ ] Public safety checked — no private vault content, client data, secrets, OS metadata, or maintainer-local absolute paths
- [ ] CI updated when repo guardrails, workflows, or skill entrypoints changed
- [ ] No CLAUDE.local.md, GEMINI.local.md, or AGENTS.override.md in the diff
