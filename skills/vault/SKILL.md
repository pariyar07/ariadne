---
name: ariadne:vault
description: Bootstrap an agentic Markdown knowledge vault for projects, research, learning, life systems, and other long-running knowledge work. Use when creating a new vault, installing the base folder structure, templates, AGENTS.md, CLAUDE.md, Agent navigation files, and optional Obsidian-compatible Bases.
---

# Ariadne Vault

Use this skill to create or refresh a durable, agent-maintained Markdown knowledge vault. Obsidian is an optional, recommended frontend rather than a runtime requirement.

This skill complements Obsidian mechanics skills:

- Use `obsidian-markdown` for notes, properties, wikilinks, embeds, and callouts.
- Use `obsidian-bases` for `.base` views.
- Use `json-canvas` for `.canvas` maps.
- Use `defuddle` for clean Markdown extraction from web pages.
- Use `obsidian-cli` when Obsidian is open and CLI interaction is useful.

It also has workflow companion skills:

- `ariadne:knowledge-capture` for raw inputs, links, documents, and brain dumps.
- `ariadne:global-discovery` for registering existing vaults so cold agents can find them from any workspace.
- `ariadne:workspace-instructions` for creating or updating workspace-level `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md` files that connect a workspace to registered Ariadne context.
- `ariadne:research-ingest` for cold-start research sources, target confirmation, and write-set orchestration.
- `ariadne:research-synthesis` for multi-source research disposition and inquiry history.
- `ariadne:research-stewardship` for audit-first research-boundary health and allowlisted repairs.
- `ariadne:research-pipeline` for adding research intake and synthesis infrastructure inside an existing scope.
- `ariadne:workstream-tracking` for Kanban work boards, Dataview dashboards, and workstream status tracking.
- `ariadne:closeout` for post-work capture, checkpoints, handoffs, and safe-to-close decisions.
- `ariadne:maintenance` for health checks and recurring maintenance.
- `ariadne:navigation` for hubs, routing, workstream graphs, and Base/view-layer changes.

## Prerequisites

Before bootstrapping or refreshing a vault, confirm the user has:

- A target vault folder available on disk.
- Optional: Obsidian installed when the user wants its native frontend.
- Optional: Obsidian Bases enabled when the vault should render `.base` dashboards.
- Node.js available for the validator and `scripts/register_vault.js`.
- A skills-capable agent runtime.

For full Obsidian mechanics coverage, recommend installing `https://github.com/kepano/obsidian-skills` alongside Ariadne when equivalent skills are not already available. Those companion skills cover Markdown, Bases, JSON Canvas, clean web extraction, and Obsidian CLI interaction.

## Core Model

The vault is the memory. The skill is the setup and maintenance procedure.

The human curates direction. Agents compile raw material into a linked Markdown wiki. Any filesystem-capable agent can operate the source directly. Obsidian is a recommended readable frontend; Bases and canvases are optional view layers over the Markdown source of truth and never replace it.

For multi-area vaults, model the vault as a recursive scope tree. The root scope owns global policy and shared view layers. Each child scope inherits parent rules and adds only local deltas — it never repeats the parent and never ignores it.

The design principles behind these patterns are documented in the skill references:

- `references/knowledge-processing-architecture.md` — intake interfaces, processing passes, and the raw → compiled pipeline
- `references/recursive-scopes.md` — scope inheritance, the includes-and-transcends model, wikilink resolution
- `references/vault-operating-model.md` — the three-layer vault model and navigability rules

These are reference documentation for skill users. They are not files to bootstrap into the target vault — the principles are encoded in how the skills work.

This skill bootstraps the system. Use the companion skills for ongoing ingest, synthesis, navigation changes, and maintenance.

## Start Workflow

Before writing, read applicable existing root and ancestor instructions. When refreshing a multi-scope vault, require a current-turn named or confirmed target and state an explicit `allowed_write_set`; name every out-of-target hub, routing matrix, or Base formula separately.

1. Determine the vault path and purpose.
2. Classify the vault mode:
   - `project` - shipping/building something.
   - `research` - studying a topic.
   - `learning` - building durable understanding.
   - `life` - personal operating system, admin, goals, habits.
   - `system` - procedures, workflows, infrastructure, automation.
   - `mixed` - more than one of the above.
3. Create or update the base folder structure.
4. Add core files from `assets/templates/`. A new vault must include the schema-v1 root checkpoint (`00 Index.md`, `AGENTS.md`, `Agent/00 Agent Navigation.md`, and `Agent/Task Routing Matrix.md`) plus `Bases/Scope Registry.base`, `Agent/Scope Map.md`, and `Agent/Scope Map.canvas`.
5. Customize `00 Index.md`, `AGENTS.md`, and `CLAUDE.md` for the vault purpose.
6. Add `Agent/00 Agent Navigation.md`, `Agent/Vault Navigation Standard.md`, `Agent/Task Routing Matrix.md`, and `Agent/Vault Health Check Procedure.md` when useful.
7. Add relevant mode folders from `references/vault-structure.md`.
8. Create Bases from the `.base` files in `assets/templates/` when useful.
9. Add `Bases/00 Bases Index.md` and link each Base from it, including the generated scope registry.
10. Add Kanban boards or Dataview dashboards only when a recurring workstream needs visible status tracking.
11. Validate that Markdown frontmatter and Base YAML parse.
12. If machine-level discovery is absent or stale, explicitly offer `ariadne:global-discovery` so future cold agents can discover the vault from outside the vault. Do not silently write global files.
13. If the user also has a code repository or folder that should point at this vault or one of its scopes, offer `ariadne:workspace-instructions` after the vault and discovery path are clear.

## Default Folder Structure

Create these folders unless the user asks for a different structure:

- `Raw/`
- `Raw/Sources/`
- `Inbox/`
- `Processing Queue/`
- `Notes/`
- `Research/`
- `Entities/`
- `Relationships/`
- `Concepts/`
- `Questions/`
- `Decisions/`
- `Outputs/`
- `Visualizations/`
- `Templates/`
- `Agent/`
- `Bases/`
- `Archive/`

Add mode-specific folders only when useful.

## Long-Term Context Discovery

Do not read the entire vault by default.

Use progressive discovery:

1. Read `00 Index.md`.
2. Read `AGENTS.md` or `CLAUDE.md`.
3. Read `Agent/Long Term Knowledge Workflow.md`.
4. Search filenames with `find`.
5. Search content with `rg`.
6. Read hub/index notes first.
7. Follow relevant wikilinks.
8. Read raw sources only when compiled notes are insufficient.
9. Use `.base` files to inspect note status and metadata.

## Machine-Level Vault Registration

After bootstrapping or refreshing a vault, check whether machine-level discovery is absent or stale enough to affect cold agents. If so, explicitly offer to use `ariadne:global-discovery` to register, update, or repair discovery for the vault.

Registration and repair are optional and should be explicit. Do not silently write global agent instruction files.

When the user agrees, use `scripts/register_vault.js`:

```bash
node /path/to/skills/vault/scripts/register_vault.js \
  --vault "/path/to/vault" \
  --name "Vault Name" \
  --purpose "Short purpose statement." \
  --agents codex,claude,gemini \
  --primary
```

What registration creates:

- `~/.ariadne/vaults.json` - machine-readable vault registry.
- `~/.ariadne/vaults.md` - agent-readable vault registry.
- small marker-managed discovery blocks in selected global agent files.

Supported adapters:

- `codex` - `~/.codex/AGENTS.md`
- `claude` - `~/.claude/CLAUDE.md`
- `gemini` - `~/.gemini/GEMINI.md`
- `copilot` - `~/.copilot/copilot-instructions.md`
- `opencode` - `~/.config/opencode/AGENTS.md`
- `roo` - `~/.roo/rules/ariadne-vault-discovery.md`
- `cline` - `~/Documents/Cline/Rules/ariadne-vault-discovery.md`

Use `--agents all` only when the user wants all supported adapters. Use `--agents none` when the user only wants the registry files.

Use `--dry-run` before writing when the user wants to inspect changes.

Use `--remove` through `ariadne:global-discovery` when the user wants to unregister a vault.

If a global discovery lookup returns multiple plausible vault matches, show the top matches with short reasons and ask which vault to use before creating, updating, or filing artifacts.

Inside a selected multi-scope vault, write actions need a current-turn explicit target. A target is explicit only when the current prompt names the target scope, domain, customer, project, or workstream, or the user confirms one after the agent asks. Search hits, a single likely match, existing matching cards, prior conversation, current working directory, and active skills are not confirmation.

Safety rules:

- Global files should point to `~/.ariadne/vaults.md`; they should not duplicate long vault instructions.
- Existing global instructions must be preserved.
- Updates must stay inside the marker block:
  - `<!-- ariadne:vault-discovery:start -->`
  - `<!-- ariadne:vault-discovery:end -->`
- Re-running registration for the same vault should update the existing registry entry, not duplicate it.
- Re-running registration can also refresh stale marker-managed discovery blocks when Ariadne ships newer discovery rules.

Cold agents that encounter the global discovery block should read the registry first for vague questions, terse keyword prompts, or empty-workspace ambiguity about prior projects, documents, meetings, research, decisions, customers, work history, personal knowledge, or "what was I working on".

## Navigation Pattern

New vaults should separate:

- knowledge graph: research, concepts, entities, relationships, decisions, architecture, product, and other durable semantic notes
- operating graph: agent instructions, workflows, templates, inbox, processing queue, raw sources, outputs, and health checks
- view layer: Bases, canvases, dashboards, and generated reports

Future scopes should be promoted only when recurring use needs a dedicated route. A promoted scope needs a hub, parent/child navigation links, routing coverage, optional local rules, optional templates, optional Bases, and health-check coverage.

The root starts as the active `root` scope at path `.`. Keep the generated `ariadne:scope-boundary`, `ariadne:scope-inheritance`, `ariadne:scope-navigation`, `ariadne:scope-routing`, and `ariadne:scope-map` blocks byte-compatible with the shared topology renderer. Keep vault-specific workflows and policy outside those blocks. The scope registry and Canvas are fully generated; do not hand-edit them or copy policy into inheritance output.

## Templates

Use the files in `assets/templates/` as starting points. Copy them into the target vault and customize placeholders.

See:

- `references/vault-operating-model.md`
- `references/vault-modes.md`
- `references/vault-structure.md`
- `references/maintenance.md`
- `references/knowledge-processing-architecture.md`
- `references/recursive-scopes.md`
- `references/bases-scope-patterns.md`
