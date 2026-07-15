# Research Lifecycle Migration

This guide covers the atomic research-skill rename and the opt-in adoption of the versioned research lifecycle. Updating Ariadne changes the installed skill package; it does not silently rewrite copied skills, vault content, workspace instructions, saved prompts, or external automation configuration.

## Release Status

| Milestone | Version |
| --- | --- |
| Effective migration release | **version undecided — pending release planning** |
| Compatibility-adapter removal breaking release | **version undecided — pending release planning** |

These labels are planning placeholders, not published versions. Assign both release versions before publishing the migration release.

## Skill Names

| Retired name | Active successor |
| --- | --- |
| `ariadne:research-intake` | `ariadne:research-ingest` |
| `ariadne:synthesis` | `ariadne:research-synthesis` |

`ariadne:research-stewardship` is the active owner for provenance, compilation coverage, stale synthesis, unresolved inquiry history, and legacy-pipeline drift inside one named research boundary.

The retired skill folders remain narrow forwarding adapters for one compatibility release. They do not duplicate the successor workflows and must be removed in the declared breaking release only after behavioral verification. New documentation, prompts, templates, and instructions should use the active names immediately.

## Update Installed Skills

1. Update or reinstall Ariadne using the same installation method and agent target used originally.
2. Run `npx skills list -g` and confirm the three active research lifecycle skills are installed.
3. Locate copied Ariadne installations for each configured agent. An update tool may copy the active folders without deleting retired folders from an older installation.
4. During the compatibility release, leave the adapters in a current Ariadne install. Remove stale duplicate retired folders only from installations that have been upgraded past the declared adapter-removal breaking release, and only after confirming the path is an installed copy rather than this repository or user-authored content.
5. Re-run a representative ingest, synthesis, and stewardship request before removing any adapter.

Do not treat successful package update output as proof that copied installation directories were cleaned up.

## Update Saved Prompts And External Automation

Repository updates cannot edit prompts copied into chats, commands, CI configuration, launch agents, cron jobs, or external scheduler products. Replace retired identifiers manually in every saved prompt and scheduler after reviewing its target and write boundaries.

The weekly prompt in [Weekly Maintenance Automation](weekly-maintenance-automation.md) begins with this stable marker:

```text
ARIADNE_WEEKLY_MAINTENANCE_PROMPT_VERSION: 1
```

The prompt version is independent of the Ariadne release version. Compare the marker in a saved automation with the public guide; a missing or older marker means the copied prompt needs review. Updating the guide does not update the external scheduler.

## Audit Workspace And Vault Instructions

Run the installed workspace checker from the directory containing its `SKILL.md`:

```bash
node scripts/check_workspace.js "/path/to/workspace" --json
```

From an Ariadne repository checkout, the equivalent command is:

```bash
node skills/workspace-instructions/scripts/check_workspace.js "/path/to/workspace" --json
```

Inspect `retiredResearchSkillNameFiles`, `retiredResearchSkillNamesByFile`, and `retiredResearchSkillNameReplacements`. The checker detects retired identifiers only inside well-formed Ariadne-managed vault-link or global-discovery marker blocks. A safe repair applies the reported exact replacement inside those blocks and preserves every byte outside them.

The checker deliberately does not rewrite ordinary user prose, malformed or duplicate marker blocks, saved prompts, external scheduler configuration, or arbitrary vault notes. Review those surfaces separately. If marker ownership is unclear, stop and ask rather than broad-replacing text.

## Re-sync `AGENTS.override.md`

Codex reads `AGENTS.override.md` instead of `AGENTS.md` at the same directory level; it does not merge them. Whenever tracked `AGENTS.md` changes:

1. Save the complete local `ariadne:workspace-vault-link` block from `AGENTS.override.md`, including its start and end markers, byte-for-byte.
2. Replace the override's copied shared body with the complete current `AGENTS.md` body.
3. Append the saved local block unchanged at the bottom.
4. Run the workspace checker and confirm `codexOverrideOutOfSyncFiles` is empty.
5. Confirm `AGENTS.override.md` remains ignored and unstaged.

Do not patch only the renamed lines in the override. A full-body resync prevents unrelated tracked guidance from remaining stale.

## Opt In Existing Generated Vaults

Generated vaults are not rewritten automatically. Migration is scope-local and requires a current-turn named or confirmed research boundary.

1. Inventory the selected boundary and map its existing sources, compiled notes, questions, synthesis, thread hubs, routing, and instructions.
2. Preserve stable paths and harmless local variation. Adopt existing structure before creating parallel folders.
3. Add a `type: research-boundary` descriptor with `research_schema: 1` only when the mapping is unambiguous or explicitly confirmed.
4. Apply only deterministic, allowlisted link and metadata repairs automatically. Propose moves, renames, template rewrites, evidence-role decisions, and synthesis changes for review.
5. Update generated instruction marker blocks with the stale-name checker workflow above. Review unmarked generated files explicitly; do not assume checker silence means they are current.
6. Run scoped research validation, whole-vault validation, and a second stewardship audit to confirm repair idempotency.

Legacy pipelines without a supported `research_schema` remain valid legacy research until their owner opts in. They do not receive unconditional new-schema warnings.

## Completion Checklist

- Active successor skills are installed and representative requests use them.
- Retired adapters remain only for the declared one-release compatibility window.
- Saved prompts and every external scheduler were reviewed manually.
- Weekly prompts carry the current stable prompt-version marker.
- Generated vault migration was explicitly authorized per boundary.
- Workspace and vault instruction repairs were marker-bounded.
- Any `AGENTS.override.md` body was fully re-synced while its local block remained byte-identical.
- Scoped and whole-vault validation completed after opt-in migration.
