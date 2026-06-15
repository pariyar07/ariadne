---
name: obsidian-vault-maintainer
description: "Run maintenance and health checks for agent-maintained Obsidian vaults: broken links, orphan notes, stale hubs, invalid frontmatter, uncompiled raw sources, stale queues, unresolved questions, Base coverage, and optional health reports."
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

## Proactive Repair Routing

When you discover a problem during unrelated vault work, surface it instead of letting it become hidden drift:

1. State what appears broken.
2. Explain why it matters for future agents or human navigation.
3. Recommend the smallest next check or skill.
4. Say whether you can safely fix it now or need approval.

Use this routing:

- Global discovery, stale registry entrypoints, or missing adapter marker blocks: use `obsidian-vault-discovery` and run the Ariadne discovery doctor.
- Broken wikilinks, orphan notes, invalid frontmatter, invalid `.base` YAML, unlinked Bases, or validator warnings: use `obsidian-vault-validator` first, then repair with this skill.
- Navigation bloat, missing hubs, missing parent-child hub links, task routing drift, or unclear scope boundaries: use `obsidian-navigation-architect`.
- Raw sources, inbox items, processing items, or outputs accumulating without compilation: use `obsidian-ingest-compile` or `obsidian-research-ingest`.
- Missing repeatable research infrastructure inside a scope: use `obsidian-research-pipeline`.
- Stale synthesis, stale assumptions, or unresolved questions that need consolidation: use `obsidian-research-synthesis`.

Keep the repair scoped to the nearest responsible folder or domain. Ask before restructuring navigation, modifying global agent files, or installing/updating skills.

## Report

Report findings in the chat or automation output by default.

Save dated reports in `Outputs/` using the vault's health-check template when the user asks for a durable health record, the vault's local procedure requires it, or unresolved follow-ups need a durable note. Do not create recurring report notes just because a scheduled automation ran.

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

- Use `obsidian-research-ingest` to process research sources found during maintenance when scope routing is unclear.
- Use `obsidian-ingest-compile` to process raw material found during maintenance.
- Use `obsidian-research-pipeline` when a scope needs missing research infrastructure.
- Use `obsidian-vault-validator` for deterministic structural checks.
- Use `obsidian-navigation-architect` when maintenance requires durable structural changes.
- Use `obsidian-research-synthesis` when stale research threads need updating.
