# {{vault_name}} - Agent Instructions

This is an Obsidian vault maintained as a durable, agent-readable Markdown knowledge base.

Read first:

1. `00 Index.md`
2. `Agent/00 Agent Navigation.md`
3. `Agent/Long Term Knowledge Workflow.md`
4. `Agent/Ingest Compile Workflow.md`
5. `Agent/Vault Navigation Standard.md` before navigation changes.
6. `Agent/Knowledge Processing Architecture.md` before structural changes.
7. If working inside a durable workstream folder, check for a local `AGENTS.md` and follow it if present.

Rules:

- Keep notes as plain Markdown with Obsidian wikilinks.
- Use YAML frontmatter with `title`, `type`, `status`, `created`, and `tags` where useful.
- Keep raw source captures separate from compiled notes.
- Update indexes when adding important notes.
- Link new Bases from `Bases/00 Bases Index.md`.
- Distinguish source claims, interpretation, and decisions.
- Search progressively. Do not read the whole vault by default.
- Promote new workstream graphs only when recurring use needs a hub, routing rule, optional template, optional Base, and health-check coverage.
- Before write actions in a multi-scope vault, require a current-turn explicit target. A target is explicit only when the current prompt names the scope/domain/customer/project/workstream, or the user confirms one after being asked. Search hits, a single likely match, existing matching cards, prior conversation, current working directory, and active skills are not permission to edit a scope.
- Proactively call out navigation bloat: oversized entry files, folders without hubs, hubs that need sub-hubs, recurring workstreams missing routing, and raw/inbox/output buildup without compilation.
- Propose a local folder `AGENTS.md` when global rules are too generic for repeated work in a specialized folder.

Proactive repair routing:

- If you notice broken discovery, stale registry entrypoints, missing adapter marker blocks, broken wikilinks, invalid Bases, ambiguous navigation, scope drift, raw-source buildup, stale queues, or missing local guidance while doing any task, do not silently ignore it.
- Tell the user what appears broken, why it matters, and the smallest safe repair path.
- Offer the relevant skill or check:
  - Global discovery or cold-start registry issues: `obsidian-vault-discovery` and the Ariadne discovery doctor.
  - Broken links, orphan notes, invalid frontmatter, invalid Bases, or stale queues: `obsidian-vault-validator` followed by `obsidian-vault-maintainer`.
  - Navigation bloat, routing drift, missing hubs, or unclear scope boundaries: `obsidian-navigation-architect`.
  - Raw material, inbox items, or uncompiled sources piling up: `obsidian-ingest-compile` or `obsidian-research-ingest`.
  - Missing research workflow infrastructure: `obsidian-research-pipeline`.
  - Stale synthesis, old assumptions, or unresolved questions: `obsidian-research-synthesis`.
- Prefer deterministic checks before broad rewrites. Ask before changing global agent files, installing skills, or restructuring vault navigation unless the user already asked for that maintenance.

Wikilink resolution for agents:

When following a bare wikilink such as `[[AGENTS]]` or `[[00 Index]]`, use Obsidian's own nearest-scope-first algorithm — do not guess or load all matches:

1. Look for the file in the same folder as the note containing the link.
2. If not found, walk toward the vault root, preferring the closest match.
3. If still ambiguous, prefer the path-qualified form and flag the ambiguity.

Navigation files (`AGENTS.md`, `00 Index.md`, `Agent/` folder) must always use path-qualified wikilinks so agents arriving cold have zero ambiguity. Content notes may use bare links because agents always arrive at them through a qualified navigation file, never cold.

Purpose:

{{purpose}}
