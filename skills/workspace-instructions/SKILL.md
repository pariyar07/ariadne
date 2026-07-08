---
name: ariadne:workspace-instructions
description: Create or update workspace-level instruction files for code repositories or ordinary project folders, including AGENTS.md, CLAUDE.md, GEMINI.md, local override files, and Ariadne vault-link blocks. Use when a user wants to initialize, repair, or refresh workspace instructions, connect a workspace to a registered Ariadne vault or scope, or make instructions portable across Codex, Claude Code, Gemini CLI, and other agent runtimes without duplicating global discovery.
---

# Ariadne Workspace Instructions

Use this skill to make a workspace agent-readable and connect it to Ariadne vault context when useful.

This skill owns workspace-level instruction files. `ariadne:global-discovery` owns machine-level registry files and global adapter blocks.

## Core Model

Workspace instruction files are a bridge:

```text
global agent files -> registered vault discovery -> vault or scope context
workspace instruction files -> local workspace rules -> optional vault/scope link
```

Keep the bridge small. Do not copy vault navigation, private absolute paths, or long scope notes into public workspace files.

## Bounded Discovery

Inspect only the smallest useful workspace context:

1. Current directory and parents up to the nearest workspace root.
2. Existing `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `WORKSPACE.md`, and local override files in that root.
3. `.gitignore`.
4. High-signal workspace files such as `README.md`, package or build manifests, test config, and existing docs indexes.
5. Git state when relevant: whether the folder is inside a worktree, the repository root, tracked instruction files, ignored local files, and whether remotes suggest the workspace is shared.
6. Registered vault metadata only when the user asks to connect the workspace to Ariadne context, repair stale global discovery, or the prompt is ambiguous about which known workspace/vault it refers to.

Do not scan the whole computer. Do not scan an entire vault or repository to infer intent. Use filenames, manifests, and existing entry files first.

## Mechanical Signal Check

When the workspace shape is uncertain, or when repairing existing instruction files, you may run the deterministic checker:

```bash
node scripts/check_workspace.js "/path/to/workspace" --json
```

Resolve `scripts/check_workspace.js` relative to this `SKILL.md`. In an Ariadne repository checkout, the same script lives at `skills/workspace-instructions/scripts/check_workspace.js`.

Use the checker for mechanical signals only: Git/worktree state, tracked or ignored instruction files, local-file `.gitignore` coverage, private-path signals, instruction line counts, high line-count files, duplicated vault navigation, adapter duplication, copied global-discovery blocks, malformed, duplicate, legacy, or foreign marker blocks, `WORKSPACE.md` references, fixed-depth child directories, child Git repos, exact child-name mentions by file, and root Git plus child Git repo topology.

Do not let checker output replace judgment. This skill decides whether to ask a question, preserve workspace-specific rules, split shared/local content, or perform conservative cleanup.

## Questions

Ask adaptively when missing information changes the files to write.

Useful questions:

- Which workspace root should receive these files?
- Is this workspace shared through Git, local-only on this machine, or should it have both shared and local/private instruction files?
- Which runtimes should be supported: Codex, Claude Code, Gemini CLI, or another adapter?
- Should the vault connection be public-safe in tracked files, private in local ignored files, or both?
- Which registered vault or scope should this workspace link to?
- Should existing instruction files be updated, split into canonical plus adapters, or left unchanged except for the Ariadne marker block?
- If `AGENTS.md` references a missing `WORKSPACE.md`, should I create `WORKSPACE.md`, fix the stale reference, or point to another file?

When multiple vaults, scopes, or workspace roots are plausible, show the top matches with short reasons and ask the user to choose. Search hits, current directory, or prior conversation alone are not permission to write an ambiguous vault/scope link.

## Workspace File Pattern

Use `references/workspace-instruction-files.md` when creating or restructuring files.

Use `references/workspace-instruction-scenarios.md` when edge-case behavior matters, such as Git shared/local mode, stale `.gitignore` coverage, private-path leakage, bulky instruction files, adapter normalization, duplicate or malformed markers, legacy marker migration, copied global-discovery blocks, nested subprojects, worktrees, `WORKSPACE.md` ownership, child repo/folder inventory, or ambiguous vault/scope links.

Default shape:

- `AGENTS.md` - canonical workspace instructions, usually public-safe.
- `WORKSPACE.md` - optional workspace contract for parent folders, child repo/folder inventory, boundaries, and shared operating model. This is a supported Ariadne pattern, not a runtime convention; agents only read it reliably when `AGENTS.md` points to it.
- `CLAUDE.md` - thin Claude adapter, usually a short sentence plus `@AGENTS.md` and any Claude-only public deltas.
- `GEMINI.md` - thin Gemini adapter when Gemini CLI support is requested, usually a short sentence plus `@AGENTS.md` and any Gemini-only public deltas.
- `AGENTS.override.md` - optional Codex local replacement override, gitignored. Codex prefers this over `AGENTS.md` at the same directory level, so do not treat it as a small supplement.
- `CLAUDE.local.md` - optional Claude local memory, gitignored.
- `GEMINI.local.md` - optional Ariadne local context convention for Gemini workflows, gitignored. Do not assume Gemini loads it automatically unless the local runtime configuration or user confirms that behavior.

If the workspace already has a different valid pattern, preserve it and add the smallest compatible Ariadne link.

Do not create `WORKSPACE.md` for plain single repos by default. Propose it proactively for non-Git parent workspaces with child Git repos, or use it when it already exists or the user asks for it.

## Sharing Mode

Before writing or restructuring files, decide the sharing mode.

Check whether the workspace is inside Git. If it is, inspect whether instruction files are tracked and whether local-only filenames are covered by `.gitignore`. If the answer changes what you would write and the prompt does not make the intent clear, ask one short question: should these instructions be shared in the repo, local-only for this machine, or split into shared plus local/private files?

Use this mapping:

- Shared repo: tracked `AGENTS.md` contains public-safe workspace rules and a compact Ariadne link. Tracked `CLAUDE.md` and `GEMINI.md` stay thin adapters unless they have real runtime-specific public deltas.
- Local-only in a Git repo: prefer ignored local files and add `.gitignore` coverage before creating them. Do not create or modify tracked instruction files unless the user asks.
- Shared plus local: put stable team/workspace rules in tracked files and put private vault paths, exact scope paths, personal workflow, sandbox paths, and machine-only commands in ignored local files.
- Non-Git folder: ask only when sharing intent is unclear and materially affects the file shape. If the user does not care, keep files portable and avoid private absolute paths in files likely to be copied elsewhere.

Do not invent a generic `AGENTS.local.md` convention. Use `AGENTS.override.md` only when a Codex replacement file is intended. Use `CLAUDE.local.md` for Claude local project memory. Use `GEMINI.local.md` only as an explicit local convention when the user's Gemini setup loads it or the user asks for it.

Never run destructive Git cleanup from this skill. If the user explicitly asks to make a parent workspace non-Git, explain a root-only, child-preserving plan and ask before any command that removes or rewrites root `.git`; child `.git` directories or gitfiles must be preserved.

## Proactive Maintenance Pass

When creating, refreshing, or connecting workspace instructions, do not only add or replace the Ariadne marker block. First classify existing content:

- Keep in shared workspace instructions: purpose, boundaries, commands, test/build/validation workflow, coding conventions, review expectations, and compact safety rules.
- Keep in `WORKSPACE.md` when present or clearly being created for a parent workspace: workspace purpose, parent boundaries, child repo/folder inventory, shared operating model, and root-only safety rules.
- Keep local-only: private vault paths, exact private scope paths, client names not meant for collaborators, personal defaults, machine-local commands, sandbox paths, and temporary migration notes.
- Leave in the vault: long navigation lists, destination maps, scope catalogs, decision history, roadmap details, customer context, raw transcripts, and long copied vault instructions.
- Keep as adapter deltas only when needed: runtime-specific instructions for Claude, Gemini, Copilot, or another adapter.
- Ask about: content that could be either repo operating policy or private/vault-owned context.

Act without asking when the cleanup is clearly low-risk: compact copied vault navigation into a small vault-link block, remove private/local details from tracked files, add missing `.gitignore` coverage for local files, normalize verbose adapters that only duplicate `AGENTS.md`, or move a child repo/folder map from `AGENTS.md` to an existing or explicitly requested `WORKSPACE.md` when the destination owner is clear.

Ask before removing or moving ambiguous workspace-specific rules, moving commands or safety rules out of `AGENTS.md`, changing a confirmed scope link, merging duplicate marker blocks, replacing a substantial runtime-specific adapter, converting between shared/local modes when the user has not made sharing intent clear, resolving conflicting `AGENTS.md` and `WORKSPACE.md` child maps, or creating a missing referenced `WORKSPACE.md`.

Use this ask-vs-act rule:

- Act when a signal is mechanical and the destination is clear: add missing `.gitignore` coverage for local-only files, remove private paths from tracked files by moving them to an existing ignored local file, compact copied vault navigation into a small vault-link block, normalize adapters that exactly duplicate `AGENTS.md`, or move clear child repo/folder inventory into an owned `WORKSPACE.md`.
- Ask when ownership or target is ambiguous: content could be workspace policy or private context, local-only mode would remove collaborator guidance, multiple vaults or scopes are plausible, a scope-specific link lacks current-turn confirmation, `WORKSPACE.md` is referenced but missing, child maps conflict, a nested `AGENTS.md` may contain meaningful local deltas, or marker blocks are duplicate or malformed.
- Stop rather than guess when a marker-managed region is malformed, when more than one Ariadne vault-link block exists, or when changing `AGENTS.override.md` would replace shared Codex guidance.

When `AGENTS.md` references `WORKSPACE.md`, cross-file consistency is required: a missing referenced `WORKSPACE.md` is a stop-and-ask finding, child repo/folder maps should live in `WORKSPACE.md` when it exists or is explicitly requested, and `AGENTS.md` should keep only a short pointer plus agent behavior. If both files mention child names, use checker facts as evidence; ask before resolving conflicting maps.

## Ariadne Vault Links

Use a marker-managed block for the workspace-to-vault bridge:

```md
<!-- ariadne:workspace-vault-link:start -->
...
<!-- ariadne:workspace-vault-link:end -->
```

Update only inside this block when refreshing the Ariadne link. Preserve all user content outside the block.

If an existing file has an older Ariadne vault-link marker block from a previous marker convention, migrate that block in place to `ariadne:workspace-vault-link` instead of appending a second block. If multiple Ariadne vault-link marker blocks exist, stop and ask whether to merge or remove duplicates.

The block may say how to consult registered vaults and which vault or scope is relevant, but it must not make the workspace file the source of truth for vault navigation.

Rules:

- If the link names a vault or scope, it must come from the current prompt, existing workspace instructions, or explicit user confirmation.
- If multiple registered vaults are plausible, ask before writing the link.
- Scope-specific links require a current-turn explicit target or user confirmation.
- Global discovery registers vaults, not individual project scopes.
- For private paths, client names, personal workflow defaults, or maintainer-only routing, use local ignored files instead of tracked workspace files.
- Add a vault-link block only when the user asks for Ariadne/vault context, existing files contain Ariadne markers, `~/.ariadne` registry references, `ariadne:*` skill triggers, registered-vault instructions, Vault Updates sections, or a local file with a vault link. A bare `Obsidian` mention is weak context only; ask or abstain instead of writing a link.
- When adding closeout guidance, place it inside marker-managed vault-link content and only when a vault link is being written. Mention `ariadne:closeout` only for meaningful completed work, checkpoints, handoffs, releases, evaluations, incidents, durable decisions, or safe-to-close questions; do not run closeout for every tiny edit.

## Creation Workflow

1. Identify the workspace root. Prefer the current directory when it is already the root; otherwise use the nearest `.git` root or ask.
2. Read existing workspace instruction files and `.gitignore`.
3. Inspect high-signal workspace files to infer workspace name, commands, tests, and public-safe context.
4. Run the checker when existing file shape, Git state, or marker state is unclear.
5. Decide sharing mode: shared, local-only, shared plus local, or non-Git portable.
6. Decide the runtime file set.
7. Decide whether the Ariadne connection belongs in tracked files, local ignored files, or both.
8. Run the proactive maintenance pass before writing.
9. If vault or scope target is ambiguous, ask before writing.
10. Create or update files using the patterns reference.
11. Add local-only filenames to `.gitignore` when local files exist or are created in a Git workspace.
12. Rerun the checker and inspect touched files.
13. Report which files changed, which mode was used, which checker signals remain, and which context is intentionally left for the vault or local-only files.

## Update Workflow

When files already exist:

1. Preserve useful workspace-specific instructions.
2. Run the sharing-mode check and proactive maintenance pass.
3. Run the checker when marker state, local-file ignore coverage, adapter duplication, or private-path leakage is unclear.
4. Replace the Ariadne marker block in place when exactly one block exists.
5. Add a marker block only when the user asked for an Ariadne/vault connection or existing files clearly intend one.
6. Refuse to guess if duplicate or malformed Ariadne marker blocks exist. Name the markers, say which file contains them, and ask whether to merge, remove duplicates, or leave the file unchanged before editing.
7. Compact duplicated vault navigation, private/local details, and adapter duplication when the ownership is clear.
8. If `AGENTS.md` references `WORKSPACE.md`, ensure `WORKSPACE.md` owns child repo/folder inventory and `AGENTS.md` is only a pointer plus agent rules. Ask on missing referenced files or conflicting maps.
9. Avoid converting to a new adapter layout unless the user asked for normalization, the current files duplicate large instruction blocks, or the existing layout conflicts with the selected sharing mode.
10. Rerun the checker and inspect touched files before reporting completion.

## Global Discovery

If machine-level discovery is absent or stale, offer `ariadne:global-discovery`. Do not silently modify global agent files from this skill.

When called from outside a clear workspace:

- If the user asks for global discovery, route to `ariadne:global-discovery`.
- If the user asks to initialize workspace instruction files, ask for the workspace folder or use an explicit path from the prompt.
- If multiple registered vaults plausibly contain the project context, show top matches and ask which one should link to the project.

## Related Skills

- Use `ariadne:global-discovery` for `~/.ariadne` registry files and global adapter blocks.
- Use `ariadne:vault` to bootstrap an Obsidian vault.
- Use `ariadne:scope` to create or wire a vault scope before linking a project to it.
- Use `ariadne:navigation` when the vault needs new hubs or routing for the project.
