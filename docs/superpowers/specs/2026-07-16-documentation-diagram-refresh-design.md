# Documentation And Diagram Refresh Design

## Goal

Bring Ariadne's public documentation, skill guidance, and diagrams into alignment with the released v0.2.0 product and the first real nested-child scope creation.

## Scope

- Correct stale validator-count and release-state claims.
- Replace the README overview diagram with a version-independent system view.
- Add a boundary-aware research lifecycle diagram and a nested-scope wiring diagram.
- Split generic knowledge capture from research-specific lifecycle behavior in operating-model guidance.
- Encode most-specific-first Base formulas, explicit root/parent inheritance, scoped-then-whole validation, and unrelated-dirty-work preservation.
- Refresh contributor documentation, public product boundaries, guide routing, and recursive-scope pressure scenarios.

## Constraints

- Keep the public product generic and free of private vault paths or evidence.
- Do not hard-code a validator counter total in reader-facing summaries; the validator guide remains canonical.
- Do not change validator behavior or research architecture.
- Do not add image binaries or duplicate diagrams outside their owning documents.
- Preserve unrelated untracked `.superpowers/`, `report.md`, and the existing scope-topology specification.

## Verification

- Add repository guardrail assertions for corrected documentation contracts.
- Run repository mutation tests, both repository guardrails, validator tests, template tests, registration tests, and workspace-instruction tests.
- Inspect Mermaid blocks and links as source and review the final diff for retired names, stale counts, private paths, and unrelated files.
