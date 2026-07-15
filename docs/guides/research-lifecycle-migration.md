# Research Lifecycle Migration

Ariadne `v0.2.0` is a breaking research-lifecycle release. Updating the repository does not silently clean copied skill installations, rewrite generated vault content, or update saved prompts and external automation.

## Skill names

| Removed in v0.2.0 | Active replacement |
| --- | --- |
| `ariadne:research-intake` | `ariadne:research-ingest` |
| `ariadne:synthesis` | `ariadne:research-synthesis` |

`ariadne:research-stewardship` now owns provenance, compilation coverage, stale synthesis, unresolved inquiry history, and legacy-pipeline drift inside one named research boundary.

The retired skill folders are not shipped in `v0.2.0`. Invocations using the removed names fail until the caller is updated.

## Clean installed copies

1. Update or reinstall Ariadne using the same installation method and agent target used originally.
2. Run `npx skills list -g` and confirm the three active research lifecycle skills are installed.
3. Locate copied Ariadne skill installations for every configured runtime.
4. Confirm each stale `research-intake` or `synthesis` directory is an installer-managed copy, not this repository or user-authored content.
5. Delete those stale copied directories explicitly; do not assume an update command removed folders absent from the new release.
6. Run representative ingest, synthesis, and stewardship requests using only the active names.

Do not treat successful package output as proof that copied installation directories were cleaned up.

## Update saved prompts and automation

Repository updates cannot edit prompts copied into chats, commands, CI configuration, launch agents, cron jobs, or external scheduler products. Replace removed identifiers manually after reviewing each automation's target and write boundaries.

The weekly prompt in [Weekly Maintenance Automation](weekly-maintenance-automation.md) begins with:

```text
ARIADNE_WEEKLY_MAINTENANCE_PROMPT_VERSION: 1
```

The prompt version is independent of the Ariadne release version. A missing or older marker means the copied prompt needs review.

## Audit workspace and vault instructions

Run the installed workspace checker from the directory containing its `SKILL.md`:

```bash
node scripts/check_workspace.js "/path/to/workspace" --json
```

From a repository checkout:

```bash
node skills/workspace-instructions/scripts/check_workspace.js "/path/to/workspace" --json
```

Inspect `retiredResearchSkillNameFiles`, `retiredResearchSkillNamesByFile`, and `retiredResearchSkillNameReplacements`. Apply exact replacements only inside well-formed Ariadne-managed marker blocks and preserve every byte outside them.

The checker does not rewrite ordinary user prose, malformed or duplicate markers, saved prompts, scheduler configuration, or arbitrary vault notes. Review those surfaces separately.

## Re-sync `AGENTS.override.md`

Codex reads `AGENTS.override.md` instead of `AGENTS.md` at the same directory level.

1. Save the complete local `ariadne:workspace-vault-link` block byte-for-byte.
2. Replace the override's shared body with the complete current `AGENTS.md` body.
3. Append the saved local block unchanged.
4. Run the checker and confirm `codexOverrideOutOfSyncFiles` is empty.
5. Confirm the override remains ignored and unstaged.

## Opt in existing generated vaults

Generated vaults are not rewritten automatically. Migration is scope-local and requires a current-turn named or confirmed research boundary.

1. Inventory the selected boundary and map its sources, compiled notes, questions, synthesis, thread hubs, routing, and instructions.
2. Preserve stable paths and existing structure.
3. Add `research_schema: 1` only when the mapping is unambiguous or confirmed.
4. Apply only allowlisted, meaning-preserving repairs automatically.
5. Run scoped research validation, whole-vault validation, and a second stewardship audit for idempotency.

Legacy pipelines without `research_schema` remain valid until their owner opts in.

## Completion checklist

- `v0.2.0` successor skills are installed.
- Stale copied retired skill folders are removed.
- Saved prompts and external schedulers use active identifiers.
- Generated instruction repairs were marker-bounded.
- `AGENTS.override.md` was fully re-synced when present.
- Representative ingest, synthesis, stewardship, scoped validation, and whole-vault validation passed.
