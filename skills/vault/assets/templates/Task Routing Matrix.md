---
title: Task Routing Matrix
type: operating-standard
status: active
created: "{{date}}"
tags:
  - agent-workflow
  - routing
  - navigation
---

# Task Routing Matrix

<!-- ariadne:scope-routing:start -->
## Scope Routing

| Destination | Scope ID | Status |
| --- | --- | --- |
| [[00 Index|Current: {{vault_name}}]] | `root` | active |
<!-- ariadne:scope-routing:end -->

Use this matrix to choose the smallest useful context set for a task.

## Routing Rules

| User intent | Read first | Then read | Write/update |
| --- | --- | --- | --- |
| Shared link or source material | [[Agent/Ingest Compile Workflow]] | [[Research/00 Research Index]], [[Raw/Sources/00 Source Index]] | `Raw/Sources/`, `Research/`, relevant durable folders |
| Research synthesis | [[Research/00 Research Index]] | relevant thread hub and compiled notes | synthesis notes, concepts, entities, relationships, questions |
| Vault maintenance | [[Agent/Vault Health Check Procedure]] | [[Agent/Vault Navigation Standard]], [[Bases/00 Bases Index]] | `Outputs/`, indexes, queue notes |
| Bases or view-layer work | [[Bases/00 Bases Index]] | [[Agent/Vault Navigation Standard]], relevant `.base` file | `Bases/`, relevant folder hub |
| New durable workstream graph | [[Agent/Vault Navigation Standard]] | [[Agent/Knowledge Processing Architecture]], relevant existing hubs | new or updated hub, routing row, templates/Base if useful |
| Brain dump or rough notes | [[Inbox/00 Inbox Index]] | [[Processing Queue/00 Processing Queue Index]] | `Inbox/`, `Processing Queue/` |
| Template work | [[Templates/00 Templates Index]] | relevant template | `Templates/` |

## Escalation Rules

- If the task changes durable structure, read [[Agent/Knowledge Processing Architecture]].
- If the task changes navigation, read [[Agent/Vault Navigation Standard]].
- If the task introduces a new durable workstream graph, register it through the navigation standard.
- If a write action does not name the target scope, domain, customer, project, or workstream in the current prompt, search for likely homes only to prepare a confirmation question; ask before editing. Do not treat search hits, a single likely match, existing matching cards, prior conversation, current working directory, or active skills as confirmation.
- If the task creates a commitment, add a dated note in [[Decisions/00 Decisions Index]].
- If the task creates an unresolved follow-up, add a question note or processing item.

## Related

- [[Agent/00 Agent Navigation]]
- [[Agent/Vault Navigation Standard]]
- [[Agent/Vault Health Check Procedure]]
