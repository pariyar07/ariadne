# Global Discovery

Vaults created or maintained with Ariadne are easy for agents to navigate once the agent knows where the vault is. Global discovery registers that entry point on the user's local machine so future cold agents can find the vault without scanning chat history, unrelated folders, or the whole filesystem.

Global discovery is optional. It is useful when a user wants agents launched from any folder to treat a Markdown knowledge vault as a long-term knowledge source. Obsidian may be used as its frontend, but discovery only requires a filesystem path and agent-readable entrypoints. This guide is also the repair/update path for existing global marker blocks when Ariadne ships newer discovery rules.

Global discovery is not the same as workspace-level instruction files. Use `ariadne:workspace-instructions` when a repository or ordinary folder needs `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, or a small Ariadne vault-link block. Workspace files may point toward registered vault context, but global discovery continues to register vaults rather than individual project scopes.

## What Registration Creates

Registration writes an Ariadne-managed registry under the user's home directory:

```text
~/.ariadne/vaults.json
~/.ariadne/vaults.md
```

On Windows, `~` means the user's profile directory.

`vaults.json` is machine-readable. `vaults.md` is agent-readable.

Registration can also add or refresh a tiny marker-managed discovery block in supported agent global instruction files. The block points to `~/.ariadne/vaults.md`; it does not copy the whole vault context.

## Supported Adapters

The registration script supports these adapters:

| Adapter | File |
| --- | --- |
| `codex` | `~/.codex/AGENTS.md` |
| `claude` | `~/.claude/CLAUDE.md` |
| `gemini` | `~/.gemini/GEMINI.md` |
| `copilot` | `~/.copilot/copilot-instructions.md` |
| `opencode` | `~/.config/opencode/AGENTS.md` |
| `roo` | `~/.roo/rules/ariadne-vault-discovery.md` |
| `cline` | `~/Documents/Cline/Rules/ariadne-vault-discovery.md` |

The default adapter set is `codex,claude,gemini`.

## Register A Vault

From this repository or an installed skill copy, run:

```bash
node skills/vault/scripts/register_vault.js \
  --vault "/path/to/vault" \
  --name "My Knowledge Vault" \
  --purpose "Long-term project and research knowledge." \
  --agents codex,claude,gemini \
  --primary
```

Use `--dry-run` to preview files before writing:

```bash
node skills/vault/scripts/register_vault.js \
  --vault "/path/to/vault" \
  --name "My Knowledge Vault" \
  --dry-run
```

Re-running registration for an existing vault is the normal way to update stale registry entries or refresh marker-managed global blocks in place.

## Unregister A Vault

To remove a vault from the registry:

```bash
node skills/vault/scripts/register_vault.js \
  --vault "/path/to/vault" \
  --agents codex,claude,gemini \
  --remove
```

If no vaults remain in the registry, the selected adapter blocks are removed from global agent instruction files. Existing user instructions outside Ariadne marker blocks are preserved.

## Safety Rules

- Registration should be offered after vault bootstrap, not forced.
- The script is idempotent: registering the same vault again updates the registry entry.
- Existing marker-managed blocks can be refreshed when Ariadne's global discovery wording changes.
- Agent files are updated between marker comments only:

```md
<!-- ariadne:vault-discovery:start -->
...
<!-- ariadne:vault-discovery:end -->
```

- Existing user instructions outside the marker block are preserved.
- The global block should stay small. It should point to the registry, not duplicate vault navigation rules.
- Workspace instruction files should use their own `ariadne:workspace-vault-link` marker block instead of copying the global discovery block.
- Unregistering a vault removes only the matching registry entry and Ariadne marker blocks when no registered vaults remain.

## Cold-Start Behavior

When an agent sees the global discovery block, it should:

1. Read `~/.ariadne/vaults.md`.
2. Pick the relevant vault from the user's request.
3. Enter through that vault's listed cold-start entry order in strict sequence. Complete each entrypoint read before beginning the next; do not parallelize the required reads.
4. Search progressively with filenames and `rg`.
5. Prefer compiled notes, hubs, decisions, indexes, and synthesis notes over raw sources.

This applies to vague questions, terse keyword prompts, and empty-workspace ambiguity. In those cases, agents should check the registry before creating a new artifact from scratch.

If multiple registered vaults plausibly match the request, the agent should show the top matches with short reasons and ask which vault to use before creating, updating, or filing artifacts.

After a multi-scope vault is selected, write actions still need a current-turn explicit target. A target is explicit only when the current prompt names the target scope, domain, customer, project, or workstream, or the user confirms one after the agent asks. Search hits, a single likely match, existing matching cards, prior conversation, current working directory, and active skills are not confirmation.

This keeps ambiguous cold-start requests fast and token-light while preserving the vault as the source of truth.

## Discovery Doctor

Use doctor mode to verify global discovery without writing files:

```bash
node skills/vault/scripts/register_vault.js \
  --agents codex,claude,gemini \
  --doctor
```

The doctor checks that the registry files exist, registry Markdown matches registry JSON, registered vault paths and entrypoints exist, and selected adapter files still contain a valid, current, single, and appropriately small Ariadne marker block. Because the block is loaded into every agent session, the doctor flags an oversized block or a duplicate block. See `skills/global-discovery/references/discovery-rules.md` for the full audit rubric.

If doctor reports stale entrypoints or missing marker blocks, re-run registration for the vault to repair the registry and selected adapters.

Agents should treat a doctor failure as actionable navigation drift. Report the failing registry, entrypoint, or adapter check, explain how it affects cold-start behavior, and offer to repair it with `ariadne:global-discovery`. Repairs that modify global agent files should be explicit, because those files may contain user-maintained instructions outside Ariadne marker blocks.
