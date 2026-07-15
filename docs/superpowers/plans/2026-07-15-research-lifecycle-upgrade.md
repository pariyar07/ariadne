# Research Lifecycle Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> [!IMPORTANT]
> This implementation plan is complete and partially superseded by the direct-breaking v0.2.0 release decision. Do not execute its former compatibility-adapter steps. v0.2.0 removes the retired skill folders and requires installed-copy cleanup.

**Goal:** Ship a scope-safe, provenance-aware Ariadne research lifecycle with versioned schema, deterministic scoped validation, direct removal of retired skills, migration guidance, and private behavioral evaluation.

**Architecture:** Research behavior is split across pipeline topology, ingest orchestration, general compilation, synthesis disposition, and audit-first stewardship. A versioned `research-boundary` descriptor establishes membership independently of folder layout; research artifacts use flat schema-v1 metadata and downstream-to-upstream provenance. The existing validator inventories the whole vault, resolves one canonical target per link, computes all findings, then filters scoped/profile output without changing the no-flag contract.

**Tech Stack:** Markdown skills/templates, Obsidian Bases YAML, dependency-free Node.js validator and test runners, GitHub Actions guardrails, private deterministic Node.js eval harness.

## Global Constraints

- Preserve unrelated user changes; never touch or stage the unrelated untracked `report.md`.
- Public files must contain no private vault content, maintainer-local absolute paths, secrets, client data, or private eval evidence.
- The validator remains dependency-free and deterministic; research warnings are non-fatal.
- No-flag validator output and exit behavior remain compatible.
- Always inventory the whole vault before scoped filtering; nested scopes are never treated as vault roots.
- Research schema v1 supports top-level scalar values and flat scalar lists only.
- Legacy research without a supported `research_schema` receives no unconditional new-schema warnings.
- Retired skill names are allowed only in migration/release documentation, decision history, and bounded stale-name tests.
- v0.2.0 removes the retired skill folders without a compatibility release.
- Do not push until all in-scope verification gates pass; do not merge pull requests.

---

### Task 1: Establish migration guardrails and red contract tests

**Files:**
- Modify: `scripts/validate_repo.js`
- Modify: `skills/workspace-instructions/scripts/check_workspace.js`
- Modify: `skills/workspace-instructions/test/test_workspace_instructions.js`
- Create: `skills/workspace-instructions/test/fixtures/retired_research_skill_names/scenario.json`
- Create: `skills/workspace-instructions/test/fixtures/current_research_skill_names/scenario.json`

**Interfaces:**
- Consumes: current tracked/untracked file inventory and marker-managed workspace instruction checks.
- Produces: repository allowlist for compatibility/migration history and bounded stale-name detection for generated instruction files.

- [ ] Write tests that fail because current names are rejected and retired names are not detected in bounded generated-instruction surfaces.
- [ ] Run `node skills/workspace-instructions/test/test_workspace_instructions.js` and confirm the new scenarios fail for the missing behavior.
- [ ] Invert the active-name guardrail, add a path-bounded retired-name allowlist, and implement report/repair guidance that preserves text outside Ariadne markers.
- [ ] Re-run workspace tests and `node scripts/validate_repo.js --skills-only`; confirm only the unrelated `report.md` findings remain.

### Task 2: Ship the research skill family and ownership handoffs

**Files:**
- Create: `skills/research-ingest/SKILL.md`
- Create: `skills/research-ingest/agents/openai.yaml`
- Create: `skills/research-synthesis/SKILL.md`
- Create: `skills/research-synthesis/agents/openai.yaml`
- Create: `skills/research-stewardship/SKILL.md`
- Create: `skills/research-stewardship/agents/openai.yaml`
- Delete: retired ingest skill folder (see the v0.2.0 migration guide for its historical path)
- Delete: retired synthesis skill folder (see the v0.2.0 migration guide for its historical path)
- Modify: `skills/research-pipeline/SKILL.md`
- Modify: `skills/knowledge-capture/SKILL.md`
- Modify: `skills/maintenance/SKILL.md`
- Modify: `skills/closeout/SKILL.md`
- Modify: `skills/navigation/SKILL.md`
- Modify: `skills/scope/SKILL.md`
- Modify: `skills/vault/SKILL.md`

**Interfaces:**
- Produces handoff envelope fields: `target_scope`, `research_boundary`, `allowed_write_set`, `source_type`, `evidence_role`, `derived_from`, `inquiry_links`, `pipeline_state`, `requested_operation`.
- `research-ingest` confirms target/write set; `knowledge-capture` compiles only inside it; `research-synthesis` owns dispositions; `research-stewardship` audits/repairs one boundary.

- [ ] Run baseline pressure/eval scenarios without the new skills and retain the observed scope/ownership failures in the private eval lab.
- [ ] Write the three complete successor skills and UI metadata; remove both retired skill folders for v0.2.0.
- [ ] Rewrite ownership boundaries and ancestor-instruction/write-set requirements across companion skills.
- [ ] Encode stewardship audit zero-write behavior, exact repair write set, idempotency, allowlist, deferrals, nested-child rules, opt-in legacy adoption, and scoped plus whole-vault post-repair validation.
- [ ] Run skill guardrails and focused stale-name searches; inspect every surviving retired-name hit.

### Task 3: Add research schema-v1 templates and correct pipeline views

**Files:**
- Modify: `skills/vault/assets/templates/Raw Source Note.md`
- Modify: `skills/vault/assets/templates/Research Note.md`
- Modify: `skills/vault/assets/templates/Decision Note.md`
- Modify: `skills/vault/assets/templates/AGENTS.md`
- Modify: `skills/vault/assets/templates/Vault Health Check Procedure.md`
- Modify: `skills/vault/assets/templates/Knowledge Health Check.md`
- Modify: `skills/vault/assets/templates/Research Pipeline.base`
- Create: `skills/vault/assets/templates/Research Boundary.md`
- Create: `skills/vault/assets/templates/Research Inquiry.md`
- Create: `skills/vault/assets/templates/Research Synthesis.md`
- Modify: `skills/vault/assets/templates/Templates Index.md`
- Modify: `skills/vault/assets/templates/Bases Index.md`
- Modify: `skills/vault/assets/templates/Ingest Compile Workflow.md`
- Modify: `skills/vault/assets/templates/Knowledge Processing Architecture.md`

**Interfaces:**
- Produces descriptor `type: research-boundary`, `research_schema: 1`, stable boundary/hub fields, `view_mode`, and `rollup_boundaries`.
- Produces artifact fields `research_boundary`, `derived_from`, `inquiries`, `evidence_role`, `compilation_status`, `research_basis`, and optional `promoted_to`.

- [ ] Add a generated-vault fixture test that first fails on missing descriptors, inquiry history, provenance, and exact boundary filtering.
- [ ] Add templates using only top-level scalars and flat scalar lists, with append-only inquiry disposition history.
- [ ] Correct `Research Pipeline.base` to use descriptor membership and declared research types without absorbing downstream product/decision/roadmap notes or child boundaries.
- [ ] Generate realistic root and nested vault fixtures and validate their links, Base scope filters, exact/rollup semantics, and arbitrary folder layout.

### Task 4: Add validator CLI, canonical link resolution, and research counters

**Files:**
- Modify: `skills/validator/scripts/validate_vault.js`
- Modify: `skills/validator/test/test_recursive_scopes.js`
- Create: `skills/validator/test/fixtures/recursive_scopes/research_schema_valid/**`
- Create: `skills/validator/test/fixtures/recursive_scopes/research_schema_warnings/**`
- Create: `skills/validator/test/fixtures/recursive_scopes/research_legacy_gated/**`
- Create: `skills/validator/test/fixtures/recursive_scopes/research_semantically_stale_structurally_valid/**`
- Create: `skills/validator/test/fixtures/recursive_scopes/scoped_research_sibling_isolation/**`
- Modify: `skills/validator/SKILL.md`
- Modify: `docs/guides/validator.md`
- Modify: `README.md`

**Interfaces:**
- CLI accepts `VAULT [--scope VAULT_RELATIVE] [--profile research]` and rejects absolute/traversal scopes.
- Return/output registers `research-boundary-warnings`, `research-provenance-warnings`, `provenance-cycle-warnings`, `uncompiled-raw-source-warnings`, and `research-hub-warnings`.

- [ ] Extend the test runner to pass CLI args and register all five expected counters; run it and confirm red failures.
- [ ] Add failing fixtures for scope validation, sibling isolation, nearest-scope bare links, flat-list parsing, descriptor/hub errors, provenance errors/cycles, compilation coverage, legacy gating, and semantic non-claims.
- [ ] Implement deterministic argument parsing and normalized scope containment without changing no-flag output.
- [ ] Implement flat scalar/list frontmatter parsing and nearest-scope bare-link resolution that credits exactly one target.
- [ ] Index supported descriptors, compute exact/rollup membership and downstream-to-upstream provenance, then produce non-fatal schema-gated warnings.
- [ ] Compute whole-vault findings first and filter diagnostics/counters/status to the selected scope/profile.
- [ ] Update every required documentation/healthy-output surface and run the complete validator test runner.

### Task 5: Migrate active public documentation and version automation guidance

**Files:**
- Modify: `README.md`
- Modify: `docs/guides/quickstart.md`
- Modify: `docs/guides/weekly-maintenance-automation.md`
- Modify: `CONTRIBUTING.md`
- Modify: `AGENTS.md`
- Modify: applicable public templates/references under `skills/vault/`

**Interfaces:**
- Active docs use successor names; migration/release sections explicitly name removed skills.
- Weekly prompt exposes a stable prompt-version marker and routes research semantics to stewardship.

- [ ] Add/extend guardrail assertions for active-name coverage, retired-name allowlist boundaries, and automation prompt version marker.
- [ ] Migrate intentional active references without replacing ordinary uses of the word “synthesis.”
- [ ] Document installed-skill cleanup, saved prompt/external scheduler limitations, generated-vault opt-in migration, and `AGENTS.override.md` body resynchronization.
- [ ] Record v0.2.0 as the direct-breaking removal release and document mandatory installed-copy cleanup.
- [ ] Re-run both repository guardrail modes and inspect all stale-name matches.

### Task 6: Add private deterministic research lifecycle evaluation

**Files (private eval repository):**
- Create: `contracts/research-lifecycle-contracts.json`
- Create: `fixtures/research-lifecycle/manifest.md`
- Create: `fixtures/research-lifecycle/scenarios/*.md`
- Create: `scripts/build_research_lifecycle_fixture.js`
- Create: `scripts/research_lifecycle_oracle.js`
- Create: `scripts/test_research_lifecycle_fixture.js`
- Create: `scripts/test_research_lifecycle_oracle.js`
- Modify: `run_evals.js`
- Modify: `scripts/validate_lab.js`
- Modify: `package.json`
- Modify: `results/run-metadata.schema.json`
- Modify: `results/latest-deterministic-check.md`

**Interfaces:**
- Metadata pins baseline/candidate Ariadne commits, eval-lab commit, and installed skill-name sets.
- Oracles assert stdout/counters, tree hashes for read-only behavior, allowed/forbidden write roots, hidden-contract isolation, and snapshot chains.

- [ ] Write failing oracle tests for explicit write sets, no-confirmation zero writes, provenance/mirrors, dispositions, promotion without evidence movement, nested isolation, stewardship audit/repair/defer/idempotency, scoped validator consistency, removed skills/stale installed copies, and legacy gating.
- [ ] Build deterministic generated fixtures and hidden contracts without real vault context.
- [ ] Implement hash, write-root, stdout/counter, metadata-pin, and isolation assertions.
- [ ] Wire research checks into `npm run evals`, run focused tests, then run the full suite with `ARIADNE_REPO` pointing to the candidate checkout.

### Task 7: Full verification, review, and publication

**Files:** all changed public/private files; no unrelated files.

**Interfaces:** produces verified commits and two unmerged pull requests targeting `main` when both repositories change.

- [ ] Run validator tests, repository/skill guardrails, registration tests, workspace-instruction tests, and generated-template validation.
- [ ] Run the full private deterministic eval suite against the candidate Ariadne checkout.
- [ ] Hash the private vault tree, run the validator read-only against it, hash again, and confirm no mutation; do not repair or migrate it.
- [ ] Review `git status`, staged diff, unstaged diff, and untracked files in both repositories; explicitly exclude `report.md` and unrelated changes.
- [ ] Complete whole-branch spec/code review and fix every in-scope finding.
- [ ] Stage explicit paths only, commit coherent changes, re-run required gates, inspect status/diff again, push `research-lifecycle-upgrade`, and create separate PRs targeting `main`.
- [ ] Cross-link PRs and include implementation, migration/compatibility, remaining release decisions, and exact verification evidence; do not merge.
