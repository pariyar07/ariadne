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
- Proactively call out navigation bloat: oversized entry files, folders without hubs, hubs that need sub-hubs, recurring workstreams missing routing, and raw/inbox/output buildup without compilation.
- Propose a local folder `AGENTS.md` when global rules are too generic for repeated work in a specialized folder.

Wikilink resolution for agents:

When following a bare wikilink such as `[[AGENTS]]` or `[[00 Index]]`, use Obsidian's own nearest-scope-first algorithm — do not guess or load all matches:

1. Look for the file in the same folder as the note containing the link.
2. If not found, walk toward the vault root, preferring the closest match.
3. If still ambiguous, prefer the path-qualified form and flag the ambiguity.

Navigation files (`AGENTS.md`, `00 Index.md`, `Agent/` folder) must always use path-qualified wikilinks so agents arriving cold have zero ambiguity. Content notes may use bare links because agents always arrive at them through a qualified navigation file, never cold.

Purpose:

{{purpose}}
