---
name: obsidian-vault-maintainer
description: "Run maintenance and health checks for agent-maintained Obsidian vaults: broken links, orphan notes, stale hubs, invalid frontmatter, uncompiled raw sources, stale queues, unresolved questions, Base coverage, and dated reports."
---

# Obsidian Vault Maintainer

Use this skill when auditing, repairing, or maintaining an Obsidian vault over time.

## Start

1. Read `00 Index.md`.
2. Read `AGENTS.md` or `CLAUDE.md`.
3. Read `Agent/00 Agent Navigation.md` if it exists.
4. Read `Agent/Vault Health Check Procedure.md` if it exists.
5. Read `Agent/Vault Navigation Standard.md` if navigation is involved.

## Health Checks

Check for:

- invalid Markdown frontmatter
- invalid `.base` YAML
- broken wikilinks, resolving both `.md` and `.base` files
- Markdown notes with no incoming or outgoing wikilinks
- `.base` files missing from `Bases/00 Bases Index.md`
- important notes missing from folder hubs
- folder hubs missing from agent navigation
- raw sources without compiled notes
- research notes without source links
- stale inbox items
- stale processing queue items
- stale open questions
- decisions without rationale
- generated outputs that should be filed back into the wiki
- entry files or folder hubs becoming too large to scan
- durable folders without `00 ... Index.md` hubs
- recurring workstreams missing from task routing
- stale or missing local `AGENTS.md` files for specialized folders
- promoted scopes missing hubs
- child hubs missing parent links
- parent hubs missing child links
- local Bases missing folder scope filters
- local `AGENTS.md` files repeating parent policy instead of local deltas
- local queues piling up inside child scopes
- raw sources not compiled within the relevant scope
- scope indexes becoming full tables of contents instead of navigable maps

## Report

Save dated reports in `Outputs/` using the vault's health-check template when available.

Use statuses such as:

- `healthy`
- `needs-review`
- `needs-linking`
- `needs-compilation`
- `needs-decision`

## Repair Rules

- Fix navigation through hubs, not decorative links.
- Link important notes from the relevant folder hub.
- Keep `00 Index.md` high-level.
- Treat bloat as a maintenance issue: call it out, then split to folder hubs, thread hubs, or Bases.
- Treat repeated folder-specific guidance as a signal to propose a local `AGENTS.md`.
- Keep Bases as a view layer over Markdown, not a second source of truth.
- Repair scope drift at the nearest responsible scope.
- Do not push local material to the root just for visibility.
- Do not restructure the vault unless the user asked for maintenance that requires it.

## Useful Local Checks

Prefer the bundled validator skill when available:

```bash
/path/to/skills/obsidian-vault-validator/scripts/validate_vault.sh
```

It should report `yaml-ok`, `broken-wikilinks: 0`, `true-orphans-md: 0`, `unlinked-base-files: 0`, and ideally `bloat-warnings: 0` for a healthy vault.

## Related Skills

- Use `obsidian-ingest-compile` to process raw material found during maintenance.
- Use `obsidian-vault-validator` for deterministic structural checks.
- Use `obsidian-navigation-architect` when maintenance requires durable structural changes.
- Use `obsidian-research-synthesis` when stale research threads need updating.
