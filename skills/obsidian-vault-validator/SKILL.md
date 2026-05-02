---
name: obsidian-vault-validator
description: "Validate the structure of an agent-maintained Obsidian vault with deterministic CLI checks for YAML/frontmatter, broken wikilinks, Markdown orphans, and unlinked Base files."
metadata:
  required_tools:
    - node
  primary_script: scripts/validate_vault.sh
  checks:
    - yaml-ok
    - broken-wikilinks
    - true-orphans-md
    - unlinked-base-files
    - bloat-warnings
    - recursive-scope-warnings
---

# Obsidian Vault Validator

Use this skill when the user asks whether an Obsidian vault is structurally valid, navigable, connected, or ready for ongoing agent use.

## Tool

Run the bundled validator from the vault root:

```bash
/path/to/skills/obsidian-vault-validator/scripts/validate_vault.sh
```

Or pass an explicit vault path:

```bash
/path/to/skills/obsidian-vault-validator/scripts/validate_vault.sh /path/to/vault
```

The shell wrapper checks for Node.js and delegates to `validate_vault.js`.

## Checks

The validator reports:

- `yaml-ok` when Markdown frontmatter and `.base` YAML parse cleanly
- `broken-wikilinks: N`
- `true-orphans-md: N`
- `unlinked-base-files: N`
- `bloat-warnings: N` for non-fatal navigability drift cues
- `local-base-scope-warnings: N` for non-root `Bases/*.base` files missing a `file.inFolder("<scope_path>")` filter
- `local-agents-inheritance-warnings: N` for local `AGENTS.md` files that omit parent/root inheritance or repeat global policy text
- `ambiguous-wikilink-warnings: N` for basename-only wikilinks that resolve to multiple Markdown/Base targets
- `scope-navigation-warnings: N` for promoted child scope hubs that are not linked bidirectionally with their parent hub

It discovers `.base` files recursively, excluding `.obsidian` paths, and resolves wikilinks to both Markdown notes and `.base` files.

Every `**/Bases/*.base` file must have a sibling `00 Bases Index.md` that links the Base by relative Markdown link or wikilink. The legacy root `Bases/00 Bases Index.md` check is still enforced, and the same rule now applies to nested scope Base folders.

## Interpretation

A healthy vault should normally report:

```text
yaml-ok
broken-wikilinks: 0
true-orphans-md: 0
unlinked-base-files: 0
bloat-warnings: 0
local-base-scope-warnings: 0
local-agents-inheritance-warnings: 0
ambiguous-wikilink-warnings: 0
scope-navigation-warnings: 0
```

Some vaults may intentionally keep raw captures or temporary files lightly linked. If the validator reports issues, inspect whether they are intentional before adding links.

Bloat warnings are not fatal. They are cues that an agent should call out possible navigation drift and suggest a maintenance pass.

Recursive-scope warnings are non-fatal. Treat them as prompts to tighten local Base filters, reduce duplicated local policy text, disambiguate basename wikilinks, or repair parent/child hub navigation.

The validator also warns when a large specialized folder may need a local `AGENTS.md`. Treat that as a prompt to inspect the folder's workflow, not as an automatic requirement.

## Repair

- Use `obsidian-navigation-architect` for missing hubs, Base links, and routing issues.
- Use `obsidian-vault-maintainer` for broader health-check repair.
- Use `obsidian-ingest-compile` when orphaned raw material needs compilation.
