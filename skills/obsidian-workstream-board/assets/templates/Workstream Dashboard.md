---
title: {{board_title}} Dashboard
type: dashboard
status: active
created: "{{date}}"
tags:
  - dashboard
  - workstream
---

# {{board_title}} Dashboard

This dashboard rolls up the {{board_title}} board and related workstream notes.

## Board

- [[{{board_path}}]]

## Open Work

```dataview
TASK
FROM "{{kanban_folder}}"
WHERE !completed AND contains(file.name, "{{board_title}}")
GROUP BY section
SORT rows.file.link ASC
```

## High Priority Open Work

```dataview
TASK
FROM "{{kanban_folder}}"
WHERE !completed AND priority = "high"
SORT area ASC, text ASC
```

## Recent Workstream Notes

```dataview
TABLE type, status, file.mtime AS "Updated"
FROM "{{scope_path}}"
WHERE contains(tags, "implementation") OR contains(tags, "qa") OR contains(tags, "decision")
SORT file.mtime DESC
```

## Key Records

- [[{{scope_hub}}]]
