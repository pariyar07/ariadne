---
name: ariadne:research-intake
description: Use when an existing workflow still invokes the retired Ariadne research-intake name during the one-release compatibility window.
---

# Deprecated: Ariadne Research Intake

`ariadne:research-intake` is a deprecation adapter retained for one compatibility release for `ariadne:research-ingest`.

Immediately invoke `ariadne:research-ingest` and follow its complete contract. Pass through the user's request and any already confirmed target unchanged. Do not select a scope, build a second handoff, capture material, create pipeline topology, decide synthesis disposition, or perform any independent workflow in this adapter.

Tell the user briefly that the saved prompt, instruction, automation, or installed skill reference should migrate to `ariadne:research-ingest`. Do not rewrite external instructions or generated vault content unless that migration is explicitly authorized.
