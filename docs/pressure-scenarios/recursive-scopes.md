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
