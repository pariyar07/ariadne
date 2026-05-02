# Vault Validator Guide

The validator is a deterministic health check for an Obsidian vault. Use the shell wrapper when possible and pass the vault root path:

```bash
/path/to/skills/obsidian-vault-validator/scripts/validate_vault.sh "/path/to/vault"
```

Or run it from inside the vault root without an argument:

```bash
/path/to/skills/obsidian-vault-validator/scripts/validate_vault.sh
```

The wrapper delegates to the Node.js implementation. You can also run the JavaScript file directly:

```bash
node /path/to/skills/obsidian-vault-validator/scripts/validate_vault.js "/path/to/vault"
```

## Why Node

The validator is Node.js because the skill installation workflow already uses `npx`, so users are likely to have Node available. The implementation uses only built-in Node modules and does not require `npm install`.

The shell wrapper provides a stable entry point plus a clearer missing-Node error.

## What It Checks

- Markdown frontmatter parses as YAML.
- Wikilinks resolve to Markdown notes or Base files.
- Root and local Base files are linked from the relevant Bases index.
- Local Bases stay scoped to their recursive scope path.
- Local `AGENTS.md` files inherit parent policy instead of repeating global rules.
- Ambiguous cross-scope wikilinks are reported.
- Parent and child scope hubs link to each other.

## Expected Output

Healthy vaults should have zero fatal failures. New recursive-scope hygiene checks may report warnings first so existing vaults can be upgraded gradually.
