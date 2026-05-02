# Recursive Scopes

An agentic Obsidian vault is a recursive scope tree.

## Terms

- `root scope` - the vault-level operating scope.
- `scope` - any durable work area at any depth.
- `parent scope` - the nearest scope above the current one.
- `child scope` - a nested scope below the current one.

## Scope Promotion

A folder becomes a scope only when repeated work needs a durable route. Promote conservatively:

1. Create or update the scope hub.
2. Link child scope from parent navigation.
3. Link parent scope from child hub.
4. Add task-routing coverage.
5. Add local `AGENTS.md` only for local rules.
6. Add local templates only for repeated note shapes.
7. Add local Bases only for metadata/status inspection.
8. Add health-check coverage when the scope can decay.

## Inheritance

Parent rules are inherited. Child files should say what is different locally.

Good local `AGENTS.md`:

```markdown
This file inherits parent scope rules from `../../AGENTS.md`.
It only adds rules for this scope.
```

Bad local `AGENTS.md`:

```markdown
Keep notes as plain Markdown.
Use YAML frontmatter.
Do not read the whole vault.
```

Those are parent/root rules and should not be repeated.

## Bases

Root Bases inspect across scopes and include `formula.scope`.
Local Bases must include a folder-scope filter matching their scope path.
