---
name: ariadne:validator
description: "Validate the structure of an agent-maintained Obsidian vault with deterministic CLI checks for YAML/frontmatter, broken wikilinks, Markdown orphans, and unlinked Base files."
metadata:
  required_tools:
    - node
  primary_script: scripts/validate_vault.sh
  checks:
    - yaml-ok
    - broken-wikilinks
    - true-orphans-md
    - unlinked-base-files
    - bloat-warnings
    - local-base-scope-warnings
    - local-agents-inheritance-warnings
    - ambiguous-wikilink-warnings
    - scope-navigation-warnings
    - routing-matrix-warnings
    - base-scope-formula-warnings
    - research-boundary-warnings
    - research-provenance-warnings
    - provenance-cycle-warnings
    - uncompiled-raw-source-warnings
    - research-hub-warnings
    - scope-adoption-warnings
    - scope-contract-warnings
    - scope-map-warnings
---

# Ariadne Validator

Use this skill when the user asks whether an Obsidian vault is structurally valid, navigable, connected, or ready for ongoing agent use.

## Tool

Run the bundled validator from the vault root:

```bash
/path/to/skills/validator/scripts/validate_vault.sh
```

Or pass an explicit vault path:

```bash
/path/to/skills/validator/scripts/validate_vault.sh /path/to/vault
```

For a subtree or its schema-v1 research pipeline, pass a vault-relative scope:

```bash
/path/to/skills/validator/scripts/validate_vault.sh /path/to/vault --scope "Domains/Product"
/path/to/skills/validator/scripts/validate_vault.sh /path/to/vault --scope "Domains/Product" --profile research
```

Scoped runs still inventory the whole vault before filtering findings. `--scope` rejects absolute paths, traversal, missing paths, and files. `--profile research` requires a scope; it keeps in-scope YAML, broken-link, orphan, and unlinked-Base failures while excluding sibling-origin defects. Descriptor, hub, and routing findings carry explicit governing obligations when an outside origin directly applies to the selected scope.

The shell wrapper checks for Node.js and delegates to `validate_vault.js`.

## Scope Topology Synchronizer

Resolve `scripts/sync_scope_topology.js` relative to this installed skill. It is the only scope topology mutation authority. `--check` is always zero-write and reports `findings`, proposed `changes`, complete `content_write_paths`, and `plan_hash`:

```bash
node /path/to/skills/validator/scripts/sync_scope_topology.js /path/to/vault --check
node /path/to/skills/validator/scripts/sync_scope_topology.js /path/to/vault --check --scope "Domains/Product"
```

Mutation accepts one exact schema-v1 JSON request:

```json
{"operation_schema":1,"operation":"move","target_scope_id":"alpha","source_path":"Domains/Alpha","destination_path":"Projects/Alpha","normalize_files":[],"allowed_write_paths":["00 Index.md","Agent/Scope Map.md"]}
```

```bash
node /path/to/skills/validator/scripts/sync_scope_topology.js /path/to/vault --write --request /path/to/request.json
```

See `ariadne:scope` [scope-operation-request.md](../scope/references/scope-operation-request.md) for complete create, adopt, move, set-status, and repair requests. Unknown or inapplicable fields and unsafe paths are refused before writes. Missing or extra authorization is refused exactly as `operation is not write-authorized: missing-write-authorization:<path>` or `unused-write-authorization:<path>`. Preview with empty `allowed_write_paths`, disclose the resulting content paths, obtain current-turn confirmation, then authorize exactly that sorted set.

`normalize_files` is report-only until a complete normalizer exists. Any requested path produces `normalization-deferred`, is excluded from effects and `content_write_paths`, and keeps write mode unauthorized.

Content write paths are user-confirmed vault content. Engine control paths under `.ariadne/` and owned temporary files are sealed synchronizer state; they are not listed in `allowed_write_paths` and must not be edited manually.

An interrupted write reports or preserves an operation ID. Resume or abort only that ID:

```bash
node /path/to/skills/validator/scripts/sync_scope_topology.js /path/to/vault --resume 00000000-0000-0000-0000-000000000000
node /path/to/skills/validator/scripts/sync_scope_topology.js /path/to/vault --abort 00000000-0000-0000-0000-000000000000
```

Resume validates the sealed authority, identities, hashes, and preconditions before continuing. Abort returns `aborted`, `operation_id`, and `reconciliation_paths`; inspect those evidence paths because content may already have landed. After success, run scoped validation, whole-vault validation, and a second `--check`; the second check must propose no changes.

## Checks

The validator reports:

- `yaml-ok` when Markdown frontmatter and `.base` YAML parse cleanly
- `broken-wikilinks: N`
- `true-orphans-md: N`
- `unlinked-base-files: N`
- `bloat-warnings: N` for non-fatal navigability drift cues
- `local-base-scope-warnings: N` for non-root `Bases/*.base` files missing a `file.inFolder("<scope_path>")` filter
- `local-agents-inheritance-warnings: N` for local `AGENTS.md` files that omit parent/root inheritance or repeat global policy text
- `ambiguous-wikilink-warnings: N` for basename-only wikilinks that resolve to multiple Markdown/Base targets
- `scope-navigation-warnings: N` for promoted child scope hubs that are not linked bidirectionally with their parent hub
- `routing-matrix-warnings: N` for scope hubs that are not linked from their nearest local or inherited `Agent/Task Routing Matrix.md`
- `base-scope-formula-warnings: N` for root `Bases/*.base` files with a `file.inFolder` scope formula that is missing a branch for a known scope path
- `research-boundary-warnings: N` for invalid supported boundary descriptors, including unsupported nested schema values, duplicate `boundary_id` values, and multiple canonical descriptors resolving to one normalized real `scope_path`
- `research-provenance-warnings: N` for invalid downstream-to-upstream provenance and generated or derivative evidence-family structure
- `provenance-cycle-warnings: N` for artifacts in a `derived_from` cycle
- `uncompiled-raw-source-warnings: N` for pending or review-needed sources and compiled sources without a downstream backlink
- `research-hub-warnings: N` for missing, unqualified, or incorrectly populated descriptor-declared hubs

It discovers `.base` files recursively, excluding `.obsidian` and `.git` paths, and resolves wikilinks to real vault files including Markdown notes, `.base` files, `.canvas` files, and attachments.

Every `**/Bases/*.base` file must have a sibling `00 Bases Index.md` that links the Base by relative Markdown link or wikilink. The legacy root `Bases/00 Bases Index.md` check is still enforced, and the same rule now applies to nested scope Base folders.

## Interpretation

A healthy vault should normally report:

```text
yaml-ok
broken-wikilinks: 0
true-orphans-md: 0
unlinked-base-files: 0
bloat-warnings: 0
local-base-scope-warnings: 0
local-agents-inheritance-warnings: 0
ambiguous-wikilink-warnings: 0
scope-navigation-warnings: 0
routing-matrix-warnings: 0
base-scope-formula-warnings: 0
scope-adoption-warnings: 0
scope-contract-warnings: 0
scope-map-warnings: 0
research-boundary-warnings: 0
research-provenance-warnings: 0
provenance-cycle-warnings: 0
uncompiled-raw-source-warnings: 0
research-hub-warnings: 0
```

Some vaults may intentionally keep raw captures or temporary files lightly linked. If the validator reports issues, inspect whether they are intentional before adding links.

Bloat warnings are not fatal. They are cues that an agent should call out possible navigation drift and suggest a maintenance pass.

Recursive scope-related warnings are non-fatal. Treat them as prompts to tighten local Base filters, reduce duplicated local policy text, disambiguate basename wikilinks, or repair parent/child hub navigation.

Research checks are non-fatal and apply only to `type: research-boundary` descriptors with scalar `research_schema: 1`. Schema v1 accepts top-level scalar fields and flat scalar lists (`[]`, inline lists, or block lists); descriptor scalar fields reject list values. Inline lists preserve quoted strings and wikilinks containing commas, while nested objects and lists produce research warnings rather than YAML failures. Supported artifacts require a path-qualified `research_boundary` link and their type-specific required scalars, lists, enum values, and inquiry sections. Membership follows exact descriptor links, and rollup adds only explicitly declared descendant descriptors. `derived_from` credits only canonical artifacts inside that allowed descriptor set. These checks make structural claims only; freshness, credibility, and contradiction remain stewardship judgments.

The validator also warns when a large specialized folder may need a local `AGENTS.md`. Treat that as a prompt to inspect the folder's workflow, not as an automatic requirement.

## Repair

- Use `ariadne:navigation` for missing hubs, Base links, and routing issues.
- Use `ariadne:maintenance` for broader health-check repair.
- Use `ariadne:research-ingest` when orphaned raw material is research and the target boundary needs confirmation.
- Use `ariadne:knowledge-capture` when orphaned raw material needs compilation.
