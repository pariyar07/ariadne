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
