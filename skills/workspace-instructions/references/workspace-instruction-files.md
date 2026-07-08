# Workspace Instruction File Patterns

Use these patterns when `ariadne:workspace-instructions` creates or updates workspace-level instruction files.

## Sharing Modes

Choose a mode before writing files:

- Shared repo: tracked files carry public-safe guidance for collaborators and future agents.
- Local-only Git workspace: ignored files carry machine-specific guidance; tracked files are left alone unless the user asks.
- Shared plus local: tracked files carry portable rules; ignored local files carry private paths and personal workflow.
- Non-Git folder: files can be local, but keep them portable unless the user confirms they will never be shared.

When the mode is ambiguous and it changes the file shape, ask whether the user wants shared, local-only, or shared plus local instructions.

## Public-Safe Canonical File

Use `AGENTS.md` as the canonical workspace file when the workspace should share instructions across agent runtimes.

Good public-safe content:

- workspace purpose and boundaries
- repo or folder layout
- common commands for setup, test, lint, build, and validation
- coding conventions
- review and safety expectations
- links to public docs inside the workspace
- a small Ariadne vault-link block that points agents to registered vault discovery without copying private content

Avoid in tracked files:

- maintainer-local absolute paths
- private vault paths
- client secrets or production data
- personal preferences not meant for collaborators
- long copied vault instructions
- generated transcripts or raw private context

## Workspace Contract File

`WORKSPACE.md` is a supported Ariadne pattern, not a universal convention. No runtime is assumed to auto-read it; a pointer from `AGENTS.md` is load-bearing.

Use `WORKSPACE.md` when the workspace needs a parent-level contract that is bigger than agent behavior:

- non-Git parent workspaces with child Git repos
- existing workspaces that already use `WORKSPACE.md`
- user-requested parent workspace inventories
- large workspace maps that would make `AGENTS.md` noisy

Put in `WORKSPACE.md`:

- workspace purpose and boundaries
- child repo or child folder inventory
- parent non-Git policy and root-only safety rules
- shared setup, validation, or coordination commands
- ownership notes for child projects

Keep in `AGENTS.md`:

- a short instruction to read `WORKSPACE.md` before choosing a child repo or folder
- agent behavior and safety rules
- Ariadne vault-link block when relevant
- runtime-specific skill triggers or adapter guidance

Do not create `WORKSPACE.md` for plain single repos by default. If `AGENTS.md` references `WORKSPACE.md` but the file is missing, ask whether to create it, fix the stale reference, or point to another file instead of inventing an inventory.

## Thin Runtime Adapters

Use adapter files to avoid duplicating instructions.

`CLAUDE.md`:

```md
Use AGENTS.md as the shared project guidance for this repository.

@AGENTS.md
```

`GEMINI.md`:

```md
Use AGENTS.md as the shared project guidance for this repository.

@AGENTS.md
```

Only add runtime-specific deltas when the runtime genuinely needs them.

Do not import local ignored files from tracked adapter files by default. `CLAUDE.local.md` is Claude-specific local context and should be left for Claude's own local-memory behavior when present. `GEMINI.local.md` is an Ariadne convention for local Gemini notes, not a guaranteed Gemini CLI default; use it only when the user's Gemini setup explicitly loads it or the user asks for a local import.

## Local Files

Use ignored local files for machine-specific or private context.

Common local files:

- `AGENTS.override.md`
- `CLAUDE.local.md`
- `GEMINI.local.md`

When creating any of these, ensure `.gitignore` includes them.

Codex note: `AGENTS.override.md` replaces `AGENTS.md` for Codex at the same directory level. Use it only when the local file intentionally restates the needed project guidance plus local differences, or when a temporary full replacement is desired.

Do not create `AGENTS.local.md` as a generic convention. Codex does not use it by default. For Codex local-only behavior, use `AGENTS.override.md` only when replacement semantics are acceptable, or keep the private details in another ignored file that the user explicitly asks agents to read.

Claude note: `CLAUDE.local.md` is appropriate for local project-specific notes and should be gitignored.

Gemini note: `GEMINI.md` is the default context filename. Gemini CLI can configure context filenames in `settings.json`, but `GEMINI.local.md` is not a guaranteed default; create or import it only when the user's Gemini configuration loads that filename or the user explicitly asks for it.

Copilot note: repository custom instructions are shared repo guidance, usually in `.github/copilot-instructions.md`. Scoped Copilot instructions may live under `.github/instructions/*.instructions.md`, and newer Copilot coding-agent flows may also read `AGENTS.md`. Do not invent a local Copilot instruction filename unless the user's tool configuration documents it.

Local files may include:

- private Ariadne vault paths
- exact scope paths inside a private vault
- maintainer-only commands
- sandbox paths
- personal workflow preferences
- temporary migration notes

Do not copy local-file content into tracked files.

## Proactive Cleanup Signals

When updating an existing workspace, treat these as cleanup signals:

- tracked files include private absolute paths, private vault paths, client details, personal workflow defaults, or sandbox paths
- `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md` copy long vault navigation, destination maps, scope catalogs, or raw context
- runtime adapter files repeat the canonical `AGENTS.md` without real runtime-specific deltas
- local-only files exist but `.gitignore` does not cover them
- a workspace has both tracked and local files but no clear shared/local split
- Ariadne marker blocks are duplicated, malformed, or mixed with copied global discovery blocks
- `AGENTS.md` references missing `WORKSPACE.md`
- `AGENTS.md` and `WORKSPACE.md` both mention the same child repo or folder map
- listed child folders no longer exist, or obvious child Git repos are not mentioned by the selected inventory owner

Safe cleanup:

- compact copied vault context into the small Ariadne vault-link block
- preserve commands, tests, coding conventions, safety rules, and other real workspace guidance
- move child repo/folder inventory from `AGENTS.md` to `WORKSPACE.md` only when `WORKSPACE.md` exists or is being created for a clear parent-workspace shape
- move private/local details to ignored local files when local mode is clear
- normalize adapters to thin imports when they only duplicate `AGENTS.md`

Ask first when content ownership is ambiguous, when `AGENTS.md` and `WORKSPACE.md` have conflicting child maps, when a local-only mode would leave collaborators without needed repo guidance, or when changing `AGENTS.override.md` would replace shared Codex guidance.

## Scenario Coverage

Deterministic signal coverage lives in `test/test_workspace_instructions.js` and `references/workspace-instruction-scenarios.md` relative to the installed skill bundle. In the Ariadne repo checkout, the harness is at `skills/workspace-instructions/test/test_workspace_instructions.js`. The checker reports mechanical signals; `SKILL.md` owns judgment about what to ask or change.

- Git shared mode creates or updates compact public-safe tracked instructions
- Git local-only mode avoids tracked instruction changes and ensures local files are ignored
- shared plus local mode splits portable rules from private paths
- non-Git mode keeps files portable unless local-only intent is explicit
- `WORKSPACE.md` is treated as a supported parent-workspace contract pattern, not a runtime adapter
- missing `WORKSPACE.md` references stop for confirmation instead of creating invented inventory
- child repo/folder inventory signals are mechanical: fixed-depth directories, child Git repos, and exact child-name mentions by file
- linked worktrees resolve the active workspace root
- instruction line counts support compaction decisions without treating length alone as a cleanup command
- private path leakage is detected before tracked files are written
- copied global discovery blocks are not reused as workspace vault-link blocks
- older Ariadne vault-link marker blocks are migrated in place when exactly one well-formed legacy block exists
- foreign marker blocks are preserved
- nested `AGENTS.md` files are kept only when local rules differ from the root
- verbose adapters are normalized when they only duplicate canonical guidance
- duplicate or malformed Ariadne markers stop the update and ask for confirmation
- multiple plausible vault or scope links require a clarifying question before writing a scope-specific block

## Ariadne Vault-Link Block

Use this marker block in tracked or local workspace files:

```md
<!-- ariadne:workspace-vault-link:start -->
## Ariadne Context

This workspace may have related long-term context in a registered Ariadne vault.

When workspace history, decisions, roadmap, research, customers, or workstream state may matter:

1. Use registered vault discovery from the active agent runtime.
2. Select the relevant vault from the registry.
3. Enter through that vault's listed cold-start entry order.
4. Prefer compiled notes, indexes, hubs, decisions, and synthesis notes over raw sources.
5. If multiple vaults or scopes are plausible, show the top matches with short reasons and ask before writing.

Vault updates:

- Use `ariadne:closeout` after meaningful completed work, checkpoints, handoffs, releases, evaluations, incidents, durable decisions, or safe-to-close questions.
- Do not run closeout for every tiny edit or command output.

Do not copy vault content into this workspace file. The vault remains the source of truth.
<!-- ariadne:workspace-vault-link:end -->
```

If the user confirms a specific vault or scope, the block may name it:

```md
<!-- ariadne:workspace-vault-link:start -->
## Ariadne Context

Related Ariadne scope: `<vault name>` / `<scope name or path>`

Use registered vault discovery to enter the vault, then follow the scope's hub and routing files. Before writing into a multi-scope vault, require a current-turn explicit target or ask for confirmation.

Vault updates:

- Use `ariadne:closeout` after meaningful completed work, checkpoints, handoffs, releases, evaluations, incidents, durable decisions, or safe-to-close questions.
- Do not run closeout for every tiny edit or command output.

Do not copy vault content into this workspace file. The vault remains the source of truth.
<!-- ariadne:workspace-vault-link:end -->
```

Use placeholders in public examples. Use private absolute paths only in ignored local files.

## Update Rules

- Preserve useful workspace-specific content outside Ariadne markers, but proactively compact or move content that clearly belongs to the vault or ignored local files.
- Migrate older Ariadne vault-link marker blocks in place to `ariadne:workspace-vault-link`; do not append a second block.
- Replace exactly one existing `ariadne:workspace-vault-link` block in place.
- If no block exists, append it near the workspace overview or agent workflow section.
- Add a vault-link block only when the user asks for Ariadne/vault context, existing files contain Ariadne markers, `~/.ariadne` registry references, `ariadne:*` skill triggers, registered-vault instructions, Vault Updates sections, or a local file with a vault link. A bare `Obsidian` mention is not enough to write a link.
- If multiple Ariadne vault-link marker blocks exist, stop and ask whether to merge or remove duplicates.
- If an existing `CLAUDE.md` or `GEMINI.md` already contains substantial runtime-specific custom guidance, do not collapse it to `@AGENTS.md` unless the user asks for normalization or the duplicated content clearly belongs in canonical `AGENTS.md`.
- Do not add `@CLAUDE.local.md`, `@GEMINI.local.md`, absolute private paths, or home-directory imports to tracked adapter files unless the user explicitly asks and understands the portability tradeoff.
- If a workspace has nested subprojects, add nested `AGENTS.md` files only when local rules differ from the root.

## Bounded Workspace Inspection

Prefer these files:

```text
AGENTS.md
CLAUDE.md
GEMINI.md
WORKSPACE.md
.gitignore
README.md
package.json
pyproject.toml
Cargo.toml
go.mod
pom.xml
build.gradle
Makefile
docs/00 Index.md
docs/index.md
```

Do not enumerate every source file to infer project behavior. Ask when the high-signal files do not answer a question needed for the agent files.
