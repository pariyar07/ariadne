---
title: Vault Health Check Procedure
type: operating-standard
status: active
created: "{{date}}"
tags:
  - maintenance
  - health-check
  - agent-workflow
---

# Vault Health Check Procedure

Use this procedure to keep the vault navigable over months of research, projects, learning, or operations.

## Cadence

Run a lightweight check after major ingest sessions and a full check weekly while the vault is active.

## Checks

### 1. Frontmatter

Durable notes should have frontmatter with at least:

- `title`
- `type`
- `status`
- `created`
- `tags`

### 2. Connectivity

Check for:

- notes with no incoming or outgoing wikilinks
- broken wikilinks
- important notes missing from folder hubs
- folder hubs missing from [[Agent/00 Agent Navigation]]
- `.base` files missing from [[Bases/00 Bases Index]]

### 2.5 Bloat And Drift

Check for:

- [[00 Index]] becoming a full table of contents instead of a strategic map
- [[Agent/00 Agent Navigation]] carrying detailed note lists instead of routes
- folders with many durable notes but no `00 ... Index.md` hub
- hubs that are too long to scan and should be split into sub-hubs or Bases
- recurring workstreams missing from [[Agent/Task Routing Matrix]] — confirmed by `routing-matrix-warnings: 0` in the validator
- raw sources, inbox items, processing items, or outputs accumulating without compilation
- important open questions living only inside long notes instead of [[Questions/00 Questions Index]]
- folders where agents repeatedly need user guidance because global instructions are too generic
- stale or missing local `AGENTS.md` files for specialized folders

### 3. Pipeline

Check for:

- raw sources without compiled notes
- research notes without source links
- important actors or objects missing from entity indexes
- claims without supporting sources

### 4. Work Queues

Check:

- [[Inbox/00 Inbox Index]]
- [[Processing Queue/00 Processing Queue Index]]
- [[Questions/00 Questions Index]]
- [[Outputs/00 Outputs Index]]

### 5. Stale Navigation

Compare new notes against:

- [[00 Index]]
- [[Agent/00 Agent Navigation]]
- relevant folder hub
- relevant thread hub
- [[Bases/00 Bases Index]] when view-layer files change

## Proactive Repair Routing

If a problem appears during ordinary vault work, report it before continuing as if the vault is healthy. Use this shape:

- What is broken.
- Why it matters.
- Which deterministic check or Ariadne skill should handle it.
- Whether the fix is safe to do now or needs approval.

Suggested routing:

- Discovery registry, entrypoint, or adapter marker issues: `ariadne:global-discovery` and the Ariadne discovery doctor.
- Broken links, orphan notes, invalid frontmatter, invalid Bases, or unlinked Bases: `ariadne:validator`, then `ariadne:maintenance`.
- Oversized hubs, missing hubs, unclear scope boundaries, or routing drift: `ariadne:navigation`.
- Raw, inbox, processing, or output buildup: `ariadne:knowledge-capture` or `ariadne:research-intake`.
- Missing research pipeline structure: `ariadne:research-pipeline`.
- Stale conclusions, assumptions, or unresolved questions: `ariadne:synthesis`.

## Report Format

For interactive or scheduled maintenance, a chat or automation-run summary is enough by default.

Create a dated note in `Outputs/` using [[Templates/Knowledge Health Check]] when the user asks for a durable health record, a major maintenance pass needs an audit trail, or unresolved follow-ups should be visible inside the vault.

Use statuses:

- `healthy`
- `needs-review`
- `needs-linking`
- `needs-compilation`
- `needs-decision`

## Related

- [[Agent/Vault Navigation Standard]]
- [[Agent/Task Routing Matrix]]
- [[Bases/00 Bases Index]]
- [[Outputs/00 Outputs Index]]
