---
name: obsidian-scope-manager
description: Use when creating, promoting, importing, nesting, or reorganizing scopes inside an existing Obsidian vault with inherited parent and child scope rules.
---

# Obsidian Scope Manager

Use this skill when a vault already exists and the user wants a new durable scope or child scope.

## Start

1. Read root `AGENTS.md` or `CLAUDE.md`.
2. Read root `00 Index.md`.
3. Read `Agent/00 Agent Navigation.md` and `Agent/Task Routing Matrix.md` if present.
4. Read the parent scope hub and parent `AGENTS.md` if the new scope is nested.

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
11. Add the new scope's folder path to every root `Bases/*.base` scope formula that contains `file.inFolder` — otherwise notes in this scope show as "Global" in all root views.
12. Run validation — `routing-matrix-warnings: 0` and `base-scope-formula-warnings: 0` confirm the scope is fully wired.

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
- Do not copy global boilerplate into local files.
- Use path-qualified wikilinks across scope boundaries.
- Do not create child scopes just because they might be useful.

## Related Skills

- Use `obsidian-agentic-vault` for new vault bootstrap.
- Use `obsidian-navigation-architect` for route and hub design.
- Use `obsidian-bases` for Base syntax.
- Use `obsidian-vault-validator` for deterministic checks.
