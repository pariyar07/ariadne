# Weekly Maintenance Automation

Ariadne already has the skills needed for recurring vault care. A weekly automation should be a scheduled prompt that invokes those skills, not a separate skill.

Use a new skill only when you are adding a reusable capability that agents should learn as a standalone procedure. Weekly maintenance is orchestration: it combines validation, maintenance, navigation repair, ingest cleanup, and synthesis checks in a predictable order.

## Recommended Shape

Run the automation from the vault root, or configure the automation's working directory to the vault root.

Use a weekly cadence for active vaults. Daily runs are usually too noisy unless the vault is receiving automated ingest.

Prefer chat or automation-run output for the weekly result. Write durable notes only when the run creates an actual fix, records an unresolved follow-up, or the user explicitly wants a dated health report.

Do not auto-commit, auto-push, move large folders, delete notes, or restructure navigation without explicit approval.

## Skill Sequence

```text
ariadne:validator
  -> deterministic structural baseline

ariadne:maintainer
  -> stale queues, content drift, routing drift, and repair triage

ariadne:navigation
  -> only if hubs, indexes, routing, or scope boundaries need repair

ariadne:ingest / ariadne:research-ingest
  -> only if raw, inbox, or source material needs compilation

ariadne:synthesis
  -> only if stale research threads or open questions need consolidation

obsidian-bases
  -> only if Base views, indexes, filters, or Base links need repair

ariadne:discovery
  -> only if machine-level vault registry or cold-start entrypoints are stale
```

## Subagent Pattern

Use subagents for independent read-only audits, not concurrent edits.

Good subagent splits:

- validation and navigation audit
- inbox, raw source, and processing queue audit
- Bases, outputs, and stale report audit

The main agent should own all edits, reconcile subagent findings, rerun validation, and produce the final summary.

## Codex Automation Prompt

Use this as the task prompt for a weekly Codex workspace automation. Configure the schedule, model, and working directory in Codex rather than inside the prompt.

```text
Run the weekly Ariadne vault maintenance pass.

Use the vault's AGENTS.md instructions and the smallest relevant Ariadne/Obsidian skill route. Load and apply these skills when relevant:
- ariadne:validator for structural validation and deterministic health checks.
- ariadne:maintainer for stewardship, stale queues, routing drift, and maintenance triage.
- obsidian-markdown for Obsidian frontmatter, wikilinks, callouts, and note formatting.
- ariadne:navigation when navigation files, hubs, routing, indexes, or scope entrypoints have drifted.
- ariadne:ingest or ariadne:research-ingest when inbox, raw, or source material needs compilation.
- ariadne:synthesis when research notes, open questions, or source captures need consolidation.
- ariadne:research-pipeline when a scope lacks a repeatable source-to-synthesis path.
- obsidian-bases when Base views, Base indexes, filters, or base-file links need repair.
- ariadne:discovery when registry, vault entrypoints, or discovery metadata look stale.

Sequence:
1. Read the vault entry files: AGENTS.md, 00 Index.md or 00 Global Index.md, Agent/00 Agent Navigation.md, Agent/Vault Health Check Procedure.md, Agent/Vault Navigation Standard.md, and any narrower local AGENTS.md/index files for scopes you touch.
2. Run the validator script from ariadne:validator and capture the exact result.
3. Inspect validator output and fix only deterministic, low-risk issues: broken wikilinks where the intended existing target is clear, stale references to deleted files, missing Base index links, obvious YAML/frontmatter/base syntax issues, or duplicate navigation drift.
4. Run a maintainer pass over global and scoped Inbox, Processing Queue, Raw/Sources, Questions, Decisions, Bases, navigation files, high-change domain scopes, and existing Outputs only when they are already part of the vault. Search progressively; do not scan the whole vault by default.
5. Use subagents only for independent read-only audits, such as one subagent for validation/navigation, one for intake/source queues, and one for Bases/existing outputs. The main agent owns edits and reconciles results.
6. For issues that require product direction, architecture judgment, large restructures, deletions, or ambiguous scope ownership, create or update a needs-review follow-up in the relevant scope instead of making broad changes.
7. Do not create a dated report in Outputs by default. Keep the weekly maintenance result in the automation chat/output unless a durable vault note is needed for an actual fix, unresolved follow-up, or explicit user-approved record.
8. Re-run the validator. Aim for all zero warnings unless an accepted warning is explicitly documented in the final summary.
9. End with a concise summary: validator result, files changed, unresolved follow-ups, and whether human approval is needed.

Guardrails:
- Keep project-specific fixes inside the nearest relevant domain scope.
- Do not move, delete, or restructure large areas without explicit approval.
- Preserve unrelated dirty worktree changes.
- Do not commit or push unless the user explicitly asks in that run.
```

## Claude Code Adaptation

Use the same prompt as a reusable command, scheduled external run, or GitHub Action prompt.

Claude Code subagents are useful for the read-only audit splits above. Hooks are useful for deterministic guardrails such as running the validator after edits or blocking risky shell commands. Keep hooks narrow: validation and notification are good fits; broad autonomous restructuring is not.

When running through GitHub Actions, keep private vault data and secrets out of workflow logs, and prefer read-only reporting unless the repository is intentionally set up for automated pull requests.

## Optional Durable Report Variant

Add this instruction only when a vault owner wants weekly health history inside the vault:

```text
Create or update a dated health report under Outputs/ using the vault's Knowledge Health Check template or equivalent convention. Link any durable follow-ups to the nearest responsible scope.
```
