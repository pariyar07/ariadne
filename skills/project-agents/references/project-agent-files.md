# Project Agent File Patterns

Use these patterns when `ariadne:project-agents` creates or updates project-level agent instruction files.

## Public-Safe Canonical File

Use `AGENTS.md` as the canonical project file when the project should share instructions across agent runtimes.

Good public-safe content:

- project purpose and boundaries
- repo or folder layout
- common commands for setup, test, lint, build, and validation
- coding conventions
- review and safety expectations
- links to public docs inside the project
- a small Ariadne vault-link block that points agents to registered vault discovery without copying private content

Avoid in tracked files:

- maintainer-local absolute paths
- private vault paths
- client secrets or production data
- personal preferences not meant for collaborators
- long copied vault instructions
- generated transcripts or raw private context

## Thin Runtime Adapters

Use adapter files to avoid duplicating instructions.

`CLAUDE.md`:

```md
@AGENTS.md
@CLAUDE.local.md
```

`GEMINI.md`:

```md
@AGENTS.md
@GEMINI.local.md
```

Only add runtime-specific deltas when the runtime genuinely needs them.

## Local Files

Use ignored local files for machine-specific or private context.

Common local files:

- `AGENTS.override.md`
- `CLAUDE.local.md`
- `GEMINI.local.md`

When creating any of these, ensure `.gitignore` includes them.

Local files may include:

- private Ariadne vault paths
- exact scope paths inside a private vault
- maintainer-only commands
- sandbox paths
- personal workflow preferences
- temporary migration notes

Do not copy local-file content into tracked files.

## Ariadne Vault-Link Block

Use this marker block in tracked or local project files:

```md
<!-- ariadne:project-vault-link:start -->
## Ariadne Context

This project may have related long-term context in a registered Ariadne vault.

When project history, decisions, roadmap, research, customers, or workstream state may matter:

1. Use registered vault discovery from the active agent runtime.
2. Select the relevant vault from the registry.
3. Enter through that vault's listed cold-start entry order.
4. Prefer compiled notes, indexes, hubs, decisions, and synthesis notes over raw sources.
5. If multiple vaults or scopes are plausible, show the top matches with short reasons and ask before writing.

Do not copy vault content into this project file. The vault remains the source of truth.
<!-- ariadne:project-vault-link:end -->
```

If the user confirms a specific vault or scope, the block may name it:

```md
<!-- ariadne:project-vault-link:start -->
## Ariadne Context

Related Ariadne scope: `<vault name>` / `<scope name or path>`

Use registered vault discovery to enter the vault, then follow the scope's hub and routing files. Before writing into a multi-scope vault, require a current-turn explicit target or ask for confirmation.

Do not copy vault content into this project file. The vault remains the source of truth.
<!-- ariadne:project-vault-link:end -->
```

Use placeholders in public examples. Use private absolute paths only in ignored local files.

## Update Rules

- Preserve all content outside Ariadne markers.
- Replace exactly one existing `ariadne:project-vault-link` block in place.
- If no block exists, append it near the project overview or agent workflow section.
- If multiple blocks exist, stop and ask whether to merge or remove duplicates.
- If an existing `CLAUDE.md` or `GEMINI.md` already contains substantial custom guidance, do not collapse it to `@AGENTS.md` unless the user asks for normalization.
- If a project has nested subprojects, add nested `AGENTS.md` files only when local rules differ from the root.

## Bounded Project Inspection

Prefer these files:

```text
AGENTS.md
CLAUDE.md
GEMINI.md
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
