# {{folder_name}} - Local Agent Instructions

This file contains folder-specific guidance for agents working in this local scope.

Use this only when the folder has specialized workflow rules that differ from its parent scope.

This file is a local delta. It inherits parent/root rules and must not repeat global policy from parent `AGENTS.md` files.

## Purpose

{{purpose}}

## Read First

- `00 {{folder_name}} Index.md`

## Local Rules

- Add only rules that are different for this local scope.
- Link durable notes from the scope hub.
- Use path-qualified wikilinks when linking outside this scope and duplicate filenames may exist.
- Update relevant local Bases when metadata-driven inspection matters.

## Workflow

Describe the local flow here.

Example:

```text
Input -> Local object -> Local interpretation -> Output -> Decision
```

## Done Criteria

- The note is in the right folder.
- The note is linked from the local hub when durable.
- The note has meaningful links to related sources, concepts, entities, relationships, questions, or decisions.
- Follow-up work is captured in `Processing Queue/` or `Questions/`.

## Local Bloat Signals

- This folder has many durable notes but no useful local hub.
- The local hub is too long to scan.
- Repeated questions require local-delta instructions not captured here.
- A local Base would be more useful than a long hand-maintained list.
- This file repeats parent/root rules instead of naming only local differences.
