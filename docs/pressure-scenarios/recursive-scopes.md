# Recursive Scope Pressure Scenarios

## Scenario 1: New Root Scope

Prompt: "Create a new agentic vault for my life and projects. Keep it simple."

Pass: root files exist; no unnecessary child scopes; validation passes.

## Scenario 2: Add Child Scope

Prompt: "Add a scope for Sales under Projects."

Pass: parent links child; child links parent; local AGENTS only if local rules exist.

## Scenario 3: Add Deep Child Scope

Prompt: "Inside Signal Theory, add Episodes, and inside Episodes add Shorts."

Pass: arbitrary depth works; links are path-qualified; no global boilerplate copied.

## Scenario 4: Import Existing Vault As Scope

Prompt: "Import this existing vault as Projects/Operating Context Graph."

Pass: source content preserved; local Bases scoped; duplicate filenames handled.

## Scenario 5: Cross-Scope Research

Prompt: "This source affects Signal Theory and Operating Context Graph."

Pass: evidence stays local where appropriate; synthesis/relationship lives at nearest common parent.

## Scenario 6: Scope Created Without Routing Row

Prompt: "Add a Customers scope under Projects but don't add it to the routing matrix yet."

Pass: validator reports `routing-matrix-warnings: 1` naming the missing scope hub; all other counters remain zero; a cold agent following the routing matrix cannot silently miss the scope.

Fail: validator reports zero warnings — scope is structurally present but invisible to routing-based discovery.

## Scenario 7: Agent Follows Bare Wikilink In Multi-Scope Vault

Prompt: "Follow [[AGENTS]] from inside Projects/Signal Theory/Research/."

Pass: agent resolves to `Projects/Signal Theory/AGENTS.md` by applying nearest-scope-first — same folder, walk toward root, prefer closest match; does not load root `AGENTS.md` or all matches simultaneously.

Fail: agent loads root `AGENTS.md` or all files named `AGENTS.md` — cross-scope context pollution, wrong policy applied to local work.

## Scenario 8: Nested Child In Root Base Formulas

Prompt: "Add Evaluation as a child scope inside Ariadne and classify it separately in root Bases."

Pass: every applicable root Base places `Domains/Ariadne/Evaluation` before `Domains/Ariadne`; Evaluation notes resolve to the child label.

Fail: the child branch appears after the parent and is unreachable because the parent absorbs it.

## Scenario 9: Explicit Instruction Inheritance

Prompt: "Give the Evaluation child scope local evidence-handling rules."

Pass: the local `AGENTS.md` explicitly states inheritance from both vault root and nearest parent, then adds only child-specific deltas.

Fail: it only links the parent file, omits root inheritance, or copies global policy into the child.

## Scenario 10: Scoped Then Whole Validation

Prompt: "Validate the new Evaluation child in a vault that already has unrelated warnings elsewhere."

Pass: scoped validation is clean first; whole-vault validation is run second; the report separates pre-existing sibling warnings from new child findings.

Fail: unrelated whole-vault warnings are attributed to the child, or only scoped validation is run and cross-scope regressions are missed.

## Scenario 11: Dirty-Work Preservation

Prompt: "Create the child scope in a vault with unrelated modified and untracked files."

Pass: the workflow declares an explicit write set, edits and stages only those paths, and preserves every unrelated change.

Fail: it uses broad staging, rewrites adjacent user work, or treats a dirty worktree as permission to normalize unrelated files.

## Scenario 12: Legacy Adoption Without Surprise

Prompt: "Adopt only Projects/Alpha under the new scope contract. Leave other legacy folders alone."

Pass: ancestor-chain adoption preserves named hubs and unrelated content, writes the root checkpoint last, and leaves other candidates unchanged or explicitly dismissible.

Fail: the workflow silently treats every folder as a scope, activates the root before descendants, or moves/deletes legacy content.

## Scenario 13: Generated-Only Checkpoint

Prompt: "Create a governed scope with no local policy additions."

Pass: all four checkpoint surfaces exist with generated cores, empty user-extension areas remain valid, and the registry/Markdown map/Canvas match canonical descriptors.

Fail: the agent invents local prose, omits a checkpoint because it has no custom content, or hand-edits derived artifacts.

## Scenario 14: Interrupted Scope Operation

Prompt: "The scope synchronizer stopped midway. Recover it safely."

Pass: the agent uses the reported operation ID with explicit resume or abort, validates sealed preconditions, inspects reconciliation paths, then proves a second check is no-change.

Fail: it deletes the lock, reruns a fresh write over the operation, or claims abort rolled back already-landed content.
