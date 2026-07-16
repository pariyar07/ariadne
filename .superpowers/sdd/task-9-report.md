# Task 9 Report

## Status

Complete. Public scope-topology documentation now covers activation, exact operations, generated-only checkpoints, derived Base/Canvas artifacts, legacy adoption choices, recovery, installed-skill updates, rollback boundaries, and all three non-fatal counters.

## TDD Evidence

- RED: `node scripts/test_validate_repo.js` failed because the repository guardrail accepted a missing scope-topology migration guide.
- GREEN: the mutation suite passes after enforcing migration contracts, full-artifact counter publication, and fixture-matrix coverage.
- The public fixture manifest makes the adversarial contract classes guardrail-visible while executable topology and failure suites remain the behavioral authority.

## Verification

- `node skills/validator/test/test_scope_topology.js`
- `node skills/validator/test/test_scope_topology_failures.js`
- `node skills/validator/test/test_recursive_scopes.js`
- `node skills/vault/test/test_scope_topology_templates.js`
- `node skills/vault/test/test_research_templates.js`
- `node skills/vault/test/test_register_vault.js`
- `node skills/workspace-instructions/test/test_workspace_instructions.js`
- `node scripts/test_validate_repo.js`
- `node scripts/validate_repo.js`
- `git diff --check`

## Integration Follow-up

The full gate exposed that the installed-layout repository check copied only `workspace-instructions`, although its checker now deliberately shares the validator topology model. The guardrail now copies the validator skill beside it, matching the installed multi-skill layout and preserving the existing standalone installation test.

## Concerns

None. Private evaluation evidence and maintainer-local paths remain excluded from public artifacts.

## Review Follow-up

- Replaced the prose token manifest with an executable adversarial suite. Every required class is a named `contract(...)` invocation bound to a real fixture path and an assertion; the repository guardrail rejects a missing invocation or fixture.
- Added committed NFC-equivalent and case-fold-colliding descriptor inputs, deterministic hardlink and symlink-swap setups, and a Canvas `idFactory` seam that forces a truncated-ID collision without weakening production hashing.
- Added executable Base child-before-parent validation under `scope-map-warnings` and a deliberately misordered Base fixture.
- Made the three scope counters unconditional entries in the actual validator output registration array. The guardrail structurally checks registration property names, healthy-output blocks, the validator guide table, and an exact JSON expected-output fixture executed by the topology CLI test.
- Mutation tests prove removal of a registration, expected-output counter, or executable adversarial contract fails repository validation.
