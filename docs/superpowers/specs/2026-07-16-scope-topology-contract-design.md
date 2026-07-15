# Deterministic Nested Scope Topology Design

**Status:** Proposed for implementation after review
**Date:** 2026-07-16

## Summary

Ariadne scopes become explicit, versioned jurisdictions rather than inferred folder conventions. Every adopted scope has an exact canonical checkpoint, inherited agent policy, local navigation, local routing, and deterministic parent/child topology. A generated Base registry, Markdown tree, and JSON Canvas provide live wayfinding over canonical Markdown.

The design supports arbitrary user folder layouts, arbitrary nesting depth, safe adoption of older vaults, stable identity across moves, read-only deterministic validation, and bounded idempotent repair.

## Product Principle

A nested scope is a boundary crossing, not ordinary folder traversal.

Agents enter through root policy and follow explicit checkpoints inward. Every scope declares its nearest adopted ancestor, lists only its direct children locally, and carries the complete root-to-current instruction chain. Ordinary folders may exist between scopes without becoming governed scopes.

## Scope Recognition

Only exact `00 Index.md` files with supported scope metadata are canonical scope descriptors:

```yaml
---
title: Evaluation
type: scope-index
scope_schema: 1
scope_id: product-evaluation
scope_path: Product/Evaluation
parent_scope_id: product
status: active
created: 2026-07-16
scope_order: 20
former_scope_paths: []
tags:
  - scope
  - evaluation
---
```

Rules:

- `scope_id` is unique, immutable, human-readable, and never silently reused.
- `scope_path` is normalized, vault-relative, and matches the descriptor directory.
- `parent_scope_id` resolves to the nearest adopted physical ancestor.
- Root is `scope_id: root`, uses `scope_path: .`, and omits parent.
- Status is `active`, `archived`, or `retired`.
- Optional `scope_order` affects sibling display only.
- Optional `former_scope_paths` is append-only.
- Retired scopes may declare `replaced_by_scope_id`.
- Top-level scalars and flat scalar lists are the supported YAML subset.

Named files such as `00 Product Index.md` may remain content hubs but never replace the exact canonical descriptor. Exact `00 Index.md` files without `type: scope-index` remain ordinary folder hubs.

## Flexible Physical Layout

Ariadne does not require a `Domains/` wrapper. These are both valid:

```text
Vault/Product/00 Index.md
Vault/Domains/Product/00 Index.md
```

Wrapper folders are transparent unless they independently adopt the scope contract. Parentage cannot point outside physical ancestry or skip a nearer adopted scope.

## Mandatory Full Checkpoint

Every adopted scope, including root, contains:

```text
<scope>/
  00 Index.md
  AGENTS.md
  Agent/
    00 Agent Navigation.md
    Task Routing Matrix.md
```

All four files use generated-core/user-extension ownership:

- `ariadne:scope-boundary` in `00 Index.md`
- `ariadne:scope-inheritance` in `AGENTS.md`
- `ariadne:scope-navigation` in agent navigation
- `ariadne:scope-routing` in the routing matrix

Generated blocks are replaceable and validator-controlled. User content outside markers is preserved exactly.

The index, agent navigation, and routing matrix link only immediate parent/direct children. `AGENTS.md` lists the complete root-to-current instruction chain.

## Promotion Threshold

A folder becomes a scope only when it needs durable independent governance, such as distinct local policy, recurring ownership, local routing, a meaningful write boundary, lifecycle control, child scopes, or separate intake/research/operational workflows. File volume alone does not justify promotion.

## Derived Global Wayfinding

### Scope Registry

`Bases/Scope Registry.base` is fully generated and includes required views:

- Scope Topology
- Checkpoint Health
- Lifecycle
- Adoption Candidates

Only adopted scopes appear in canonical topology. Adoption candidates are explicitly non-authoritative. Users create separate custom Bases rather than editing the generated registry.

Each view owns its filter. Topology, health, and lifecycle views select supported scope-index descriptors; the adoption-candidate view uses conservative legacy-hub heuristics and cannot feed canonical topology or validation claims.

### Markdown Tree

`Agent/Scope Map.md` contains a generated marker-managed tree with path-qualified links, IDs, and lifecycle status. User explanations may live outside the block.

### Canvas

`Agent/Scope Map.canvas` is fully generated with one file node per adopted scope. Parent-to-child edges, IDs, links, status styling, and positions are deterministic. Manual edits are unsupported.

The layout is left-to-right: depth determines X, deterministic preorder determines Y, and optional `scope_order` controls siblings before title/ID tie-breakers.

## Lifecycle And Relocation

- Active scopes receive normal work.
- Archived scopes remain navigable but do not receive routine writes.
- Retired scopes retain lightweight checkpoint tombstones and cannot own active children.
- Explicit moves preserve `scope_id`, update path/parent, append former paths, and leave non-scope redirects at old locations.
- Redirects never appear as canonical scopes.

## Legacy Adoption

Legacy validation always suggests the new contract but does not impose sudden fatal failures or mutate the vault.

Users explicitly choose:

- whole-vault adoption; or
- progressive root-to-target ancestor-chain adoption.

Automatic adoption creates canonical kiosks, preserves existing named hubs, and writes root activation last. It does not move, rename, merge, archive, or delete legacy content. Audit reports overlaps with backlinks and unique-content evidence, then recommends keep/merge/archive/rename/delete actions for explicit user approval.

Only adopted `scope_schema: 1` scopes enter registry/tree/Canvas. Legacy siblings remain unchanged and continue receiving adoption suggestions.

## Write Authorization

Ordinary work writes only inside the confirmed target scope subtree. A topology operation must name every parent/root checkpoint, generated map, registry, or Base formula it intends to modify in an explicit allowed write set.

Audit and check modes perform zero writes. Repair refuses marker ambiguity, unexpected existing files, symlink escape, or any path outside the allowed set.

## Synchronization

One deterministic synchronization workflow runs after approved creation, adoption, move, reparent, archive, retirement, or repair:

1. Update canonical descriptors.
2. Regenerate affected checkpoint blocks.
3. Ensure registry structure.
4. Regenerate Markdown tree.
5. Regenerate Canvas.
6. Update applicable Base formulas with child checks before parent checks.
7. Run scoped validation.
8. Run whole-vault validation.
9. Confirm a second write pass produces zero changes.

Proposed interface:

```bash
sync_scope_topology.js "/path/to/vault" --check
sync_scope_topology.js "/path/to/vault" --write
sync_scope_topology.js "/path/to/vault" --scope "Product/Evaluation" --write
```

## Automatic Repair Boundary

Allowed after explicit adoption/repair authorization:

- Create missing checkpoint files.
- Insert or regenerate known marker blocks.
- Regenerate registry/tree/Canvas.
- Add generated parent/direct-child routes.
- Add child-before-parent branches to recognized root Base formulas.
- Normalize meaning-preserving schema formatting.
- Update a stale path for the same uniquely identified descriptor.

Always deferred:

- ID changes
- Reparenting
- Lifecycle changes
- Moves and renames
- Hub merges
- Archive or deletion
- Ambiguous legacy candidates
- User-owned content rewrites

## Validator

The validator remains dependency-free, deterministic, and read-only.

New CLI:

```bash
validate_vault.js "/path/to/vault" --profile scope
validate_vault.js "/path/to/vault" --scope "Product/Evaluation" --profile scope
```

It inventories the whole vault before filtering. Scoped results include governing ancestors, the target, adopted descendants, and applicable global artifact obligations. Sibling-only defects cannot affect scoped output/status.

New non-fatal counters:

- `scope-adoption-warnings`
- `scope-contract-warnings`
- `scope-map-warnings`

Existing inheritance, navigation, routing, Base-scope, and Base-link counters remain authoritative for their current concerns. Every new counter must satisfy the repository full-artifact rule.

## Skill Changes

- `ariadne:vault`: bootstrap root contract and global artifacts.
- `ariadne:scope`: create/adopt/move/reparent/archive/retire/redirect and synchronize.
- `ariadne:navigation`: respect generated blocks and route topology changes through synchronization.
- `ariadne:maintenance`: audit/adopt/repair, migration choices, cleanup recommendations.
- `ariadne:validator`: schema, topology, artifacts, profile, counters.
- `ariadne:workspace-instructions`: stable ID/current-path links and stale-path guidance.

## Verification Requirements

Public deterministic fixtures must cover root-only, arbitrary layouts, transparent folders, deep ancestry, required checkpoints, marker preservation, cycles, duplicate IDs, moves, redirects, lifecycle, Base ordering, registry views, tree/Canvas drift, scoped isolation, adoption modes, cleanup deferral, exact write roots, interrupted adoption, and idempotency.

Private behavioral contracts must prove target confirmation, write-set disclosure, adoption-mode choice, legacy preservation, user-content preservation, destructive cleanup deferral, hidden-contract isolation, and stdout/counter assertions.

## Documentation Before Implementation

Implementation begins only after review of:

- the durable ADR;
- HLD;
- LLD;
- this public design spec; and
- the private eval-contract outline.
