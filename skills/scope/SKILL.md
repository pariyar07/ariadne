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
4. Run the validator-owned `sync_scope_topology.js --check` in zero-write mode. Use [scope-operation-request.md](references/scope-operation-request.md) for the exact schema-v1 request and CLI.
5. If the vault is Git-backed, inspect status before writing. Preserve unrelated modified and untracked files, never use broad staging, and stage only paths in the declared write set when the user explicitly authorizes a commit.

## Minimal Questions

Ask only what is missing:

1. What is the scope name?
2. Where should it live?
3. What recurring job does it serve?
4. Does it need intake infrastructure — `Raw/Sources/`, `Inbox/`, `Processing Queue/`, local `Ingest Compile Workflow`?
5. Does it need local rules, templates, Bases, or only a hub?

## Promotion Threshold

Promote only when repeated work needs a durable route, local lifecycle, or local operating rules. A useful folder, a one-off project, or a possible future route stays a normal folder.

## Create, Adopt, Move, Or Change Status

1. Confirm the target scope and requested lifecycle action in the current turn. Audit/check is always zero-write; create, adopt, move, set-status, and repair require confirmation.
2. Build the exact request with `allowed_write_paths: []`. Run it to obtain the refusal/disclosure, then show every proposed `content_write_paths` entry. Generated-only checkpoints do not waive confirmation.
3. After confirmation, copy exactly those paths into `allowed_write_paths` and invoke `sync_scope_topology.js --write --request`. Never directly edit descriptors, generated files, generated blocks, registry/map artifacts, physical moves, parent relationships, or redirects.
4. For create, prepare the destination directory and user-owned content, then let the engine create the descriptor and generated wiring. Non-registry root Base formulas are report-only: the synchronizer detects missing or misordered scope branches but does not authorize or rewrite these user-authored formulas. After the engine write, update each reported Base outside generated blocks only when it is named in an explicit allowed_write_set. Insert the most-specific child branch before its parent branch; first-match formulas otherwise classify the child as its parent.
5. For adopt, choose `ancestor-chain` (target plus required ancestors) or `whole-vault` explicitly. Do not adopt candidates marked `ariadne_scope_adoption: dismissed`.
6. For move/reparent, provide the exact current `source_path` and new `destination_path`. The engine performs the physical move, reparents the subtree, records former paths, and writes the redirect; never emulate those steps manually.
7. For status, use only supported transitions: active to archived, archived to active or retired, and retired to archived. A retired scope cannot have active children. A replacement is valid only when retiring.
8. If interrupted, report the operation ID and use `--resume` or `--abort`; never manipulate engine control files. Reconcile any abort `reconciliation_paths` before another operation.
9. Run scoped validation first, then whole-vault validation. The scoped run must report `routing-matrix-warnings: 0` and `base-scope-formula-warnings: 0` for the subtree. Report unrelated pre-existing whole-vault warnings separately.
10. Run a second check with `sync_scope_topology.js --check`. It must disclose no changes; this is the idempotency checkpoint.
11. If the parent vault is not globally registered, or its global discovery block is stale, offer `ariadne:global-discovery` for the parent vault. Scope creation should not write global files or add scope-specific global discovery rules.
12. If an external code repository or folder should point to this scope, offer `ariadne:workspace-instructions`. Scope-specific workspace links require a current-turn explicit target or user confirmation and belong in workspace files, not global discovery.

## Import Existing Vault As Scope

1. Confirm target scope path.
2. Copy source vault into that scope path.
3. Preserve local instructions as local deltas.
4. Rewrite cross-scope links only when needed for validation or ambiguity.
5. Scope local Bases to the imported path.
6. Route adoption and generated parent/child wiring through the synchronizer workflow above.
7. Validate twice and require the second check to be empty.

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
