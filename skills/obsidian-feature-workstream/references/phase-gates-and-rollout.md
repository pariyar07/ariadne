# Phase Gates And Rollout

Use these gates for mature, production-facing, multi-repo, integration, schema, package, or agent-workflow changes.

## Gates

1. Idea accepted
   - Problem, user, outcome, non-goals, and success criteria are clear enough to proceed.

2. Vault design ready
   - Required product brief, ADR, HLD, LLD, or workstream board exists or is explicitly skipped.
   - The vault target is explicit in the current turn before writes.

3. Repo change contract ready
   - OpenSpec exists for repos with durable behavior/API/schema/workflow/package changes, or the user explicitly skips it.
   - Repo-local artifact commit policy is known.

4. Implementation ready
   - Branch/worktree plan is clear.
   - Worker ownership boundaries do not collide.
   - Model/thinking settings are confirmed for parallel workers.
   - Security and approval boundaries are clear.

5. Verification ready
   - Each repo has the smallest meaningful test/build/check.
   - Cross-repo or end-to-end verification is defined when needed.

6. Merge/release ready
   - Compatibility, versioning, migrations, feature flags, rollout, rollback, and observability are addressed.
   - Package publish or deployment steps have explicit approval.

7. Learning captured
   - Vault update, RCA, lesson, achievement, follow-up card, or "not needed" decision is recorded.

## Production Prompts

Ask when relevant:

- Is this behind a feature flag or staged rollout?
- Does this require a migration or backfill?
- Is backward compatibility required?
- Does a package version need publishing before consumers update?
- What metrics, logs, traces, dashboards, or alerts verify success?
- What is the rollback or disable path?
- Who approves production access, publish, merge, deploy, or customer-impacting changes?
