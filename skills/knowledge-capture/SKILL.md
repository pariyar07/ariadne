---
name: ariadne:knowledge-capture
description: Use when links, documents, PDFs, transcripts, screenshots, meeting notes, observations, brain dumps, or other material must be compiled into an explicitly selected Obsidian vault destination.
---

# Ariadne Knowledge Capture

Compile material after its destination and write set are known. This skill does not select a research scope, create research topology, classify evidence independently, or judge synthesis disposition.

## Authorization

1. Require a known destination and explicit `allowed_write_set` before writing. In a multi-scope vault, the target must be named or confirmed in the current turn.
2. Read root instructions and every ancestor scope instruction through the target.
3. Read relevant indexes, agent navigation, routing, local ingest workflow, and folder hubs progressively.
4. Keep every mutation inside the write set. Parent/root navigation, sibling scopes, and downstream destinations require individually named paths.

For research, consume the full `ariadne:research-ingest` handoff envelope without changing it:

```text
target_scope
research_boundary
allowed_write_set
source_type
evidence_role
derived_from
inquiry_links
pipeline_state
requested_operation
```

If a research envelope is missing, ambiguous, or requests paths outside the set, return to `ariadne:research-ingest`. Route missing topology to `ariadne:research-pipeline` rather than creating it silently.

## Capture And Compile

1. Capture one canonical raw artifact when the source must remain inspectable. For research, preserve `source_type`, `evidence_role`, `derived_from`, and `research_boundary` exactly from the handoff. Map handoff `inquiry_links` to artifact field `inquiries`; use an empty flat list when no inquiry is known.
2. Separate observed or source claims from interpretation.
3. Compile the smallest durable note or notes supported by the material.
4. For research, link compiled artifacts downstream to upstream with `derived_from`; preserve `inquiry_links` without inventing an inquiry.
5. Link artifacts from authorized local hubs. Report any out-of-set navigation obligation instead of expanding scope.
6. Add follow-up items only inside the allowed write set.
7. If compiled research may affect current understanding, hand it to `ariadne:research-synthesis`. This skill does not judge synthesis disposition.

Generated analysis and derivative copies retain upstream provenance and do not count as independent corroboration. Capture cross-scope material once; do not duplicate raw evidence.

### Minimum Research Raw Schema

Write research raw artifacts with at least this flat schema, plus local title, origin, locator, and date fields required by ancestor instructions:

```yaml
type: raw-source
research_boundary: "[[Domains/Example/Research/00 Example Research Boundary]]"
source_type: meeting
evidence_role: first-party-evidence
origin: Product interview
locator: not-applicable
captured: 2026-07-15
compilation_status: pending
derived_from: []
inquiries: []
```

Allowed compilation states are `pending`, `compiled`, `source-only`, or `needs-review`. Use `compiled` only when at least one derived note links back to the raw artifact. Do not change the handoff classification merely to satisfy a local template.

## Promotion Writes

Accept a promotion candidate from `ariadne:research-synthesis` only when its destination is named or confirmed in the current turn and included in the write set. Create or update the destination note with `research_basis` or equivalent `derived_from` links. Do not move, duplicate, or silently rewrite the canonical research.

## Validation

Before finishing, confirm that every write was authorized, raw material is compiled or intentionally source-only, provenance is present, claims and interpretation remain distinct, important artifacts are locally discoverable, and focused validation passes or its warnings are reported.

Use `ariadne:research-ingest` for research target resolution and classification, `ariadne:research-pipeline` for topology, `ariadne:research-synthesis` for dispositions, `ariadne:navigation` for separately authorized structural routes, and `ariadne:maintenance` for broad vault health.
