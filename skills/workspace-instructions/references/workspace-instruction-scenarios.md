# Workspace Instruction Scenario Coverage

Use these scenarios to interpret `ariadne:workspace-instructions` behavior and to keep deterministic tests aligned with the skill contract.

The checker at `scripts/check_workspace.js` reports mechanical signals only. Resolve that path relative to `SKILL.md`; in the Ariadne repo checkout it lives at `skills/workspace-instructions/scripts/check_workspace.js`. The skill decides what to do with those signals.

## Signal Boundary

Checker-owned:

- Git and linked-worktree detection.
- Tracked, ignored, and local-only instruction file signals.
- Missing `.gitignore` coverage for local-only instruction files.
- Private-path signals in shared instruction files.
- Instruction line counts, high line-count files, and copied vault-navigation signals.
- Current, legacy, duplicate, malformed, copied global-discovery, and foreign marker signals.
- Adapter duplication and local-file import signals.
- Nested `AGENTS.md` duplication signals.

Skill-owned:

- Which sharing mode to use.
- Whether content is useful workspace policy, private/local context, or vault-owned duplication.
- Whether to ask a clarifying question or make conservative cleanup.
- Whether to migrate, merge, remove, or leave ambiguous marker blocks.
- Whether a confirmed vault or scope target is specific enough to name in a workspace file.

## Acceptance Format

Each fixture covers three kinds of expectations:

- Expected actions: conservative cleanup or file-shape decisions the skill can make from clear signals.
- Expected questions: short questions required before changing ambiguous ownership, sharing mode, or scope target.
- Forbidden actions: changes the skill must not make without explicit user confirmation.

## Covered Scenarios

| Scenario | Expected actions | Expected questions | Forbidden actions |
| --- | --- | --- | --- |
| Git shared mode | Keep tracked `AGENTS.md` public-safe and keep tracked adapters thin. | Ask only if the user has not made sharing intent clear and tracked/local choices would differ. | Do not put private vault paths or local files in tracked adapters. |
| Git local-only mode | Prefer ignored local files and add missing `.gitignore` coverage before creating them. | Ask if local-only mode would leave collaborators without needed repo guidance. | Do not modify tracked instruction files unless the user asks. |
| Shared plus local mode | Split stable workspace rules into tracked files and private paths or personal workflow into ignored local files. | Ask when content could be either team policy or private context. | Do not copy local-file content back into tracked files. |
| Non-Git folder | Keep files portable by default and avoid private absolute paths. | Ask only when sharing intent changes the file shape. | Do not assume the folder will never be shared. |
| Stale `.gitignore` coverage | Add local-only filenames to `.gitignore` when local files exist or are created. | Ask only if the user forbids `.gitignore` changes. | Do not create unignored local-only instruction files in a Git workspace. |
| Bulky instruction file | Use line counts and copied-navigation signals to decide whether to compact copied vault navigation into a small vault-link block while preserving commands, repo map, tests, and coding conventions. | Ask before deleting ambiguous project-specific rules. | Do not erase useful workspace instructions just because the file is long. |
| Private/local path leakage | Move private paths, exact private scope paths, sandbox paths, and personal workflow to ignored local files when local mode is clear. | Ask when the destination or sharing mode is unclear. | Do not leave private paths in tracked shared instructions. |
| Duplicated vault navigation | Replace copied vault entry orders, scope catalogs, destination maps, and raw context with a compact workspace-vault-link block. | Ask if the copied section may be real workspace routing rather than vault navigation. | Do not make the workspace file the source of truth for vault navigation. |
| Adapter normalization | Collapse adapters that duplicate `AGENTS.md` into thin imports. | Ask before replacing substantial runtime-specific adapter guidance. | Do not import ignored local files from tracked adapters by default. |
| Malformed marker block | Stop and name the malformed marker file. | Ask whether to repair, remove, or leave the malformed block. | Do not guess where the marker block ends. |
| Duplicate marker blocks | Stop and name the duplicate marker file. | Ask whether to merge, remove duplicates, or leave unchanged. | Do not silently merge duplicate Ariadne marker blocks. |
| Legacy marker block | Migrate the older Ariadne vault-link marker in place when exactly one well-formed legacy block exists. | Ask if migration would collide with another current or legacy block. | Do not append a second Ariadne vault-link block. |
| Foreign marker blocks | Leave non-Ariadne marker blocks untouched. | Ask only if a requested cleanup would need to move or remove them. | Do not edit another tool's marker-managed region. |
| Copied global-discovery block | Replace copied global discovery with a workspace-vault-link block when ownership is clear. | Ask if the file also contains malformed or duplicate Ariadne markers. | Do not copy machine-level global discovery blocks into workspace files. |
| Nested subprojects | Add or keep nested `AGENTS.md` only when local rules differ from the root. | Ask before deleting a nested file whose differences are ambiguous. | Do not duplicate the root file into every subproject. |
| Git linked worktree | Resolve the workspace root from the active worktree and inspect that worktree's files. | Ask only when multiple workspace roots are plausible. | Do not write to the source worktree by accident. |
| Multiple plausible vaults or scopes | Show top matches with short reasons. | Ask which vault or scope to link before writing a scope-specific block. | Do not write a block naming a scope from search hits alone. |

## Test Command

Run:

```bash
node skills/workspace-instructions/test/test_workspace_instructions.js
```

Installed or copied skill bundle:

```bash
node test/test_workspace_instructions.js
```

The fixtures materialize local-only filenames only in temporary directories. Do not commit `CLAUDE.local.md`, `GEMINI.local.md`, or `AGENTS.override.md` files to this repository.
