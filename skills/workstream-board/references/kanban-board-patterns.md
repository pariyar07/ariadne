# Kanban Board Patterns

## Board File Shape

Use a normal Markdown file with Obsidian Kanban frontmatter:

```markdown
---

kanban-plugin: board
title: Example Workstream
type: kanban
status: active
created: 2026-06-13
tags:
  - example
  - kanban

---

## Example Workstream

Short purpose statement.

## Backlog

- [ ] First task [area:: planning] [priority:: high] [[Canonical Context]]

%% kanban:settings
```
{"kanban-plugin":"board","list-collapse":[false,false],"show-checkboxes":true,"new-note-folder":"Scope/Path","tag-colors":[]}
```
%%
```

Keep a blank line between sections. Obsidian Kanban treats headings as board lists.

## Metadata Standard

Use inline fields on task lines so Dataview dashboards can query cards:

| Field | Required | Values |
| --- | --- | --- |
| `area` | yes | short machine-readable work area |
| `priority` | yes | `high`, `medium`, `low` |
| `owner` | optional | person, team, or agent role |
| `due` | optional | `YYYY-MM-DD` |
| `completed` | optional | `YYYY-MM-DD` on done cards |

Example:

```markdown
- [ ] Add cold-agent transcript review [area:: evidence] [priority:: high] [[Domains/Ariadne/Kanban/Ariadne Evaluation and Testing]]
  - Cold-agent context: compare actual file reads against expected entrypoint order.
```

## Column Patterns

### Implementation

- Backlog
- Ready
- In Progress
- Review / QA
- Done

### Evaluation

- Backlog
- Ready
- Running
- Evidence Review
- Findings
- Done

### Roadmap

- Ideas
- Candidate
- Shaping
- Ready
- Done

### QA

- Backlog
- Ready
- Running
- Failed / Follow-up
- Passed

## Audit Checklist

Check existing boards for:

- plugin frontmatter
- clear purpose paragraph
- lifecycle columns matching the work type
- task lines using checkboxes
- required inline metadata
- canonical context links
- concise cold-agent context on ambiguous cards
- board linked from `Kanban/00 Kanban Index.md`
- board linked from the scope hub if it is a primary route

Preserve card order and completion state during cleanup unless the user explicitly asks for triage.
