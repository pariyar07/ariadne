# Global Discovery Audit Rubric

`ariadne:global-discovery` audits registry and global adapter state against this rubric, then attests the result in its completion report. Use it when registering a new vault, repairing existing discovery, or running the doctor.

The mechanical layer is the `--doctor` / `--check` mode of `skills/vault/scripts/register_vault.js`. The rubric names what that mode enforces and adds the judgment rules the doctor cannot decide.

Each rule is tagged:

- **[M] Mechanical** — a deterministic `--doctor` signal decides it.
- **[J] Judgment** — the skill reads and assesses it; report rather than auto-rewrite.

## Risk surface — read first

Global discovery files are **machine-local by design**: `~/.ariadne/vaults.json`, `~/.ariadne/vaults.md`, and the per-runtime global adapters (`~/.codex/AGENTS.md`, `~/.claude/CLAUDE.md`, `~/.gemini/GEMINI.md`, and others). Private absolute paths are expected and correct here, so the workspace rules about private-path leakage and shared-vs-local mode do **not** apply. The relevant concerns are registry integrity, block freshness, signpost discipline, and meaningful metadata.

**Per-session cost.** The `ariadne:vault-discovery` adapter block is concatenated into the context of every agent session in every workspace, because global agent files load at session start ([Claude Code](https://code.claude.com/docs/en/memory), [Gemini CLI](https://geminicli.com/docs/cli/gemini-md/), Codex). Rules B3 (size) and B4 (no duplicates) directly protect that recurring cost. The doctor, this rubric, and `SKILL.md` are on-demand and add nothing to per-session cost.

## Group A — Registry integrity and freshness

| # | Rule | Type | Signal |
| --- | --- | --- | --- |
| A1 | `~/.ariadne/vaults.json` exists and parses. | [M] | `Registry JSON missing` |
| A2 | `~/.ariadne/vaults.md` is in sync with the JSON registry. | [M] | `Registry Markdown is stale` |
| A3 | The primary vault is actually registered. | [M] | `Primary vault is not registered` |
| A4 | Every registered vault path exists on disk. | [M] | `Vault path missing` |
| A5 | Registered entrypoints exist in the vault, and detected root entrypoints are registered. | [M] | `Registered entrypoint missing`, `Detected entrypoint is not registered` |

## Group B — Global adapter signpost discipline

| # | Rule | Type | Signal |
| --- | --- | --- | --- |
| B1 | Each selected adapter file has the `ariadne:vault-discovery` marker block. | [M] | `Adapter file missing marker block` |
| B2 | The adapter block still contains the current discovery rule phrases (registry pointer, cold-start entry order, action-prompt guard, empty-directory guard, multiple-match and target-scope confirmation guards). | [M] | `Adapter block has stale <rule>` |
| B3 | The adapter block stays a small signpost (<= 4 KB). Loaded every session, so bloat is paid everywhere. | [M] | `Adapter discovery block is oversized, not a small signpost` |
| B4 | Exactly one adapter block per file; no duplicate blocks. A duplicate silently doubles the per-session cost. | [M] | `Adapter file has duplicate discovery block` |
| B5 | The block points to `~/.ariadne/vaults.md` and never becomes the source of truth for vault navigation; it must not copy cold-start entry orders, scope catalogs, or destination maps. | [J] | Read the block; the vault owns navigation. |

## Group C — Metadata quality

| # | Rule | Type | Signal |
| --- | --- | --- | --- |
| C1 | Each registered vault has a meaningful name and a specific purpose statement, not an empty or generic placeholder. | [J] | Read `vaults.md`; a vague purpose makes multi-vault disambiguation unreliable. |

## Attestation

Attest in the completion report only. Do not write attestation markers, badges, or audit metadata into the registry files or the global adapter blocks — those blocks load into every session and any extra content is paid per invocation and read as instructions.

A report attestation states which rules pass, which are flagged, and for each flagged rule whether the skill fixed it (by re-running registration) or left it for the user and why.

## New vs. existing registrations

- New registration: run the doctor after writing; attest compliance.
- Existing/older registrations: run the doctor on every repair. The mechanical fixes (A1–A5, B1–B4) are all repaired by **re-running registration for the affected vault**, which regenerates the registry Markdown and replaces the adapter block in place. Report the judgment findings (B5, C1) for the user to decide; do not silently rewrite a user-edited block beyond the marker region.

## Ask vs. act

- Act: re-run registration to repair any mechanical finding (A1–A5, B1–B4). This is idempotent and marker-scoped.
- Ask: judgment findings (B5 block has become a navigation dump, C1 purpose is too vague to disambiguate) that need the user's intent.
- Stop: never write global agent files without opt-in; never edit outside the `ariadne:vault-discovery` markers.

## Sources

- Registration/doctor script: `skills/vault/scripts/register_vault.js`
- Global agent file loading: [Claude Code memory](https://code.claude.com/docs/en/memory), [Gemini CLI GEMINI.md](https://geminicli.com/docs/cli/gemini-md/), [Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
