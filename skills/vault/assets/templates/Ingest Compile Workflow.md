---
title: Ingest Compile Workflow
type: workflow
status: active
created: "{{date}}"
tags:
  - agent-workflow
  - knowledge-base
---

# Ingest Compile Workflow

Use this workflow when source material enters the vault.

For research, first confirm a current-turn target and canonical `research-boundary` descriptor. State the allowed write set before capture; a likely search result or folder location is not authorization.

## Source Material

Examples:

- links
- articles
- tweets
- papers
- repos
- datasets
- screenshots
- transcripts
- rough notes

## Steps

1. Confirm the target scope, research descriptor when applicable, and explicit write set.
2. Capture source material in the boundary's declared raw location; no folder name is mandatory.
3. Record `research_boundary`, source metadata, `evidence_role`, `compilation_status`, and any upstream `derived_from` links. Generated analysis and derivative copies require upstream links. Captures that share a generated origin or mirror chain form one evidence family and are not independent corroboration.
4. Extract source claims and keep them separate from interpretation.
5. Compile durable knowledge with downstream-to-upstream `derived_from` provenance and optional `inquiries` links.
6. Create or update concept notes and durable inquiries only when the question genuinely recurs; do not invent an inquiry to satisfy a template.
7. Add meaningful wikilinks and update the descriptor-declared hubs when the source changes the map.
8. Ask `ariadne:research-synthesis` to record one disposition in the inquiry's append-only history when synthesis is warranted: `changed`, `confirmed`, `contradicted`, `superseded`, `no-update`, or `needs-review`.
9. Promote only into a current-turn named destination. The destination records `research_basis`; evidence stays in the research boundary, and `promoted_to` is optional.

For research handoff, carry: `target_scope`, `research_boundary`, `allowed_write_set`, `source_type`, `evidence_role`, `derived_from`, `inquiry_links`, `pipeline_state`, and `requested_operation`.
