# Vault Validator Guide

The validator is a deterministic health check for a Markdown knowledge vault. It operates directly on filesystem content; Obsidian does not need to be installed or running. Use the shell wrapper and pass the vault root path:

```bash
/path/to/skills/validator/scripts/validate_vault.sh "/path/to/vault"
```

Or run it from inside the vault root without an argument:

```bash
/path/to/skills/validator/scripts/validate_vault.sh
```

The wrapper delegates to the Node.js implementation. You can also run the JavaScript file directly:

```bash
node /path/to/skills/validator/scripts/validate_vault.js "/path/to/vault"
```

Scope and research-profile forms are also supported:

```bash
node /path/to/skills/validator/scripts/validate_vault.js "/path/to/vault" --scope "Domains/Product"
node /path/to/skills/validator/scripts/validate_vault.js "/path/to/vault" --scope "Domains/Product" --profile research
node /path/to/skills/validator/scripts/validate_vault.js "/path/to/vault" --profile scope
node /path/to/skills/validator/scripts/validate_vault.js "/path/to/vault" --scope "Domains/Product" --profile scope
```

Scopes are vault-relative directories. Absolute paths, traversal, missing paths, and files are rejected. The validator always inventories the complete vault for YAML parsing, canonical link resolution, and graph construction, then filters diagnostics and exit status to the selected subtree. A research profile requires a scope and reports research obligations, the nearest routing-matrix obligation, the reused local-Base scope check, and all in-scope fatal structural findings. Findings are filtered by structured origin and governing-obligation paths, so a sibling artifact is not included merely because its message names an in-scope target. Fatal sibling defects remain excluded.

## Why Node

The validator uses Node.js because the skill installation workflow already uses `npx`, so users are likely to have Node available. The implementation uses only built-in Node modules and does not require `npm install`.

The shell wrapper provides a stable entry point plus a clearer missing-Node error.

## What It Checks

- Markdown frontmatter parses as YAML.
- `.base` file YAML parses cleanly.
- Wikilinks resolve to real vault files, including Markdown notes, Base files, Canvas files, and attachments.
- Root and local Base files are linked from the relevant `00 Bases Index.md`.
- Local Bases include a `file.inFolder("<scope_path>")` filter so they don't show rows from other scopes.
- Local `AGENTS.md` files mention parent inheritance and do not repeat global policy text.
- Basename-only wikilinks that resolve to multiple targets are flagged as ambiguous.
- Parent and child scope hubs link to each other bidirectionally.
- Every promoted scope hub is linked from its nearest local or inherited `Agent/Task Routing Matrix.md`.
- Schema-v1 scope descriptors, parentage, lifecycle, redirects, required checkpoints, and generated topology artifacts agree.
- Schema-v1 research descriptors, exact or explicit-rollup hub membership, provenance, cycles, and raw-source compilation coverage are structurally consistent.

Schema-v1 research frontmatter supports top-level scalar values and flat lists of scalar values. Flat lists may be `[]`, inline lists, or indented block lists. Inline list parsing preserves quoted strings and wikilinks containing commas. Descriptor scalar fields reject list values, and nested objects or lists on supported descriptors or artifacts produce non-fatal research warnings; only syntactically invalid YAML is a YAML failure. Every supported descriptor has a vault-unique stable `boundary_id`, and each canonical `scope_path` has exactly one supported descriptor. Scope identity uses its normalized, real, contained vault-relative directory, so equivalent dot segments, repeated separators, and in-vault symlink aliases cannot create parallel canonical descriptors. Supported artifacts require a path-qualified scalar `research_boundary`, type-specific required fields, and structurally inspectable inquiry sections. Research membership is established by the descriptor link, not folder ancestry. Provenance accepts only canonical research artifacts in the same exact boundary or explicitly declared rollup descriptors, so hubs, routing notes, Bases, and out-of-boundary artifacts cannot provide compilation coverage.

Bare content links resolve in this order: the source folder, then exact ancestor folders one by one, then a unique global basename match. If multiple global candidates remain without an exact folder or ancestor match, the link is ambiguous and credits none. Navigation files still warn when a bare link has multiple candidates, even when the content rule could select one.

## Expected Output

A healthy vault reports all zeros:

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

## Counter Reference

| Counter | Fatal | Meaning |
| --- | --- | --- |
| `yaml-errors` | Yes | Frontmatter or `.base` YAML is malformed |
| `broken-wikilinks` | Yes | A wikilink target does not exist as a real vault file |
| `true-orphans-md` | Yes | A Markdown note has no incoming or outgoing links |
| `unlinked-base-files` | Yes | A `.base` file is not linked from its sibling `00 Bases Index.md` |
| `bloat-warnings` | No | Entry files or hubs are growing too large for reliable traversal |
| `local-base-scope-warnings` | No | A local Base is missing a `file.inFolder()` filter |
| `local-agents-inheritance-warnings` | No | A local `AGENTS.md` repeats global policy or omits parent inheritance |
| `ambiguous-wikilink-warnings` | No | A bare wikilink resolves to multiple files |
| `scope-navigation-warnings` | No | A scope hub is not bidirectionally linked with its parent hub |
| `routing-matrix-warnings` | No | A scope hub is missing from its nearest local or inherited routing matrix |
| `base-scope-formula-warnings` | No | A root Base with a `file.inFolder` scope formula is missing a branch for a known scope path |
| `scope-adoption-warnings` | No | Legacy scope candidates remain unadopted, unless explicitly dismissed |
| `scope-contract-warnings` | No | A schema-v1 descriptor, checkpoint, lifecycle relation, redirect, ID, path, or marker violates the scope contract |
| `scope-map-warnings` | No | The generated registry, Markdown tree, Canvas, or Base ordering has drifted from canonical descriptors |
| `research-boundary-warnings` | No | A supported descriptor is incomplete, structurally invalid, duplicates a `boundary_id`, or shares its canonical `scope_path` with another descriptor |
| `research-provenance-warnings` | No | A schema-v1 artifact has invalid provenance or generated/derivative evidence-family structure |
| `provenance-cycle-warnings` | No | An artifact participates in a downstream-to-upstream `derived_from` cycle |
| `uncompiled-raw-source-warnings` | No | A raw source is pending/review-needed, or marked compiled without a downstream `derived_from` backlink |
| `research-hub-warnings` | No | A required descriptor hub is missing, unqualified, or inconsistent with exact/declared-rollup membership |

Fatal counters cause a non-zero exit code. Warning counters are non-fatal — they surface drift before it compounds.

Strict topology activates only when the root has a supported schema-v1 scope descriptor. An unsupported root warns and disables topology claims; descendant descriptors without an active root remain adoption candidates. Canonical Markdown descriptors and checkpoint blocks carry scope identity and topology. The registry Base, generated Markdown map block, and Canvas are derived optional views and should be regenerated by `sync_scope_topology.js`, never hand-edited.

Research counters are schema-gated: legacy research boundaries without `research_schema: 1` receive none of these new warnings. The validator does not claim semantic staleness, credibility, or contradiction resolution.
