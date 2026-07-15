---
title: "{{title}}"
type: research-boundary
status: active
created: "{{date}}"
research_schema: 1
boundary_id: "{{boundary_id}}"
scope_path: "{{scope_path}}"
raw_hub: "[[{{raw_hub}}]]"
compiled_hub: "[[{{compiled_hub}}]]"
inquiry_hub: "[[{{inquiry_hub}}]]"
synthesis_hub: "[[{{synthesis_hub}}]]"
view_mode: exact
rollup_boundaries: []
tags:
  - research
  - research-boundary
---

# {{title}}

This is the canonical schema-v1 descriptor for one research boundary. Keep `boundary_id` stable and all paths vault-relative. When the local workflow uses a thread hub, add an optional top-level `thread_hub` property and a matching pipeline link together.

## Boundary Purpose


## Membership

`exact` includes only artifacts whose `research_boundary` points to this descriptor. `rollup` adds only the descendant descriptors explicitly listed in `rollup_boundaries`. Folder ancestry never grants membership.

## Pipeline

- Raw evidence: [[{{raw_hub}}]]
- Compiled research: [[{{compiled_hub}}]]
- Inquiries: [[{{inquiry_hub}}]]
- Current synthesis: [[{{synthesis_hub}}]]

## Local Rules
