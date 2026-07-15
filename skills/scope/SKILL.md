---
name: ariadne:scope
description: Use when creating, promoting, importing, nesting, or reorganizing scopes inside an existing Markdown knowledge vault with inherited parent and child scope rules.
---

# Ariadne Scope

Use this skill when a vault already exists and the user wants a new durable scope or child scope.

## Start

1. Read root instructions and every applicable ancestor scope instruction through the intended parent.
2. Read root/local indexes, agent navigation, task routing, and the parent hub.
3. In a multi-scope vault, require the new scope name and parent to be named or confirmed in the current turn.
4. State an explicit `allowed_write_set` before creation. Include the new subtree and each parent/root hub, routing matrix, or Base formula individually.
5. If the vault is Git-backed, inspect status before writing. Preserve unrelated modified and untracked files, never use broad staging, and stage only paths in the declared write set when the user explicitly authorizes a commit.

## Minimal Questions

Ask only what is missing:

1. What is the scope name?
2. Where should it live?
3. What recurring job does it serve?
4. Does it need intake infrastructure — `Raw/Sources/`, `Inbox/`, `Processing Queue/`, local `Ingest Compile Workflow`?
5. Does it need local rules, templates, Bases, or only a hub?

## Create Or Promote A Scope

1. Create the scope folder.
2. Create the scope hub.
3. Add a row to `Agent/Task Routing Matrix.md` — do this before nav links so the routing chain is never broken even momentarily.
4. Link child scope from parent hub/navigation.
5. Link parent scope from child hub.
6. Add local `AGENTS.md` only when local rules differ.
7. Add intake infrastructure when the scope will receive raw material — create `Raw/Sources/`, `Raw/Sources/00 Source Index.md`, `Inbox/`, `Inbox/00 Inbox Index.md`, `Processing Queue/`, `Processing Queue/00 Processing Queue Index.md`, and a local `Agent/Ingest Compile Workflow.md`. Add a routing row for "Shared link or source material" pointing to the new workflow. Skip these if the scope will never ingest raw sources.
8. Add local Bases only when metadata/status inspection helps.
9. Add local templates only for repeated note shapes.
10. Add health-check coverage if the scope can decay.
11. Add the new scope's folder path to every root `Bases/*.base` scope formula that contains `file.inFolder`. Insert the most-specific child branch before its parent branch; first-match formulas otherwise classify the child as its parent. Preserve unrelated formula branches and user changes.
12. Run scoped validation first, then whole-vault validation. The scoped run must report `routing-matrix-warnings: 0` and `base-scope-formula-warnings: 0` for the new subtree. The whole-vault run confirms no cross-scope regression; report unrelated pre-existing whole-vault warnings separately rather than treating them as child-scope failures.
13. If the parent vault is not globally registered, or its global discovery block is stale, offer `ariadne:global-discovery` for the parent vault. Scope creation should not write global files or add scope-specific global discovery rules.
14. If an external code repository or folder should point to this scope, offer `ariadne:workspace-instructions`. Scope-specific workspace links require a current-turn explicit target or user confirmation and belong in workspace files, not global discovery.

## Import Existing Vault As Scope

1. Confirm target scope path.
2. Copy source vault into that scope path.
3. Preserve local instructions as local deltas.
4. Rewrite cross-scope links only when needed for validation or ambiguity.
5. Scope local Bases to the imported path.
6. Add parent and child navigation links.
7. Validate.

## Rules

- Parent scope policy is inherited.
- Child scopes add deltas only.
- When a child needs local instructions, state explicit inheritance from both the nearest parent scope and the vault root; a wikilink alone is not a complete inheritance declaration.
- Preserve unrelated modified and untracked files throughout creation, validation, and any authorized staging.
- Do not copy global boilerplate into local files.
- Use path-qualified wikilinks across scope boundaries.
- Do not create child scopes just because they might be useful.
- Wire new scopes into vault-local navigation and routing only. Global discovery registers vaults, not individual scopes.
- Workspace instruction files may link to a confirmed scope, but they must not replace vault-local scope navigation.
- If global discovery produces multiple plausible parent vault matches, show the top matches with short reasons and ask before creating, updating, or filing artifacts.

## Related Skills

- Use `ariadne:vault` for new vault bootstrap.
- Use `ariadne:workspace-instructions` when an external workspace needs instruction files or a link to this scope.
- Use `ariadne:navigation` for route and hub design.
- Use `ariadne:research-pipeline` when an existing scope needs a full research pipeline after creation.
- Use `ariadne:research-ingest` for the first research source after the scope exists.
- Use `obsidian-bases` for Base syntax.
- Use `ariadne:validator` for deterministic checks.
