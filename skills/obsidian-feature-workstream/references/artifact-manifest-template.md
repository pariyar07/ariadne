# Artifact Manifest Template

Use this for significant work before implementation starts. Keep it compact.

| Artifact | Owner | Path | Source of truth | Status | Commit policy | Reviewer/gate | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Product brief | Coordinator | Vault path | Vault | planned | vault-versioned | user | linked from scope hub |
| ADR | Coordinator | Vault path | Vault | planned | vault-versioned | user/tech lead | decision accepted |
| HLD | Coordinator | Vault path | Vault | planned | vault-versioned | user/tech lead | architecture reviewed |
| LLD | Repo owner | Vault path | Vault | planned | vault-versioned | repo reviewer | implementation-ready |
| OpenSpec change | Repo worker | Repo path | OpenSpec | optional | ask | repo reviewer | openspec validate |
| Implementation plan | Repo worker | Repo/local path | Superpowers or fallback | optional | ask | coordinator | plan reviewed |
| Workstream board | Coordinator | Vault path | Vault | optional | vault-versioned | user | board/dashboard linked |
| Release notes / RCA / lessons | Coordinator | Vault path | Vault | later | vault-versioned | user | final review |
| Interesting finding / follow-up | Coordinator or worker | Vault board/note path | Vault | optional | vault-versioned | coordinator | routed or explicitly skipped |

## Status Values

- proposed
- planned
- in-progress
- blocked
- reviewing
- accepted
- complete
- skipped

## Source Of Truth Rules

- Vault owns product, architecture, decisions, and post-work learning.
- OpenSpec owns repo-local behavior deltas when used.
- Superpowers or fallback plans own execution details.
- Code and tests own final implementation behavior.

If two artifacts disagree, pause and reconcile before continuing.
