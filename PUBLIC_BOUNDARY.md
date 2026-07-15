# Public Boundary

Ariadne is an open-source skill package for Markdown knowledge vaults. Obsidian is an optional, recommended frontend and compatibility target rather than a runtime requirement.

## In Scope

- Markdown knowledge-vault bootstrap templates with Obsidian-compatible links and optional view files
- recursive scope structure, explicit target confirmation, and bounded write sets
- vault navigation, hubs, routing matrices, and local `AGENTS.md` inheritance
- Bases, Kanban boards, and Dataview dashboards as optional Obsidian view layers
- general knowledge capture and closeout as vault-specific durable-memory workflows
- versioned research boundaries, ingest handoffs, synthesis dispositions, provenance, promotion, and audit-first stewardship
- maintenance and deterministic structural, scope, and schema-gated research validation
- marker-managed vault discovery adapters that point to user-owned local registries
- marker-managed workspace instruction links that connect workspaces to registered vault context

## Out Of Scope

- generic long-running agent coordination
- runtime-adaptive worker orchestration
- durable generic control records
- model-routing policy, parallel execution policy, or cross-runtime coordination loops
- private vault content, screenshots, client details, secrets, tokens, or production data
- maintainer-local absolute paths or personal workflow defaults presented as universal behavior

Generic runtime-adaptive coordination belongs in Kybernetes. Ariadne may provide vault-aware behavior only when it is specific to Markdown knowledge structure, scope selection, artifact placement, validation, maintenance, or an explicitly optional Obsidian-compatible view layer.

## Public Documentation Rules

- Use placeholders such as `/path/to/vault`; never commit maintainer-local paths.
- Keep examples generic and minimal.
- Do not include private vault screenshots or graph exports.
- Do not ask users to paste secrets, production logs, or private vault dumps into issues.
- Keep global agent discovery blocks as signposts to user-owned registry files.
- Keep workspace instruction links as signposts to registered vault context; do not copy private vault contents into public repositories.

## Branch Protection Plan

Configure the repository ruleset for `main` to require:

- pull request review from CODEOWNERS
- passing `validate-repo`
- passing `validate-skills`
- passing Scorecard or explicit maintainer review of Scorecard findings
- linear history or squash merge, according to maintainer preference
- no force pushes or branch deletion
