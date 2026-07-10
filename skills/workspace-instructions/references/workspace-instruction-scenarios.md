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
- `WORKSPACE.md` existence and missing-reference signals.
- Fixed-depth child directories, child Git repos, and exact child-name mentions by file.
- Root `.git` plus child Git repo topology signals.
- Codex `AGENTS.override.md` bodies that have drifted out of sync with `AGENTS.md` (`codexOverrideOutOfSyncFiles`). The check strips the `ariadne:workspace-vault-link` block, then confirms the override still contains the current `AGENTS.md` body verbatim; it fires only when both files exist at the root.
- Shared instruction files that exceed the ~150-line open-standard length (`oversizedForStandardFiles`), separate from the >180 hard-compaction heuristic (`largeInstructionFiles`).
- A canonical `AGENTS.md` with no command guidance (`agentsMissingCommandGuidance`): no commands-style heading and no code fence. Thin adapters and `WORKSPACE.md` are intentionally excluded.
- Missing child-name detection is intentionally narrow: it only scans backticked tokens on inventory-looking Markdown list or table lines, and it skips tokens containing dots. An empty missing-name signal is not proof that every listed child exists.
- Exact child-name mentions may come from ordinary prose for common names such as `docs`, `src`, `test`, or `web`; the skill should discount prose-only matches when deciding whether a real duplicated map exists.

Skill-owned:

- Which sharing mode to use.
- Whether content is useful workspace policy, private/local context, or vault-owned duplication.
- Whether to ask a clarifying question or make conservative cleanup.
- Whether to migrate, merge, remove, or leave ambiguous marker blocks.
- Whether a confirmed vault or scope target is specific enough to name in a workspace file.
- Which file owns child repo/folder inventory.
- Whether child-name overlap means duplication, conflict, or an intentional quick pointer.

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
| Shared, local, or both | Choose a single sharing mode only when the prompt or existing layout makes it unambiguous. | When a run could produce both public tracked files and private ignored files, ask whether the user wants shared only, local only, or both, and which content goes in each. | Do not silently split content across tracked and ignored files by guess. |
| Stale Codex override | Re-sync the `AGENTS.override.md` body from the current `AGENTS.md`, preserving the local `ariadne:workspace-vault-link` block. Refresh it in the same run whenever tracked `AGENTS.md` is edited. | Ask only if the override intentionally diverges from `AGENTS.md` rather than copying it. | Do not leave `AGENTS.override.md` restating an older `AGENTS.md`, and do not overwrite its local marker block. |
| Audit and attestation | Audit new and updated instruction files against `references/instruction-file-rules.md`, auto-fix low-risk mechanical gaps, and attest the result in the report. | Ask before substantive `AGENTS.md` rewrites for judgment rules (specificity, boundaries, closure, generic content) or before compacting an oversize file that may drop real content. | Do not write attestation markers into user files, and do not silently rewrite older files to satisfy a judgment rule. |
| Non-Git folder | Keep files portable by default and avoid private absolute paths. | Ask only when sharing intent changes the file shape. | Do not assume the folder will never be shared. |
| Non-Git parent with child repos | Use `WORKSPACE.md` as the supported parent workspace contract and keep `AGENTS.md` as the agent entry pointer. | Ask before changing child repo semantics or root Git topology. | Do not leave the full child map duplicated in `AGENTS.md` after `WORKSPACE.md` becomes the owner. |
| Parent workspace migration | When a refresh introduces `WORKSPACE.md`, move an existing child repo map from `AGENTS.md` to `WORKSPACE.md` and shrink `AGENTS.md` to a pointer when ownership is clear. | Ask if commands, safety rules, or conventions would need to move with the map. | Do not treat preserving the map in `AGENTS.md` as sufficient after delegating to `WORKSPACE.md`. |
| Missing `WORKSPACE.md` reference | Report the missing referenced file. | Ask whether to create `WORKSPACE.md`, fix the stale reference, or point to another file. | Do not invent a workspace inventory just because `AGENTS.md` references a missing `WORKSPACE.md`. |
| Conflicting child maps | Surface exact child-name mentions by file. | Ask which map is current. | Do not silently merge conflicting child repo/folder lists. |
| Child repo freshness | Surface fixed-depth child Git repos, exact mentions by file, and missing child-like names from inventory lines. | Ask whether stale entries should be removed or unmapped child repos should be added. | Do not treat mechanical mismatches as automatic edit permission. |
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
| Submodules or child Git repos | Stop traversal at child `.git` roots for parent-level signals. | Ask before editing inside a child repo or submodule. | Do not let nested child-repo `AGENTS.md` files pollute parent workspace signals. |
| Obsidian vault root | Defer to `ariadne:vault` conventions unless only adding a compact compatible vault link. | Ask before replacing vault navigation or agent files with generic workspace templates. | Do not treat a vault root as a generic repo. |
| Multiple plausible vaults or scopes | Show top matches with short reasons. | Ask which vault or scope to link before writing a scope-specific block. | Do not write a block naming a scope from search hits alone. |
| Bare Obsidian mention | Treat the word `Obsidian` as weak context only. | Ask or abstain unless Ariadne-specific signals also exist. | Do not write an Ariadne vault-link block because a repo mentions Obsidian. |
| Closeout in workspace links | Include `ariadne:closeout` only inside marker-managed vault-link content and only when a vault link is being written. | Ask if the workspace has no Ariadne/vault connection but the user wants closeout guidance. | Do not add unmanaged closeout prose to unrelated workspace files. |

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
