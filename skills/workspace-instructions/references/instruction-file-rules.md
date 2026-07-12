# Instruction-File Audit Rubric

`ariadne:workspace-instructions` audits the workspace instruction files it produces against this rubric, then attests the result in its completion report. Use it when creating new files and when updating older files that predate the rubric.

Two rule groups:

- **A. Open-standard conformance** — the `AGENTS.md` open standard and community lessons from large-scale study of real repositories.
- **B. Agentic cross-runtime portability** — how Codex, Claude Code, Gemini CLI, Hermes, and Ariadne read and share these files.

Each rule is tagged:

- **[M] Mechanical** — a deterministic `check_workspace.js` signal decides it.
- **[J] Judgment** — the skill reads the file and assesses it; no reliable regex exists, so report rather than auto-rewrite.

The rubric is advisory guidance for the skill, not a hard gate. Mechanical signals are facts; the skill still decides what to fix, ask, or leave.

## Group A — Open-standard conformance

| # | Rule | Type | Signal / how to assess |
| --- | --- | --- | --- |
| A1 | Length: aim for <= ~150 lines per shared instruction file; the hard ceiling is 32 KiB (Codex `project_doc_max_bytes`). Past ~150 lines, added text gives diminishing returns and raises inference cost. | [M] | `oversizedForStandardFiles` (>150). `largeInstructionFiles` (>180) marks files that clearly need compaction. |
| A2 | Command-first: the canonical `AGENTS.md` leads with exact runnable commands and flags (`npm test`, `pytest -v`), not prose descriptions. | [M] presence, [J] ordering | `agentsMissingCommandGuidance` flags an `AGENTS.md` with no commands section and no code fence. Assess early placement and exactness by reading. |
| A3 | Specificity: version-pinned stack and project-specific conventions, not generic phrasing ("React project"). | [J] | Read for concrete versions and real conventions an agent could not infer. |
| A4 | Boundaries: explicit three-tier always / ask-first / never rules covering secrets, protected directories, and production configs. | [J] | Read for a boundaries section. |
| A5 | Closure: a stated done/verification check an agent runs before declaring a task complete. | [J] | Read for programmatic done criteria. |
| A6 | Hand-written: project-specific content, not generic LLM boilerplate that states the obvious. Study evidence shows generic files reduce task success. | [J] | Read for filler that any agent would already know. |
| A7 | Placement: one canonical file at the workspace root; nested files only for genuine subprojects with different rules. | [M] | Nested duplication signals (`nestedInstructionDuplicateFiles`). |

## Group B — Agentic cross-runtime portability

| # | Rule | Type | Signal |
| --- | --- | --- | --- |
| B1 | Thin adapters: `CLAUDE.md` / `GEMINI.md` are a short pointer plus `@AGENTS.md`, without duplicating the canonical body. | [M] | `adapterDuplicateFiles` |
| B2 | Override sync: `AGENTS.override.md` is a verbatim copy of the current `AGENTS.md` plus a local `ariadne:workspace-vault-link` block, re-synced on every `AGENTS.md` change. | [M] | `codexOverrideOutOfSyncFiles` |
| B3 | Marker discipline: exactly one well-formed `ariadne:workspace-vault-link` block; no duplicate, malformed, legacy, or foreign-collision markers. | [M] | `duplicateCurrentMarkerFiles`, `malformedMarkerFiles`, `legacyMarkerFiles`, `foreignMarkerFiles` |
| B4 | No private-path leakage in tracked files; private paths belong in gitignored local files. | [M] | `privatePathLeakFiles` |
| B5 | `.gitignore` coverage for every local-only file in a Git workspace. | [M] | `localFilesMissingGitignore`, `trackedLocalOnlyFiles` |
| B6 | `WORKSPACE.md` pointer discipline: when referenced it exists and owns child inventory; `AGENTS.md` stays a pointer plus agent rules. | [M] | `workspaceReferenceMissingFiles`, child-name mention signals |
| B7 | Hermes compatibility: `.hermes.md` / `HERMES.md` are explicit Hermes overrides, not default thin adapters, and must not rely on unsupported `@AGENTS.md` imports. | [M] | `hermesContextFiles`, `hermesShadowsAgentsFiles`, `hermesUnsupportedImportFiles` |

## Attestation

Attest in the completion report only. Do not write attestation markers, badges, compliance blocks, or audit metadata into the user's files — that is non-standard noise and every runtime would read it as instructions.

A report attestation states:

- which rules pass,
- which are flagged,
- for each flagged rule, whether the skill fixed it or left it for the user and why.

## New vs. existing files

- New files: audit before reporting done; attest compliance.
- Existing/older files that predate the rubric: run the same audit on every update. Auto-fix the low-risk mechanical gaps this skill already acts on (override re-sync, `.gitignore` coverage, adapter thinning, private-path relocation, copied-navigation compaction). Report the judgment gaps (A3–A6), Hermes override ambiguity, and oversize/missing-command findings for the user to decide; do not silently rewrite substantive `AGENTS.md` content to satisfy a judgment rule.

## Ask vs. act

- Act: mechanical violation with a clear, low-risk fix (B1–B6 acts already defined in `SKILL.md`).
- Ask: judgment gaps that need substantive `AGENTS.md` rewriting (A3–A6), Hermes overrides that shadow `AGENTS.md` without clear intent, oversize files where compaction could drop real content, or any change whose ownership or intent is unclear.
- Stop: malformed or duplicate markers, more than one vault-link block, or an override edit that would replace shared Codex guidance.

## Sources

- AGENTS.md open standard: <https://agents.md>
- GitHub, "How to write a great agents.md" (2,500+ repositories)
- Codex custom-instructions guide: <https://developers.openai.com/codex/guides/agents-md>
