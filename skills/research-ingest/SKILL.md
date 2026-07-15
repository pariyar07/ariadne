---
name: ariadne:research-ingest
description: Use when routing a new article, paper, repository, dataset, transcript, chat, observation, generated analysis, or other research input into a named Obsidian vault scope, especially when pipeline readiness or conditional synthesis must be decided.
---

# Ariadne Research Ingest

Orchestrate one research input without taking over compilation or synthesis ownership. No write begins until the research target and a closed write set are explicit.

## Authorization Gate

1. Read applicable instructions from the vault root through every ancestor scope to the candidate target. Read root and local indexes, agent navigation, routing matrices, and the candidate research hub or boundary descriptor progressively.
2. Discover candidate scopes and descriptors read-only. Do not scan the whole vault by default.
3. In a multi-scope vault, require a current-turn named or confirmed target scope. A search hit, one likely match, an existing card, prior conversation, current directory, or active skill is not confirmation.
4. Construct and state `allowed_write_set` before any mutation. Include the target subtree plus each individually named parent hub, routing matrix, root Base formula, or other external file required for discoverability. An unnamed parent or root file is outside the set even when the edit seems minimal.
5. If the target is missing or ambiguous, ask one short target question and stop before writing. If another required path appears later, extend the write set only after explicit confirmation; otherwise defer it.

## Classify The Input

Record its real `source_type` and one evidence role: `external-evidence`, `first-party-evidence`, `context`, `hypothesis`, `generated-analysis`, or `derivative-copy`.

Use `derived_from` for upstream provenance. Generated analysis and derivative copies require upstream links and never count as independent corroboration. Preserve chats, observations, hypotheses, and human notes as their actual epistemic role. Do not invent an inquiry solely to complete metadata; use `inquiry_links: []` until one is known.

Inspect pipeline readiness through the boundary descriptor and local hubs. A supported descriptor has `type: research-boundary`, `research_schema`, a stable `boundary_id`, `scope_path`, and path-qualified canonical hub links. If repeatable topology is missing, invoke `ariadne:research-pipeline` only within the confirmed write set. Do not silently adopt a legacy pipeline.

## Handoff Envelope

Produce this complete envelope before invoking a write-capable companion:

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

Use vault-relative paths or path-qualified links. Set `pipeline_state` to the observed state, such as `ready`, `missing`, `legacy`, or `needs-review`. Make `requested_operation` explicit, such as `capture-and-compile`, `source-only`, or `capture-compile-and-consider-synthesis`.

## Ownership And Completion

1. Invoke `ariadne:knowledge-capture` with the envelope. It may write raw and compiled artifacts only inside `allowed_write_set`; it does not select scope, create research topology, or judge synthesis disposition.
2. Invoke `ariadne:research-synthesis` only when the new compiled material may change, confirm, contradict, supersede, or otherwise affect current understanding. Only that skill records the disposition.
3. Capture one canonical raw source. Link related scopes rather than duplicating it.
4. Run scoped validation after structural research work when available. Report deferred wiring, unresolved classification, legacy adoption, or out-of-set changes explicitly.

Do not auto-promote research, create a scope for one source, or hide useful material only in chat.
