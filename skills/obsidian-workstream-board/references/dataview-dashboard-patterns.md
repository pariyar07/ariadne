# Dataview Dashboard Patterns

Use Dataview dashboards when a workstream needs dynamic rollups from task metadata, note metadata, QA records, implementation records, or source documents.

## Task Rollups

Open work grouped by Kanban column:

```dataview
TASK
FROM "Scope/Path/Kanban"
WHERE !completed AND contains(file.name, "Board Name")
GROUP BY section
SORT rows.file.link ASC
```

High-priority open work:

```dataview
TASK
FROM "Scope/Path/Kanban"
WHERE !completed AND priority = "high"
SORT area ASC, text ASC
```

Area-specific work:

```dataview
TASK
FROM "Scope/Path/Kanban"
WHERE !completed AND area = "evaluation"
SORT priority ASC, text ASC
```

## Note Rollups

Recent implementation or decision records:

```dataview
TABLE type, status, file.mtime AS "Updated"
FROM "Scope/Path"
WHERE contains(tags, "implementation") OR contains(tags, "decision")
SORT file.mtime DESC
```

QA records:

```dataview
TABLE status, tested_at AS "Tested", file.mtime AS "Updated"
FROM "Scope/Path"
WHERE contains(tags, "qa") OR contains(tags, "manual-test")
SORT tested_at DESC
```

## Query Rules

- Keep `FROM` paths narrow.
- Prefer task queries for Kanban cards.
- Prefer table queries for durable notes.
- Use fields already present in cards or frontmatter.
- Do not invent fields in dashboards without adding them to the board/card standard.
- Avoid DataviewJS unless plain Dataview Query Language cannot express the dashboard.

## Audit Checklist

Check existing dashboards for:

- frontmatter with `type: dashboard`
- a linked source board or workstream hub
- code blocks using `dataview`
- source paths that exist
- fields that are actually present on tasks or notes
- queries scoped to the relevant workstream
- dashboard linked from `Dashboards/00 Dashboards Index.md` or the scope hub

When a query depends on optional plugins or fields, call that out instead of treating Markdown validity as dashboard correctness.
