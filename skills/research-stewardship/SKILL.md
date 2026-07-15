---
name: ariadne:research-stewardship
description: Use when auditing or repairing provenance, compilation coverage, stale synthesis, unresolved questions, circular corroboration, nested-boundary isolation, or legacy research drift within one named Obsidian research boundary.
---

# Ariadne Research Stewardship

Audit one named research boundary first. Repair only deterministic, meaning-preserving drift through a declared exact write set.

## Authorization And Modes

1. Require a current-turn named or confirmed research boundary in a multi-scope vault. A likely match is not authorization.
2. Read instructions from the vault root through every ancestor scope to the target. Read the boundary descriptor, canonical hubs, inquiry and synthesis entrypoints, and validator output progressively.
3. Choose `audit`, `repair`, or `legacy-adoption` explicitly.
4. In `audit` mode perform zero mutations: no reports in the vault, metadata normalization, link edits, queue items, or opportunistic fixes. Return findings and a proposed exact write set in chat.
5. In `repair` mode state the exact `allowed_write_set` before editing. Keep every mutation inside it. A newly discovered path is deferred until it is explicitly added.

The selected boundary does not authorize sibling scopes, parent/root navigation, or downstream destinations. Folder ancestry does not establish boundary membership.

## Audit Contract

Audit the declared boundary for:

- descriptor and hub consistency
- canonical downstream-to-upstream `derived_from` provenance
- raw sources marked `compiled` without a derived note
- source-only and needs-review coverage
- possible provenance cycles or circular corroboration
- evidence roles and generated or derivative evidence families
- stale synthesis, contradictions, supersession candidates, and unresolved questions
- exact versus explicit descendant rollup behavior
- nested child boundary isolation
- older pipeline drift and adoption readiness

Report semantic ambiguity; do not guess. A structurally valid boundary may still be semantically stale.

## Automatic Repair Allowlist

Automatic repair is limited to:

- path-qualifying a uniquely resolved link
- restoring a descriptor-declared hub edge
- linking an existing Base from its existing sibling Base index
- normalizing a schema value without changing its meaning

No other automatic repair is allowed. Each edit must be supported by existing canonical structure, remain inside the exact write set, preserve user content, and be idempotent: a second repair run produces no further mutations.

Always defer evidence-role classification, provenance-root merging or deletion, contradiction or supersession resolution, compilation versus source-only decisions, synthesis rewrites, promotion, moves, renames, merges, deletion, cross-scope rehoming, and any ambiguous link target.

## Nested Children And Legacy Adoption

Read a nested child boundary for context when needed, but do not repair it under the parent's contract. Before any child edit, read the child's ancestor and local instructions, descriptor, and exact write set. Parent conventions never overwrite a child's explicit contract. A parent `rollup` includes only the child descriptors listed in `rollup_boundaries`.

Treat older pipelines without a supported `research_schema` as legacy. Audit may inventory them, but adoption is opt-in and scope-local. In `legacy-adoption` mode map existing structure first, preserve stable paths, adopt before creating parallels, and add a descriptor only after mapping is unambiguous or confirmed. Apply only allowlisted repairs automatically; propose moves, renames, template changes, and synthesis changes for review.

## Validation And Report

After repair or opt-in adoption, run scoped research validation first:

```text
validate_vault.js "/path/to/vault" --scope "<scope_path>" --profile research
```

Then run whole-vault validation to detect collateral effects. Re-run stewardship in audit mode or compare hashes to prove idempotency. Scoped findings must remain a subset of whole-vault findings for the same state.

Report mode, target boundary, instructions read, findings, exact write set, repairs, deferrals, scoped validation, whole-vault validation, and second-run idempotency. Recommended cadence is weekly for active or automated-ingest research, monthly for stable research, and event-driven after large imports, major synthesis changes, or detected drift.
