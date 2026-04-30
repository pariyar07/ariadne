# Maintenance Reference

## Weekly Review

For active vaults, maintain a weekly loop:

- capture important raw material
- compile raw material into durable notes
- update open questions
- update decisions
- update index/hub notes
- archive stale material

## Monthly Health Check

Check:

- notes missing frontmatter
- raw sources without compiled notes
- decisions without rationale
- duplicate concepts
- orphan notes
- stale questions
- outputs that should be filed back into the main wiki

## Naming Conventions

- Index notes: `00 Index.md`
- Folder hubs: `00 <Folder> Index.md`
- Decisions: `YYYY-MM-DD Decision Name.md`
- Raw sources: `YYYY-MM-DD Source Title.md`
- Generated outputs: `YYYY-MM-DD Output Title.md`

## Frontmatter Defaults

```yaml
---
title:
type:
status: draft
created: YYYY-MM-DD
tags: []
---
```

Common `type` values:

- `index`
- `workflow`
- `raw-source`
- `research`
- `concept`
- `question`
- `decision`
- `output`
- `visualization`
- `project`
- `life`
- `system`

Common `status` values:

- `draft`
- `active`
- `captured`
- `compiled`
- `accepted`
- `superseded`
- `archived`
