---
title: Bases Index
type: index
status: active
created: "{{date}}"
tags:
  - index
  - bases
  - navigation
  - view-layer
---

# Bases Index

Bases are the vault's view layer. They make the Markdown wiki inspectable through metadata, status, folders, and note types.

They are not the source of truth. The source of truth remains the Markdown vault.

## View Layer Rule

Use Bases to inspect and maintain the knowledge system, not to replace note links or folder hubs.

Use wikilinks for Base files from this index so Obsidian can traverse the view layer. Validation checks should resolve both Markdown notes and `.base` files.

## Active Bases

| Base | Purpose | Related hub |
| --- | --- | --- |
| [[Bases/Project Notes.base]] | Shows all Markdown notes except templates, with type, status, created date, and folder. | [[00 Index]] |
| [[Bases/Research Pipeline.base]] | Shows raw-source and research notes for source ingestion and compilation checks. | [[Research/00 Research Index]] |
| [[Bases/Entities.base]] | Shows durable entity notes. | [[Entities/00 Entities Index]] |
| [[Bases/Relationships.base]] | Shows durable relationship notes and relationship metadata. | [[Relationships/00 Relationships Index]] |
| [[Bases/Decisions.base]] | Shows dated decision notes. | [[Decisions/00 Decisions Index]] |
| [[Bases/Knowledge Health.base]] | Shows health-check outputs and notes needing review. | [[Outputs/00 Outputs Index]] |
| [[Bases/Navigation.base]] | Shows index notes and operating standards. | [[Agent/00 Agent Navigation]] |
| [[Bases/Inbox.base]] | Shows inbox and brain-dump items. | [[Inbox/00 Inbox Index]] |
| [[Bases/Processing Queue.base]] | Shows processing queue items and their status. | [[Processing Queue/00 Processing Queue Index]] |

## Maintenance

When adding a new Base:

1. Keep the `.base` file valid YAML.
2. List and link the Base in this index.
3. Reference the relevant folder hub or workflow note.
4. Add or update a routing rule if the Base supports a recurring task.
5. Update [[Agent/Vault Health Check Procedure]] if the Base creates a new maintenance responsibility.

## Related

- [[Agent/Vault Navigation Standard]]
- [[Agent/Task Routing Matrix]]
- [[Agent/Vault Health Check Procedure]]
