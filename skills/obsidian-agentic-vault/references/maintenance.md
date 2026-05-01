# Maintenance Reference

## Weekly Review

For active vaults, maintain a weekly loop:

- capture important raw material
- compile raw material into durable notes
- clear or re-triage inbox items
- advance processing queue items
- update open questions
- update decisions
- update index/hub notes
- archive stale material

## Monthly Health Check

Check:

- notes missing frontmatter
- raw sources without compiled notes
- unprocessed inbox items
- processing queue items stuck in `needs-review` or `processing`
- decisions without rationale
- duplicate concepts
- orphan notes
- stale questions
- claims without source links
- important concepts without examples
- stale index notes
- outputs that should be filed back into the main wiki

## Naming Conventions

- Index notes: `00 Index.md`
- Folder hubs: `00 <Folder> Index.md`
- Decisions: `YYYY-MM-DD Decision Name.md`
- Raw sources: `YYYY-MM-DD Source Title.md`
- Brain dumps: `YYYY-MM-DD Brain Dump Topic.md`
- Processing items: `YYYY-MM-DD Process Item Topic.md`
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
- `brain-dump`
- `processing-item`
- `entity`
- `relationship`
- `claim`
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
- `processing`
- `linked`
- `needs-review`
- `compiled`
- `accepted`
- `superseded`
- `archived`
