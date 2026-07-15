# Documentation And Diagram Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align public documentation and diagrams with Ariadne v0.2.0 and proven nested-scope behavior.

**Architecture:** Keep canonical details close to their owning surfaces: validator specifics in the validator guide, workflow diagrams in README/quickstart/operating-model references, and nested-scope constraints in the scope skill and recursive-scope references. Repository mutation tests enforce high-value cross-document contracts without attempting to lint prose generally.

**Tech Stack:** Markdown, Mermaid, dependency-free Node.js repository guardrails.

## Global Constraints

- Do not change validator runtime behavior or research architecture.
- Avoid hard-coded validator counter totals outside the canonical counter reference.
- Preserve unrelated untracked files and public-boundary rules.

---

### Task 1: Add documentation drift guardrails

**Files:**
- Modify: `scripts/test_validate_repo.js`
- Modify: `scripts/validate_repo.js`

- [ ] Add failing assertions for stale validator-count claims, missing published-release state, incomplete contributor skill structure, and missing nested-scope contract language.
- [ ] Run `node scripts/test_validate_repo.js` and confirm the new assertions fail for the intended missing documentation.
- [ ] Add minimal deterministic repository checks for the durable cross-document contracts.
- [ ] Re-run the mutation tests and confirm they pass.

### Task 2: Refresh reader-facing guides and diagrams

**Files:**
- Modify: `README.md`
- Modify: `docs/guides/quickstart.md`
- Modify: `docs/releases/v0.2.0.md`
- Modify: `skills/vault/references/vault-operating-model.md`

- [ ] Replace stale validator totals with canonical-guide references.
- [ ] Update the README overview Mermaid diagram.
- [ ] Add a research lifecycle Mermaid diagram to the quickstart.
- [ ] Separate general capture and research lifecycle diagrams in the operating model.
- [ ] Record the published v0.2.0 release state and durable evidence pointers.

### Task 3: Encode proven nested-scope behavior

**Files:**
- Modify: `skills/scope/SKILL.md`
- Modify: `skills/vault/references/recursive-scopes.md`
- Modify: `skills/vault/references/bases-scope-patterns.md`
- Modify: `docs/pressure-scenarios/recursive-scopes.md`

- [ ] Require child-before-parent Base formula ordering.
- [ ] Require explicit root and parent inheritance wording.
- [ ] Require scoped validation before whole-vault validation and separate new findings from unrelated warnings.
- [ ] Add pressure scenarios for ordering, inheritance, validation isolation, and unrelated-dirty-work preservation.

### Task 4: Refresh contributor and public-boundary surfaces

**Files:**
- Modify: `CONTRIBUTING.md`
- Modify: `PUBLIC_BOUNDARY.md`
- Modify: `AGENTS.md`

- [ ] Add missing skills and guides to repository maps.
- [ ] State that every skill requires `agents/openai.yaml`.
- [ ] Describe research boundaries, stewardship, closeout, explicit targets, and bounded write sets as public Ariadne behavior.

### Task 5: Verify and publish

- [ ] Run all repository, validator, template, registration, and workspace-instruction tests.
- [ ] Run committed-tree repository guardrails to exclude unrelated untracked files.
- [ ] Review `main...HEAD`, commit only scoped changes, push `documentation-diagram-refresh`, and open a pull request targeting `main`.
