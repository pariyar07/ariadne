---
name: obsidian-vault-validator
description: "Validate the structure of an agent-maintained Obsidian vault with deterministic CLI checks for YAML/frontmatter, broken wikilinks, Markdown orphans, and unlinked Base files."
metadata:
  required_tools:
    - ruby
  primary_script: scripts/validate_vault.rb
  checks:
    - yaml-ok
    - broken-wikilinks
    - true-orphans-md
    - unlinked-base-files
    - bloat-warnings
---

# Obsidian Vault Validator

Use this skill when the user asks whether an Obsidian vault is structurally valid, navigable, connected, or ready for ongoing agent use.

## Tool

Run the bundled validator from the vault root:

```bash
ruby /path/to/skills/obsidian-vault-validator/scripts/validate_vault.rb
```

Or pass an explicit vault path:

```bash
ruby /path/to/skills/obsidian-vault-validator/scripts/validate_vault.rb /path/to/vault
```

## Checks

The validator reports:

- `yaml-ok` when Markdown frontmatter and `.base` YAML parse cleanly
- `broken-wikilinks: N`
- `true-orphans-md: N`
- `unlinked-base-files: N`
- `bloat-warnings: N` for non-fatal navigability drift cues

It resolves wikilinks to both Markdown notes and `.base` files.

## Interpretation

A healthy vault should normally report:

```text
yaml-ok
broken-wikilinks: 0
true-orphans-md: 0
unlinked-base-files: 0
bloat-warnings: 0
```

Some vaults may intentionally keep raw captures or temporary files lightly linked. If the validator reports issues, inspect whether they are intentional before adding links.

Bloat warnings are not fatal. They are cues that an agent should call out possible navigation drift and suggest a maintenance pass.

The validator also warns when a large specialized folder may need a local `AGENTS.md`. Treat that as a prompt to inspect the folder's workflow, not as an automatic requirement.

## Repair

- Use `obsidian-navigation-architect` for missing hubs, Base links, and routing issues.
- Use `obsidian-vault-maintainer` for broader health-check repair.
- Use `obsidian-ingest-compile` when orphaned raw material needs compilation.
