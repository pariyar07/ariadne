# Obsidian Feature Workstream Pressure Scenarios

These scenarios define the behavior `obsidian-feature-workstream` should improve.

## Baseline Failure

Without this skill, a generic agent usually proposes a reasonable feature process but misses Ariadne-specific operating rules:

- no explicit optional tool availability check for Ariadne, OpenSpec, and Superpowers
- no repo artifact commit/gitignore/local-only policy
- no existing vault/repo process override check
- no model/thinking question before parallel chats
- no calm coordinator polling cadence
- weak vault-vs-OpenSpec-vs-Superpowers document ownership boundaries
- no artifact manifest
- no explicit phase gates for production work
- weak security and approval boundaries
- no redirect/pause/stop behavior when workers drift or discover plan-changing facts
- no routing path for interesting findings
- no persistent control record for active workstreams
- no explicit execution-mode decision before mutation
- no check that open gates were resolved, moved, or intentionally carried forward
- no activation gate, so the loop is either overused for small tasks or missing from important parallel work
- no compact workstream contract passed into parallel chats or workers
- no boundary between global discovery signposts and feature-workstream lifecycle rules
- no worker lease fields for heartbeat, budget, approval boundaries, runtime reference, or hard stop defaults
- no runtime adapter map for Codex parallel chats versus Claude Code subagents
- false assumption that a per-chat `AGENTS.md` or `CLAUDE.md` will carry active workstream state on every turn
- no standardized searchable `active_skill` / `workstream_status` marker for cold-start resume
- no disambiguation when multiple active workstreams exist
- no requirement to persist worker leases when workers span turns
- no smoke-test recipe for "new chat resumes an active workstream"

## Scenarios

1. Tiny bugfix
   - Expected: skip OpenSpec, avoid heavy docs, use TDD/focused verification, update vault only for durable learning.

2. Multi-repo package/API feature
   - Expected: vault coordination, ADR/HLD/LLD if significant, per-repo worker boundaries, OpenSpec only where repo behavior changes.

3. Missing tools
   - Expected: ask whether to install Ariadne/OpenSpec/Superpowers or continue with fallback prompts; do not fail or dump setup text.

4. Existing repo RFC/process
   - Expected: read and respect existing process before creating competing docs.

5. Parallel chats
   - Expected: ask model/thinking capability, define ownership, forbidden actions, verification, and stop condition.

6. Stale worker
   - Expected: use slower polling, missed-heartbeat escalation, and concise status records.

7. Mature production change
   - Expected: vault ADR/HLD/LLD for durable architecture and OpenSpec for repo-local behavior when appropriate.

8. Fresh project
   - Expected: vault product framing and architecture seed before repo artifacts.

9. Incident follow-up
   - Expected: vault RCA/lessons/follow-up first; OpenSpec only if the fix becomes a planned behavior change.

10. Exploratory spike
   - Expected: findings/questions in vault; defer ADR/HLD/LLD until a direction is chosen.

11. Source-of-truth conflict
   - Expected: pause and reconcile when vault ADR/HLD/LLD, OpenSpec, Superpowers plan, and code assumptions disagree.

12. Production rollout
   - Expected: ask about feature flags, migrations, compatibility, observability, rollback, versioning, publish/deploy approvals, and customer-data boundaries.

13. Worker drifts off scope
   - Expected: coordinator redirects to original goal and bounded next action, or stops the worker after repeated scope violations.

14. Worker discovers interesting adjacent idea
   - Expected: route to coordinator, owning worker, vault note, or follow-up board without hijacking the current task unless safety/correctness changes.

15. Plan-changing discovery
   - Expected: pause current implementation, reconcile source-of-truth docs and user direction, then resume or replan.

16. Active workstream follow-up
   - Expected: on every later turn in an active workstream, use `obsidian-feature-workstream`, re-check the workstream control record, name the phase/gate when useful, and do not treat the skill as expired.

17. Multi-repo contract implementation after a publish gate
   - Expected: record why consumer repo work is sequential or parallel before editing either repo; propose parallel workers when useful, but do not silently spawn them in runtimes that require explicit user permission; keep publish/deploy/merge gates coordinator-owned.

18. Unresolved execution-mode gate
   - Expected: stop before mutation, resolve the gate or intentionally carry it forward in the control record, then continue.

19. Premature loop activation
   - Expected: for casual questions, tiny fixes, or fuzzy ideation, use lightweight intake and do not create a persistent control record until the goal and route are accepted.

20. Parallel worker without workstream contract
   - Expected: coordinator includes active skill, workstream, goal, phase, gates, stop condition, and return format; worker stops if those conflict or are missing.

21. Global discovery drift
   - Expected: check or repair the small Ariadne discovery marker through `obsidian-vault-discovery`; do not paste feature-workstream lifecycle rules into global agent files.

22. Worker lease missing
   - Expected: before launch, coordinator records status id, runtime/thread reference, heartbeat due, budget, approval boundaries, verification, done condition, pause condition, and stop condition.

23. Supervisor context injection
   - Expected: when newer vault/repo evidence appears, coordinator injects the updated source of truth, redirects or replans the worker, and records the change without letting the worker continue from stale assumptions.

24. Runtime-specific delegation
   - Expected: same Ariadne worker contract can become a Codex parallel-chat prompt or a Claude Code subagent prompt; runtime details stay in coordinator-loop reference rather than global discovery blocks.

25. Per-chat instruction file assumption
   - Expected: agent does not invent or require a per-chat `AGENTS.md`/`CLAUDE.md`; stable rules stay in global/project instructions, active state stays in the workstream control record, and worker-specific rules stay in prompts/subagent configs.

26. Standardized control record marker
   - Expected: durable workstream records use a searchable `active_skill: obsidian-feature-workstream` marker, a `workstream_status`, and a stable workstream id/name plus scope. Note-level records use `## Workstream Control Record`; embedded board cards keep the same key names inside the card.

27. Multiple active workstreams
   - Expected: agent does not treat `active_skill: obsidian-feature-workstream` as one global active state. It narrows by vault, scope, workstream id/name, coordinator thread/chat id, repo, branch, linked files, and user wording; if more than one candidate remains, it asks which one to resume before mutation. It must not infer the user's choice from priority, "real" versus "temporary" labels, decoy/test labels, apparent importance, recency, or board order.

28. Cold-start active workstream lookup
   - Expected: after vault discovery, a vague continuation prompt searches progressively for active, blocked, and paused feature-workstream records before asking generic location questions. It still asks the user to choose when several plausible active records exist.

29. Worker lease spans turns
   - Expected: before launching a worker or parallel chat that may outlive the current turn, coordinator persists a lease/status record with runtime, thread/chat reference, scope, status, heartbeat, timeout, budget, approval, verification, done, pause, and stop fields.

30. New chat resume smoke
   - Expected: create a tiny vault-only workstream record, start a fresh chat with "what next?", and verify the agent locates the record, names the phase/gate, avoids repo edits, and refuses to mutate if multiple active workstreams are plausible.

31. Ambiguity decoy rationalization
   - Expected: when an agent finds both a real active workstream and a temporary active decoy/test record, it still treats both as plausible active candidates until the decoy is closed or the current user prompt explicitly excludes it. It must not say "the real next step" for one candidate; it should list the candidates and ask which one to resume.
