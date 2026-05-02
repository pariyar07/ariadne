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
4. Does it need local rules, templates, Bases, queues, or only a hub?

## Create Or Promote A Scope

1. Create the scope folder.
2. Create the scope hub.
3. Link child scope from parent hub/navigation.
4. Link parent scope from child hub.
5. Add task-routing coverage.
6. Add local `AGENTS.md` only when local rules differ.
7. Add local Bases only when metadata/status inspection helps.
8. Add local templates only for repeated note shapes.
9. Add health-check coverage if the scope can decay.
10. Run validation.

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
