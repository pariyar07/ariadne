# Global Discovery

Vaults created or maintained with Ariadne are easy for agents to navigate once the agent knows where the vault is. Global discovery registers that entry point on the user's local machine so future cold agents can find the vault without scanning chat history, unrelated folders, or the whole filesystem.

Global discovery is optional. It is useful when a user wants agents launched from any folder to treat an Obsidian vault as a long-term knowledge source. It is also the repair/update path for existing global marker blocks when Ariadne ships newer discovery rules.

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
node skills/obsidian-agentic-vault/scripts/register_vault.js \
  --vault "/path/to/vault" \
  --name "My Knowledge Vault" \
  --purpose "Long-term project and research knowledge." \
  --agents codex,claude,gemini \
  --primary
```

Use `--dry-run` to preview files before writing:

```bash
node skills/obsidian-agentic-vault/scripts/register_vault.js \
  --vault "/path/to/vault" \
  --name "My Knowledge Vault" \
  --dry-run
```

Re-running registration for an existing vault is the normal way to update stale registry entries or refresh marker-managed global blocks in place.

## Unregister A Vault

To remove a vault from the registry:

```bash
node skills/obsidian-agentic-vault/scripts/register_vault.js \
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
- Unregistering a vault removes only the matching registry entry and Ariadne marker blocks when no registered vaults remain.

## Cold-Start Behavior

When an agent sees the global discovery block, it should:

1. Read `~/.ariadne/vaults.md`.
2. Pick the relevant vault from the user's request.
3. Enter through that vault's listed cold-start entry order.
4. Search progressively with filenames and `rg`.
5. Prefer compiled notes, hubs, decisions, indexes, and synthesis notes over raw sources.

This applies to vague questions, terse keyword prompts, and empty-workspace ambiguity. In those cases, agents should check the registry before creating a new artifact from scratch.

If multiple registered vaults plausibly match the request, the agent should show the top matches with short reasons and ask which vault to use before creating, updating, or filing artifacts.

After a multi-scope vault is selected, write actions still need a current-turn explicit target. A target is explicit only when the current prompt names the target scope, domain, customer, project, or workstream, or the user confirms one after the agent asks. Search hits, a single likely match, existing matching cards, prior conversation, current working directory, and active skills are not confirmation.

This keeps ambiguous cold-start requests fast and token-light while preserving the vault as the source of truth.

## Write Guard

Agent instructions reduce mistakes, but ambiguous write safety needs a deterministic layer when the runtime supports hooks.

Use `skills/obsidian-agentic-vault/scripts/guard_vault_write.js` as both:

- a `UserPromptSubmit` command hook, to record the current prompt for the session
- a `PreToolUse` command hook on `Write|Edit|MultiEdit`, to block registered-vault or Ariadne staging Markdown writes until the current prompt names or confirms the target scope

Example direct hook shape:

```json
{
  "UserPromptSubmit": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "node /path/to/ariadne/skills/obsidian-agentic-vault/scripts/guard_vault_write.js",
          "timeout": 10
        }
      ]
    }
  ],
  "PreToolUse": [
    {
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [
        {
          "type": "command",
          "command": "node /path/to/ariadne/skills/obsidian-agentic-vault/scripts/guard_vault_write.js",
          "timeout": 10
        }
      ]
    }
  ]
}
```

Set `ARIADNE_PROTECTED_WRITE_ROOTS` to a path-delimited list of extra roots when testing against staging vaults outside `~/.ariadne/vaults.json`. The guard also recognizes paths containing `ariadne-kanban-staging`.

## Discovery Doctor

Use doctor mode to verify global discovery without writing files:

```bash
node skills/obsidian-agentic-vault/scripts/register_vault.js \
  --agents codex,claude,gemini \
  --doctor
```

The doctor checks that the registry files exist, registry Markdown matches registry JSON, registered vault paths and entrypoints exist, and selected adapter files still contain valid Ariadne marker blocks.

If doctor reports stale entrypoints or missing marker blocks, re-run registration for the vault to repair the registry and selected adapters.

Agents should treat a doctor failure as actionable navigation drift. Report the failing registry, entrypoint, or adapter check, explain how it affects cold-start behavior, and offer to repair it with `obsidian-vault-discovery`. Repairs that modify global agent files should be explicit, because those files may contain user-maintained instructions outside Ariadne marker blocks.
