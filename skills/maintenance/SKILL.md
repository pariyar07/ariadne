---
name: ariadne:maintenance
description: "Run maintenance and health checks for agent-maintained Markdown knowledge vaults: broken links, orphan notes, stale hubs, invalid frontmatter, uncompiled raw sources, stale queues, unresolved questions, optional Base coverage, and health reports."
---

# Ariadne Maintenance

Use this skill when auditing, repairing, or maintaining a Markdown knowledge vault over time.

## Start

1. Read root instructions and every applicable ancestor scope instruction through the target.
2. Read relevant indexes, agent navigation, health-check procedure, and navigation standard.
3. Discover findings read-only. In a multi-scope vault, require a current-turn named or confirmed target before scoped repairs.
4. Run `sync_scope_topology.js --check` for topology findings. Audit/check behavior is always zero-write.

## Health Checks

Check for:

- invalid Markdown frontmatter
- invalid `.base` YAML
- broken wikilinks, resolving both `.md` and `.base` files
- Markdown notes with no incoming or outgoing wikilinks
- `.base` files missing from `Bases/00 Bases Index.md`
- important notes missing from folder hubs
- folder hubs missing from agent navigation
- stale inbox items
- stale processing queue items
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
- scope indexes becoming full tables of contents instead of navigable maps

## Proactive Repair Routing

When you discover a problem during unrelated vault work, surface it instead of letting it become hidden drift:

1. State what appears broken.
2. Explain why it matters for future agents or human navigation.
3. Recommend the smallest next check or skill.
4. Say whether you can safely fix it now or need approval.

Use this routing:

- Global discovery, stale registry entrypoints, or missing adapter marker blocks: use `ariadne:global-discovery` and run the Ariadne discovery doctor.
- Broken wikilinks, orphan notes, invalid frontmatter, invalid `.base` YAML, unlinked Bases, or validator warnings: use `ariadne:validator` first, then repair with this skill.
- Navigation bloat, missing hubs, missing parent-child hub links, task routing drift, or unclear scope boundaries: use `ariadne:navigation`.
- General inbox, processing, or output buildup: use `ariadne:knowledge-capture`.
- Research provenance, compilation coverage, stale synthesis, unresolved research questions, evidence roles, circular corroboration, or older pipeline drift: use `ariadne:research-stewardship`.
- Missing repeatable research infrastructure inside a scope: use `ariadne:research-pipeline`.

Whole-vault maintenance discovers and routes research-semantic drift; it does not reproduce the research stewardship procedure or make synthesis dispositions.

Keep the repair scoped to the nearest responsible folder or domain. Ask before restructuring navigation, modifying global agent files, or installing/updating skills.

## Scope Candidate And Repair Ownership

- Inventory evidence before recommending promotion: recurring routing need, durable local lifecycle, local policy, repeated local views, and current parent route.
- Respect `ariadne_scope_adoption: dismissed`; do not repeatedly propose or silently adopt a dismissed candidate.
- For an approved adoption, offer `ancestor-chain` (the target and required ancestors) versus `whole-vault` (all supported pending descriptors), explain the difference, and require a current-turn choice.
- Cleanup recommendations must cite findings and paths. Never infer deletion, retirement, relocation, or normalization from an unused-looking folder alone.
- Topology repairs require a confirmed target and disclosed `allowed_write_paths`. Route them through the validator-owned `sync_scope_topology.js`; never directly edit descriptors, generated blocks/files, root scope formulas, redirects, or scope moves.
- After an approved repair, run scoped and whole-vault validation and a second zero-change check. Use `--resume` or `--abort` for interrupted operations and reconcile reported paths.

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
/path/to/skills/validator/scripts/validate_vault.sh
```

It should report `yaml-ok`, `broken-wikilinks: 0`, `true-orphans-md: 0`, `unlinked-base-files: 0`, and ideally `bloat-warnings: 0` for a healthy vault.

## Related Skills

- Use `ariadne:research-ingest` to process research sources found during maintenance.
- Use `ariadne:knowledge-capture` to process raw material found during maintenance.
- Use `ariadne:research-pipeline` when a scope needs missing research infrastructure.
- Use `ariadne:research-stewardship` for research-boundary audit, semantic deferral, and allowlisted repair.
- Use `ariadne:validator` for deterministic structural checks.
- Use `ariadne:navigation` when maintenance requires durable structural changes.
- Use `ariadne:research-synthesis` when an authorized synthesis pass needs a disposition.
