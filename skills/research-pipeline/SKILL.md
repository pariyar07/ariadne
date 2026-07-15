---
name: ariadne:research-pipeline
description: Use when recurring research inside an existing Obsidian vault scope needs a boundary descriptor, raw and compiled routes, inquiry and synthesis hubs, local templates, Bases, or routing.
---

# Ariadne Research Pipeline

Create the minimum repeatable research topology inside one explicitly authorized scope. This skill owns topology, not source compilation, semantic disposition, or scope creation.

## Authorization

1. Read root instructions and every applicable ancestor scope instruction through the target.
2. Read root and local indexes, agent navigation, routing matrices, existing research hubs, and knowledge-processing architecture progressively.
3. In a multi-scope vault, require a current-turn named or confirmed target. One likely match, search result, prior conversation, or current directory is not authorization.
4. Inventory read-only, then state an explicit `allowed_write_set`. Include the target subtree plus every individually named parent hub, routing matrix, root Base formula, or other external file to change.
5. Parent/root wiring is a visible obligation, never implicit authorization. Defer paths outside the set.

Use `ariadne:scope` when a new or promoted scope is required. Apply `ariadne:navigation` patterns inside this boundary; defer durable cross-scope navigation to that skill. Use `ariadne:research-ingest` for new material, `ariadne:knowledge-capture` for authorized raw and compiled writes, and `ariadne:research-synthesis` for semantic dispositions.

## Boundary Descriptor

Create exactly one canonical Markdown research boundary descriptor identified by frontmatter rather than folder name:

```yaml
---
type: research-boundary
research_schema: 1
boundary_id: stable-local-id
scope_path: Domains/Example
raw_hub: "[[Domains/Example/Raw/Sources/00 Source Index]]"
compiled_hub: "[[Domains/Example/Research/00 Research Index]]"
inquiry_hub: "[[Domains/Example/Questions/00 Questions Index]]"
synthesis_hub: "[[Domains/Example/Research/00 Example Research Synthesis]]"
thread_hub: "[[Domains/Example/Relationships/Example Research Thread]]"
view_mode: exact
rollup_boundaries: []
---
```

Use vault-relative paths and path-qualified links. `view_mode: exact` includes only artifacts whose `research_boundary` points to this descriptor. Use `rollup` only with explicitly listed descendant descriptors. Folder ancestry never establishes membership. A thread hub may be omitted when the local workflow does not use one.

## Minimum Shape

Adopt existing structure before creating parallel folders. A small pipeline may need only the descriptor, source index, compiled research index, synthesis or inquiry hub, local ingest workflow, and routing. Add Questions, Relationships, Concepts, Entities, Processing Queue, templates, or Bases only when recurring work justifies them.

Compiled notes separate source claims, interpretation, relevance, implications, and provenance. Inquiry objects use stable IDs, boundary links, status, criteria, evidence, current synthesis, open questions, and append-only history. Bases are optional view layers and must filter to the scope path and declared artifact types.

## Workflow

1. Inventory equivalent hubs, workflows, metadata, templates, Bases, and routing inside the target.
2. Choose the minimum shape and map each planned file into `allowed_write_set`.
3. Create or confirm the boundary descriptor.
4. Create only missing local hubs and workflow files; preserve existing paths and user edits.
5. Link local hubs and Bases inside the target.
6. Apply parent/root or cross-scope wiring only when each exact file is authorized; otherwise hand it to `ariadne:navigation` as a deferral.
7. Run scoped validation and report remaining warnings.

## Guardrails

- Do not duplicate root policy in local files; local instructions add deltas.
- Do not create local `AGENTS.md`, templates, Bases, entity notes, or concept notes speculatively.
- Do not create or promote a scope boundary.
- Do not add a schema descriptor to a legacy pipeline unless adoption is explicitly requested and the mapping is unambiguous or confirmed.
- Do not decide whether evidence changed a synthesis.
- Use path-qualified links in navigation files.

Finish with the target, instructions read, allowed write set, descriptor path, created or adopted topology, navigation deferrals, and validation result.
