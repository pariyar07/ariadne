---
title: Long Term Knowledge Workflow
type: workflow
status: active
created: {{date}}
tags:
  - agent-workflow
  - context-management
---

# Long Term Knowledge Workflow

## Roles

The human curates direction, shares sources, corrects interpretations, and makes decisions.

The agent captures, compiles, links, indexes, audits, and maintains the wiki.

## Context Discovery

Agents should not read the whole vault by default.

Use this order:

1. Read `00 Index.md`.
2. Read `AGENTS.md` or `CLAUDE.md`.
3. Read relevant folder hub notes.
4. Search filenames with `find`.
5. Search contents with `rg`.
6. Follow relevant wikilinks.
7. Read raw sources only when compiled notes are insufficient.
8. Use Bases to inspect status and metadata.

## Health Checks

Check for:

- uncompiled raw sources
- orphan notes
- duplicate concepts
- stale questions
- decisions without rationale
- missing frontmatter
- broken links
