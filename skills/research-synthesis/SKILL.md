---
name: ariadne:research-synthesis
description: Use when multiple compiled research sources may change, confirm, contradict, supersede, or leave unchanged an inquiry, synthesis, evidence map, thread hub, or promotion candidate inside an Obsidian vault.
---

# Ariadne Research Synthesis

Own the semantic disposition of compiled research. Preserve evidence, uncertainty, and an append-only record instead of rewriting history in chat.

## Authorization And Reading

1. Require a current-turn named or confirmed target research boundary in a multi-scope vault.
2. Read applicable instructions from the vault root through every ancestor scope to that target.
3. State an explicit `allowed_write_set`. Keep inquiry, synthesis, and thread edits inside the selected boundary. Treat every downstream destination and parent or root navigation file as a separately named write target.
4. Read the boundary descriptor, local hubs, current synthesis, inquiries, and compiled notes before raw sources. Read raw evidence only when compiled notes are insufficient.
5. Follow `research_boundary` membership, not folder ancestry. In `exact` mode exclude child boundaries; in `rollup` mode include only descriptors explicitly named by `rollup_boundaries`.

## Decide One Disposition

For each synthesis pass, decide and record exactly one disposition:

- `changed`: changes a claim, implication, relationship, or open question
- `confirmed`: strengthens current understanding without materially changing it
- `contradicted`: introduces incompatible evidence or invalidates an assumption
- `superseded`: replaces an older claim or conclusion
- `no-update`: useful compiled evidence that does not warrant synthesis churn
- `needs-review`: ambiguous evidence or interpretation that requires human judgment

Only this skill owns that decision. Do not treat `no-update` as permission to omit the durable record.

## Durable Update Contract

Maintain the inquiry's append-only update history with date, source links, disposition, and concise reason. Preserve the current question or purpose, status, inclusion and exclusion criteria, supporting and contradicting evidence, current synthesis, and open questions. Update a thread hub when sequence, tension, implications, or unresolved questions change.

Use canonical `derived_from` links downstream to upstream. Treat generated analysis, mirrors, and derivative copies that share an origin as one evidence family; they never create circular corroboration. Label source claims, interpretation, contested claims, and uncertainty distinctly.

## Promotion Handoff

When a conclusion is useful in `Product/`, `Decisions/`, `Roadmap/`, or another scope, produce a promotion candidate containing the conclusion, uncertainty, and canonical evidence links. Require the destination to be named or confirmed in the current turn and included in `allowed_write_set`. Then hand creation or update of the destination note to `ariadne:knowledge-capture` with `research_basis` or equivalent `derived_from` links.

Promotion does not move or duplicate evidence, relocate research, silently rewrite source notes, authorize unrelated writes, or require a source backlink. `ariadne:research-stewardship` never auto-promotes.

Finish by reporting the disposition, durable history entry, affected inquiry or thread, evidence basis, promotion candidate if any, and deferred out-of-set work.
