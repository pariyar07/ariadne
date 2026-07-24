## What this changes

<!-- One sentence: which skill, guide, or validator check, and what it does differently -->

## Why

<!-- The agent behavior or edge case this fixes or improves -->

## Evaluation gate

Complete this public-safe attestation. Significant changes require `pass` or `pass-with-limitations`; exempt changes require `not-required` and a concrete rationale. Do not include private evaluation locations or hidden evidence.

<!-- ariadne:release-attestation:start -->
```json
{
  "schemaVersion": 1,
  "changeId": "replace-me",
  "classification": "exempt",
  "verdict": "not-required",
  "evidenceId": null,
  "evidenceSha256": null,
  "limitations": [],
  "exemptionRationale": "replace-me",
  "approvedBy": "replace-me",
  "approvedAt": "replace-me"
}
```
<!-- ariadne:release-attestation:end -->

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
- [ ] Evaluation classification is accurate and the attestation contains no private details
