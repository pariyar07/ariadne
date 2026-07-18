# Registered Knowledge Vaults

These are local Markdown knowledge vaults registered as long-term sources for AI-agent navigation. They may use Obsidian or another Markdown-compatible frontend.

## {{vault_name}}

Path: {{vault_path}}
Purpose: {{purpose}}

Cold-start entry order:

Complete each entrypoint read before starting the next; do not parallelize these reads.

1. Read the detected root index, for example `00 Index.md` or `00 Global Index.md`.
2. Read `AGENTS.md`.
3. Read `Agent/00 Agent Navigation.md`.
4. Read `Agent/Task Routing Matrix.md` when routing by task.
5. Search this vault with `rg` before searching chat history or unrelated folders.
6. Prefer compiled notes, indexes, hubs, decisions, and synthesis notes over raw sources.
