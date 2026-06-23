---
name: obsidian-vault-discovery
description: Register existing Obsidian vaults for machine-level discovery so cold agents can find long-term knowledge from any workspace. Use when checking, adding, updating, repairing, or removing global vault discovery.
---

# Obsidian Vault Discovery

Use this skill when a user already has an Obsidian vault created or maintained with Ariadne and wants future cold agents to find it from outside the vault. Also use it to inspect, update, or repair existing global registry files and marker-managed adapter blocks when Ariadne ships newer discovery rules.

Typical requests:

- "Make this vault discoverable to agents."
- "Register my existing vault globally."
- "Make agents find my vault from anywhere."
- "Check whether this vault is registered."
- "Run Ariadne discovery doctor."
- "Repair Ariadne global discovery."
- "Update Ariadne global discovery rules."
- "Change my primary registered vault."

This skill manages machine-level discovery. It does not create the vault. Use `obsidian-agentic-vault` to bootstrap a new vault.

## Core Model

The vault remains the source of truth. Global discovery only creates a small local signpost:

1. `~/.ariadne/vaults.json` - machine-readable registry.
2. `~/.ariadne/vaults.md` - agent-readable registry.
3. Optional marker-managed blocks in global agent instruction files.

The global blocks point to `~/.ariadne/vaults.md`; they should never duplicate long vault instructions. Updating an existing registration should refresh stale marker-managed blocks in place instead of adding another global block.

## Post-Discovery Routing

This skill gets agents to the right vault. It should not take over feature execution.

After a vault is selected:

- For navigation, routing, registration, or marker repair, continue with this skill.
- For new vault bootstrap, use `obsidian-agentic-vault`.
- For scope creation or promotion, use `obsidian-scope-manager`.

Global discovery remains a signpost.

## Start Workflow

1. Determine the vault path.
2. Confirm the path looks like an agent-readable Obsidian vault by checking for `00 Global Index.md`, `00 Index.md`, another root `00 *Index.md`, `AGENTS.md`, or `Agent/00 Agent Navigation.md`.
3. Determine the vault name and short purpose. Infer from the detected root index when obvious; otherwise ask.
4. Ask which adapters to update, or use the default `codex,claude,gemini` when the user does not care.
5. Offer `--dry-run` when the user wants to preview changes.
6. Run the registration script.
7. Report the registry and adapter files touched.

When updating an already registered vault, treat the workflow as an idempotent refresh/repair. The goal is to bring registry entries and marker-managed global blocks up to the current Ariadne discovery wording while preserving all user-maintained instructions outside Ariadne markers.

## Registration Command

Use the shared registration script from `obsidian-agentic-vault`:

```bash
node /path/to/skills/obsidian-agentic-vault/scripts/register_vault.js \
  --vault "/path/to/vault" \
  --name "Vault Name" \
  --purpose "Short purpose statement." \
  --agents codex,claude,gemini \
  --primary
```

Use `--agents none` to update only the registry files.

Use `--agents all` only when the user explicitly wants all supported adapters.

Use `--dry-run` before writing if the user is cautious or if existing global instruction files are complex.

## Check Discovery

Use `--check` or `--doctor` when the user wants to verify global discovery without changing files:

```bash
node /path/to/skills/obsidian-agentic-vault/scripts/register_vault.js \
  --agents codex,claude,gemini \
  --doctor
```

The doctor checks:

- `~/.ariadne/vaults.json` exists and parses.
- `~/.ariadne/vaults.md` matches the JSON registry.
- registered vault paths exist.
- registered entrypoints exist in each vault.
- detected root entrypoints are registered.
- selected global adapter files have Ariadne marker blocks.
- adapter blocks point to `~/.ariadne/vaults.md` and include current discovery rules for listed cold-start entry order, action prompts, multiple vault matches, and target-scope confirmation.
- adapter blocks remain small signposts.

If doctor reports issues, re-run registration for the affected vault to repair registry and adapter blocks.

When doctor reports issues during a broader task, do not only say that discovery failed. Tell the user:

1. which registry, entrypoint, or adapter check failed,
2. why cold agents may be affected,
3. the repair command or `obsidian-vault-discovery` action to use,
4. whether the repair touches global agent files and therefore needs approval.

## Multiple-Match Policy

If discovery produces multiple plausible vault matches for a request, do not guess. Show the top matches with short reasons, then ask which vault to use before creating, updating, or filing artifacts.

## Target-Scope Confirmation Policy

After a vault is selected, write actions still need a current-turn explicit target in multi-scope vaults. A target is explicit only when the current prompt names the target scope, domain, customer, project, or workstream, or the user confirms one after the agent asks. Search hits, a single likely match, existing matching cards, prior conversation, current working directory, and active skills are not confirmation.

## Remove Discovery

Use `--remove` when the user wants to unregister a vault:

```bash
node /path/to/skills/obsidian-agentic-vault/scripts/register_vault.js \
  --vault "/path/to/vault" \
  --agents codex,claude,gemini \
  --remove
```

When the removed vault is the last registered vault, selected adapter blocks are removed from global agent files. Existing user instructions outside Ariadne marker blocks are preserved.

## Supported Adapters

- `codex` - `~/.codex/AGENTS.md`
- `claude` - `~/.claude/CLAUDE.md`
- `gemini` - `~/.gemini/GEMINI.md`
- `copilot` - `~/.copilot/copilot-instructions.md`
- `opencode` - `~/.config/opencode/AGENTS.md`
- `roo` - `~/.roo/rules/ariadne-vault-discovery.md`
- `cline` - `~/Documents/Cline/Rules/ariadne-vault-discovery.md`

## Safety Rules

- Registration is opt-in. Do not silently write global agent files.
- Preserve existing global instructions.
- Update only between Ariadne markers:
  - `<!-- ariadne:vault-discovery:start -->`
  - `<!-- ariadne:vault-discovery:end -->`
- Re-running registration for the same vault must update, not duplicate.
- Use this workflow for stale global discovery blocks as well as first registration.
- Keep global blocks tiny. They point to the registry; the vault handles navigation.

## Check Existing Discovery

To inspect current state, read:

1. `~/.ariadne/vaults.md`
2. `~/.ariadne/vaults.json`
3. The selected adapter files, if needed.

If the registry exists but adapter blocks are missing, offer to repair adapters.

If adapter blocks exist but the registry path is missing, offer to recreate the registry from the vault path.

## Related Skills

- Use `obsidian-agentic-vault` to create a new vault.
- Use `obsidian-vault-maintainer` to check vault health after registration.
- Use `obsidian-scope-manager` when the user wants to make a new domain inside an existing vault discoverable through vault navigation.
