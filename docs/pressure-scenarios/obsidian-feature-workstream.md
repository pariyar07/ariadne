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
