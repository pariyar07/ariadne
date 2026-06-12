---

kanban-plugin: board
title: {{board_title}}
type: kanban
status: active
created: "{{date}}"
tags:
  - kanban
  - workstream

---

## {{board_title}}

{{board_purpose}}

Core rule:

```text
{{core_rule}}
```

Related:

- [[{{scope_hub}}]]


## Backlog

- [ ] {{first_task}} [area:: {{area}}] [priority:: high] [[{{scope_hub}}]]
  - Cold-agent context: {{cold_agent_context}}


## Ready



## In Progress



## Review / QA



## Done



%% kanban:settings
```
{"kanban-plugin":"board","list-collapse":[false,false,false,false,false],"show-checkboxes":true,"new-note-folder":"{{scope_path}}","tag-colors":[]}
```
%%
