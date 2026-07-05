---
name: ariadne:project-agents
description: Create or update project-level agent instruction files for code repositories or ordinary project folders, including AGENTS.md, CLAUDE.md, GEMINI.md, local override files, and Ariadne vault-link blocks. Use when a user wants to initialize, repair, or refresh project agent context, connect a project workspace to a registered Ariadne vault or scope, or make project instructions portable across Codex, Claude Code, Gemini CLI, and other agent runtimes without duplicating global discovery.
---

# Ariadne Project Agents

Use this skill to make a project folder agent-readable and connect it to Ariadne vault context when useful.

This skill owns project-level files. `ariadne:discovery` owns machine-level registry files and global adapter blocks.

## Core Model

Project agent files are a bridge:

```text
global agent files -> registered vault discovery -> vault or scope context
project agent files -> local project rules -> optional vault/scope link
```

Keep the bridge small. Do not copy vault navigation, private absolute paths, or long scope notes into public project files.

## Bounded Discovery

Inspect only the smallest useful project context:

1. Current directory and parents up to the nearest project root.
2. Existing `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and local override files in that root.
3. `.gitignore`.
4. High-signal project files such as `README.md`, package or build manifests, test config, and existing docs indexes.
5. Registered vault metadata only when the user asks to connect the project to Ariadne context, repair stale global discovery, or the prompt is ambiguous about which known project/vault it refers to.

Do not scan the whole computer. Do not scan an entire vault or repository to infer intent. Use filenames, manifests, and existing entry files first.

## Questions

Ask adaptively when missing information changes the files to write.

Useful questions:

- Which project root should receive these files?
- Which runtimes should be supported: Codex, Claude Code, Gemini CLI, or another adapter?
- Should the vault connection be public-safe in tracked files, private in local ignored files, or both?
- Which registered vault or scope should this project link to?
- Should existing agent files be updated, split into canonical plus adapters, or left unchanged except for the Ariadne marker block?

When multiple vaults, scopes, or project roots are plausible, show the top matches with short reasons and ask the user to choose. Search hits, current directory, or prior conversation alone are not permission to write an ambiguous vault/scope link.

## Project File Pattern

Use `references/project-agent-files.md` when creating or restructuring files.

Default shape:

- `AGENTS.md` - canonical project instructions, usually public-safe.
- `CLAUDE.md` - thin Claude adapter, usually `@AGENTS.md` plus Claude-only deltas.
- `GEMINI.md` - thin Gemini adapter, usually `@AGENTS.md` plus Gemini-only deltas.
- `AGENTS.override.md` - optional Codex local override, gitignored.
- `CLAUDE.local.md` - optional Claude local memory, gitignored.
- `GEMINI.local.md` - optional Gemini local context, gitignored.

If the project already has a different valid pattern, preserve it and add the smallest compatible Ariadne link.

## Ariadne Vault Links

Use a marker-managed block for the project-to-vault bridge:

```md
<!-- ariadne:project-vault-link:start -->
...
<!-- ariadne:project-vault-link:end -->
```

Update only inside this block when refreshing the Ariadne link. Preserve all user content outside the block.

The block may say how to consult registered vaults and which vault or scope is relevant, but it must not make the project file the source of truth for vault navigation.

Rules:

- If the link names a vault or scope, it must come from the current prompt, existing project instructions, or explicit user confirmation.
- If multiple registered vaults are plausible, ask before writing the link.
- Scope-specific links require a current-turn explicit target or user confirmation.
- Global discovery registers vaults, not individual project scopes.
- For private paths, client names, personal workflow defaults, or maintainer-only routing, use local ignored files instead of tracked project files.

## Creation Workflow

1. Identify the project root. Prefer the current directory when it is already the root; otherwise use the nearest `.git` root or ask.
2. Read existing project agent files and `.gitignore`.
3. Inspect high-signal project files to infer project name, commands, tests, and public-safe context.
4. Decide the runtime file set.
5. Decide whether the Ariadne connection belongs in tracked files, local ignored files, or both.
6. If vault or scope target is ambiguous, ask before writing.
7. Create or update files using the patterns reference.
8. Add local-only filenames to `.gitignore` when local files are created.
9. Report which files changed and which context is intentionally left for the vault.

## Update Workflow

When files already exist:

1. Preserve existing instructions.
2. Replace the Ariadne marker block in place when exactly one block exists.
3. Add a marker block only when the user asked for an Ariadne/vault connection or existing files clearly intend one.
4. Refuse to guess if duplicate or malformed Ariadne marker blocks exist. Name the markers, say which file contains them, and ask whether to merge, remove duplicates, or leave the file unchanged before editing.
5. Avoid converting a project to a new adapter layout unless the user asked for normalization or the current files duplicate large instruction blocks.

## Global Discovery

If machine-level discovery is absent or stale, offer `ariadne:discovery`. Do not silently modify global agent files from this skill.

When called from outside a clear project:

- If the user asks for global discovery, route to `ariadne:discovery`.
- If the user asks to initialize project agent files, ask for the project folder or use an explicit path from the prompt.
- If multiple registered vaults plausibly contain the project context, show top matches and ask which one should link to the project.

## Related Skills

- Use `ariadne:discovery` for `~/.ariadne` registry files and global adapter blocks.
- Use `ariadne:vault` to bootstrap an Obsidian vault.
- Use `ariadne:scope` to create or wire a vault scope before linking a project to it.
- Use `ariadne:navigation` when the vault needs new hubs or routing for the project.
