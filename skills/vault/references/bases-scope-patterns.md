# Base Scope Patterns

Use scoped Bases to keep the view layer aligned with recursive scope boundaries.

## Global Base Pattern

Root Bases inspect across scopes and include a `Scope` column.

Order nested paths from most specific to least specific. `if()` formulas return the first matching branch, so a parent branch placed first absorbs all descendants.

```yaml
filters: type == "entity"
formulas:
  scope: 'if(file.inFolder("Domains/Alpha/Research"), "Alpha Research", if(file.inFolder("Domains/Alpha"), "Alpha", if(file.inFolder("Domains/Beta"), "Beta", "Global")))'
properties:
  formula.scope:
    displayName: Scope
views:
  - type: table
    name: Master Entities
    order:
      - file.name
      - formula.scope
      - status
      - created
      - file.folder
```

## Local Base Pattern

Local Bases must filter to their scope path and include a `Scope` column.

```yaml
filters:
  and:
    - 'file.inFolder("{{scope_path}}")'
    - 'type == "entity"'
formulas:
  scope: '"{{scope_name}}"'
properties:
  formula.scope:
    displayName: Scope
views:
  - type: table
    name: "{{scope_name}} Entities"
    order:
      - file.name
      - formula.scope
      - status
      - created
      - file.folder
```

## Import Warning

Copied local Bases must not keep source-vault-relative filters after import. For example, replace `file.inFolder("Inbox")` with `file.inFolder("{{scope_path}}/Inbox")` when importing that vault into a child scope.
