# Vault Validator Guide

The validator is a deterministic health check for an Obsidian vault. Use the shell wrapper and pass the vault root path:

```bash
/path/to/skills/obsidian-vault-validator/scripts/validate_vault.sh "/path/to/vault"
```

Or run it from inside the vault root without an argument:

```bash
/path/to/skills/obsidian-vault-validator/scripts/validate_vault.sh
```

The wrapper delegates to the Node.js implementation. You can also run the JavaScript file directly:

```bash
node /path/to/skills/obsidian-vault-validator/scripts/validate_vault.js "/path/to/vault"
```

## Why Node

The validator uses Node.js because the skill installation workflow already uses `npx`, so users are likely to have Node available. The implementation uses only built-in Node modules and does not require `npm install`.

The shell wrapper provides a stable entry point plus a clearer missing-Node error.

## What It Checks

- Markdown frontmatter parses as YAML.
- `.base` file YAML parses cleanly.
- Wikilinks resolve to Markdown notes or Base files.
- Root and local Base files are linked from the relevant `00 Bases Index.md`.
- Local Bases include a `file.inFolder("<scope_path>")` filter so they don't show rows from other scopes.
- Local `AGENTS.md` files mention parent inheritance and do not repeat global policy text.
- Basename-only wikilinks that resolve to multiple targets are flagged as ambiguous.
- Parent and child scope hubs link to each other bidirectionally.
- Every promoted scope hub is linked from `Agent/Task Routing Matrix.md`.

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
```

## Counter Reference

| Counter | Fatal | Meaning |
| --- | --- | --- |
| `yaml-errors` | Yes | Frontmatter or `.base` YAML is malformed |
| `broken-wikilinks` | Yes | A wikilink target does not exist |
| `true-orphans-md` | Yes | A Markdown note has no incoming or outgoing links |
| `unlinked-base-files` | Yes | A `.base` file is not linked from its sibling `00 Bases Index.md` |
| `bloat-warnings` | No | Entry files or hubs are growing too large for reliable traversal |
| `local-base-scope-warnings` | No | A local Base is missing a `file.inFolder()` filter |
| `local-agents-inheritance-warnings` | No | A local `AGENTS.md` repeats global policy or omits parent inheritance |
| `ambiguous-wikilink-warnings` | No | A bare wikilink resolves to multiple files |
| `scope-navigation-warnings` | No | A scope hub is not bidirectionally linked with its parent hub |
| `routing-matrix-warnings` | No | A scope hub exists but is not linked from `Agent/Task Routing Matrix.md` |
| `base-scope-formula-warnings` | No | A root Base with a `file.inFolder` scope formula is missing a branch for a known scope path |

Fatal counters cause a non-zero exit code. Warning counters are non-fatal — they surface drift before it compounds.
