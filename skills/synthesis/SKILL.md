---
name: ariadne:synthesis
description: Use when an existing workflow still invokes the retired Ariadne synthesis name during the one-release compatibility window.
---

# Deprecated: Ariadne Synthesis

`ariadne:synthesis` is a deprecation adapter retained for one compatibility release for `ariadne:research-synthesis`.

Immediately invoke `ariadne:research-synthesis` and follow its complete contract. Pass through the user's request, confirmed research boundary, and allowed write set unchanged. Do not gather sources, choose or record a disposition, update an inquiry or thread, create a promotion candidate, or perform any independent workflow in this adapter.

Tell the user briefly that the saved prompt, instruction, automation, or installed skill reference should migrate to `ariadne:research-synthesis`. Do not rewrite external instructions or generated vault content unless that migration is explicitly authorized.
