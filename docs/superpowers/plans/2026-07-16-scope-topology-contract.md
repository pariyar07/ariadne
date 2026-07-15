# Deterministic Nested Scope Topology Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a dependency-free, deterministic nested-scope contract with canonical Markdown descriptors, stable generated wayfinding, scoped validation, recoverable single-writer synchronization, and non-destructive legacy adoption.

**Architecture:** The validator skill owns one dependency-free topology engine used by both validation and mutation, preventing validator/synchronizer drift. The engine inventories the whole vault into an immutable model, derives stable findings and expected artifacts, and applies declarative schema-v1 operation requests through a lock, precondition hashes, an append-safe recovery manifest, same-directory atomic replacements, and explicit resume/abort. Scope, navigation, maintenance, vault, and workspace-instruction skills orchestrate that engine but never reproduce its topology logic.

**Tech Stack:** CommonJS Node.js using built-in `fs`, `path`, `crypto`, and `os`; Markdown and Obsidian wikilinks; Obsidian Bases YAML; JSON Canvas; dependency-free Node test runners.

## Global Constraints

- Preserve unrelated worktree changes and stage explicit paths only.
- Public files must contain no private vault content, private eval details, maintainer-local absolute paths, secrets, client data, or personal workflow defaults.
- The validator and synchronizer remain dependency-free, deterministic, and read-only in validation/check modes.
- Strict topology activates only through a valid root `00 Index.md` schema-v1 descriptor.
- Every adopted scope retains all four checkpoint files; generated-only checkpoints link inherited policy and never copy it.
- Markdown is canonical. Bases, Markdown maps, Canvas, and audit reports are derived.
- Paths and titles normalize to Unicode NFC. Generated output is UTF-8 without BOM, LF-only, deterministic, and ends with one newline.
- No mutation may proceed without an exact declarative operation request and content `allowed_write_paths`.
- Lock and manifest control files are engine-owned control paths, not implicit permission to mutate other vault content.
- Never steal a stale lock automatically. Resume and abort require the matching operation ID and valid current hashes.
- All new validator counters are non-fatal and must satisfy the repository full-artifact rule.
- Do not push or merge without explicit user direction after verification.

## File Structure

Create focused modules under `skills/validator/scripts/scope-topology/`:

- `schema.js` — schema-v1 parsing, Unicode/path normalization, lifecycle and redirect validation.
- `inventory.js` — safe whole-vault file discovery and canonical descriptor/candidate inventory.
- `model.js` — immutable topology, nearest-ancestor relationships, ordering, lifecycle invariants.
- `findings.js` — stable structured findings, counters, deterministic filtering and formatting.
- `markers.js` — exact standalone marker parsing and outside-byte preservation.
- `render.js` — checkpoint blocks, registry, Markdown tree, Canvas, serializers and collision checks.
- `operations.js` — operation-request schema and desired-state planning.
- `synchronizer.js` — check/write/resume/abort, locks, manifests, preconditions and atomic replacements.
- `index.js` — public module exports consumed by both CLIs.

Keep `validate_vault.js` as the validator CLI and add `sync_scope_topology.js` beside it. This places the shared engine inside the validator skill, which is already a required companion of scope operations, and avoids duplicated topology implementations across skills.

---

### Task 1: Establish the pure topology module contract

**Files:**
- Create: `skills/validator/scripts/scope-topology/schema.js`
- Create: `skills/validator/scripts/scope-topology/inventory.js`
- Create: `skills/validator/scripts/scope-topology/model.js`
- Create: `skills/validator/scripts/scope-topology/index.js`
- Create: `skills/validator/test/test_scope_topology.js`
- Create: `skills/validator/test/fixtures/scope_topology/root_only/**`
- Create: `skills/validator/test/fixtures/scope_topology/deep_transparent_ancestry/**`
- Create: `skills/validator/test/fixtures/scope_topology/pending_without_root/**`
- Create: `skills/validator/test/fixtures/scope_topology/unsupported_root/**`

**Interfaces:**
- Produces `normalizeNfc(value)`, `normalizeScopePath(value)`, `parseScopeDescriptor(file, frontmatter)`, `inventoryVault(vaultRoot)`, and `buildTopology(inventory)`.
- `buildTopology` returns `{ active, descriptors, descriptorsById, childrenById, candidates, pendingDescriptors }`; `active` is true only for a valid schema-v1 root.
- Inventory records relative lexical path, canonical real path, `lstat`, link count, raw bytes, parsed frontmatter, and content hash for every relevant file.

- [ ] **Step 1: Write red tests for recognition and activation**

```js
const assert = require("assert");
const { inventoryVault, buildTopology } = require("../scripts/scope-topology");

const rootOnly = buildTopology(inventoryVault(fixture("root_only")));
assert.strictEqual(rootOnly.active, true);
assert.deepStrictEqual([...rootOnly.descriptorsById.keys()], ["root"]);

const pending = buildTopology(inventoryVault(fixture("pending_without_root")));
assert.strictEqual(pending.active, false);
assert.strictEqual(pending.descriptors.size, 0);
assert.strictEqual(pending.pendingDescriptors.length, 1);
```

- [ ] **Step 2: Run the new test and verify the missing-module failure**

Run: `node skills/validator/test/test_scope_topology.js`

Expected: non-zero exit containing `Cannot find module '../scripts/scope-topology'`.

- [ ] **Step 3: Implement schema and inventory primitives**

Implement strict scalar/flat-list schema-v1 parsing, NFC normalization, root recognition, exact `00 Index.md` recognition, candidate dismissal, canonical containment, case-fold collision data, and deterministic file ordering. Reject control characters, traversal, absolute paths, Windows reserved segments, non-regular descriptor files, and unsupported nested schema values.

- [ ] **Step 4: Implement topology construction**

Resolve IDs, current paths, nearest adopted physical ancestors, transparent folders, direct children, pending descriptors, unsupported root state, and deterministic sibling order `(scope_order, normalized title code points, scope_id)` without reading derived artifacts.

- [ ] **Step 5: Run focused and legacy tests**

Run: `node skills/validator/test/test_scope_topology.js && node skills/validator/test/test_recursive_scopes.js`

Expected: both commands exit 0 and existing counters remain unchanged.

- [ ] **Step 6: Commit the pure model**

```bash
git add skills/validator/scripts/scope-topology skills/validator/test/test_scope_topology.js skills/validator/test/fixtures/scope_topology
git commit -m "feat: add deterministic scope topology model"
```

### Task 2: Add stable scope findings and scoped filtering

**Files:**
- Create: `skills/validator/scripts/scope-topology/findings.js`
- Modify: `skills/validator/scripts/validate_vault.js`
- Modify: `skills/validator/test/test_scope_topology.js`
- Create: `skills/validator/test/fixtures/scope_topology/contract_failures/**`
- Create: `skills/validator/test/fixtures/scope_topology/scoped_sibling_isolation/**`

**Interfaces:**
- Produces `finding({ code, origin, obligations, scopeIds, message, discriminator })`, `scopeFindings(topology, inventory)`, and `filterFindingsByScope(findings, targetScopeId)`.
- A finding is `{ code, finding_id, origin, obligations, scope_ids, message, sort_key }`.
- `finding_id` is SHA-256 over canonical structural fields, not message text.

- [ ] **Step 1: Add red tests for finding stability and literal-subset filtering**

```js
const whole = scopeFindings(model, inventory);
const scoped = filterFindingsByScope(whole, "healthy-child");
assert.ok(scoped.every((item) => whole.some((candidate) => candidate.finding_id === item.finding_id)));
assert.deepStrictEqual(scoped.map((item) => item.finding_id), [...scoped].sort(bySortKey).map((item) => item.finding_id));
```

- [ ] **Step 2: Run and verify failures for missing findings APIs and counters**

Run: `node skills/validator/test/test_scope_topology.js`

Expected: non-zero exit naming `scopeFindings` or missing scope counters.

- [ ] **Step 3: Implement contract findings**

Cover invalid schema, duplicate/colliding IDs and paths, skipped ancestors, missing checkpoint files, lifecycle violations, malformed redirects, reserved former paths, marker drift, pending adoption, unsupported root, and dismissed candidates. Map them only to `scope-adoption-warnings`, `scope-contract-warnings`, or `scope-map-warnings` while leaving existing counters authoritative for existing concerns.

- [ ] **Step 4: Add `--profile scope` to the validator CLI**

Accept whole-vault `--profile scope` and `--scope <path> --profile scope`. Resolve the target path to one canonical adopted scope ID, inventory once, append scope findings to the whole-vault set, then filter by obligations/scope IDs. Do not change no-flag or research-profile behavior.

- [ ] **Step 5: Verify exact stdout, IDs, counters and sibling isolation**

Run: `node skills/validator/test/test_scope_topology.js && node skills/validator/test/test_recursive_scopes.js`

Expected: all tests pass; scoped scope-profile finding IDs are a literal subset of whole-vault IDs.

- [ ] **Step 6: Commit validator integration**

```bash
git add skills/validator/scripts/scope-topology/findings.js skills/validator/scripts/validate_vault.js skills/validator/test
git commit -m "feat: validate versioned scope topology"
```

### Task 3: Render deterministic checkpoint and map artifacts

**Files:**
- Create: `skills/validator/scripts/scope-topology/markers.js`
- Create: `skills/validator/scripts/scope-topology/render.js`
- Modify: `skills/validator/scripts/scope-topology/index.js`
- Modify: `skills/validator/test/test_scope_topology.js`
- Create: `skills/validator/test/fixtures/scope_topology/generated_artifacts/**`
- Create: `skills/validator/test/fixtures/scope_topology/marker_preservation/**`

**Interfaces:**
- Produces `replaceMarkerBlock(bytes, markerName, generatedBody)`, `renderCheckpointBlocks(model)`, `renderScopeRegistry(model)`, `renderScopeMapMarkdown(model)`, and `renderScopeMapCanvas(model)`.
- Render results are `{ path, bytes, reason, owner }` and never write files.

- [ ] **Step 1: Add red golden and mutation tests**

Assert exact checkpoint blocks, two Base views only, tree bytes, normalized Canvas semantics, deterministic positions, status colors, stable IDs, and preservation of every byte outside standalone marker lines. Include CRLF/BOM input and marker-like prose/code.

- [ ] **Step 2: Run and confirm rendering tests fail**

Run: `node skills/validator/test/test_scope_topology.js`

Expected: failures naming missing render functions.

- [ ] **Step 3: Implement exact marker ownership**

Recognize only exact standalone start/end lines; reject missing, duplicate, nested, reversed, or mixed marker pairs. Preserve outside bytes. Require explicit whole-file normalization authorization before changing BOM or newline style outside a managed block.

- [ ] **Step 4: Implement artifact renderers**

Generate four minimal checkpoint cores, two-view `Scope Registry.base`, marker-managed `Scope Map.md`, and fully generated JSON Canvas. Use built-in SHA-256, fixed sizes/colors/coordinates, collision refusal across fixed/node/edge IDs, stable key order, two-space JSON, and one final newline.

- [ ] **Step 5: Make validator map findings semantic**

Parse Base and Canvas values before comparison so formatting-only differences do not warn. Compare Markdown marker content exactly. Report extra/stale nodes, edges, paths, positions, IDs, registry views and filters through stable scope-map findings.

- [ ] **Step 6: Run focused tests twice for byte stability**

Run: `node skills/validator/test/test_scope_topology.js && node skills/validator/test/test_scope_topology.js`

Expected: identical passing output from both runs.

- [ ] **Step 7: Commit rendering**

```bash
git add skills/validator/scripts/scope-topology skills/validator/test
git commit -m "feat: render deterministic scope wayfinding"
```

### Task 4: Define declarative topology operations

**Files:**
- Create: `skills/validator/scripts/scope-topology/operations.js`
- Modify: `skills/validator/scripts/scope-topology/index.js`
- Modify: `skills/validator/test/test_scope_topology.js`
- Create: `skills/validator/test/fixtures/scope_topology/operations/**`

**Interfaces:**
- Produces `parseOperationRequest(json)`, `planOperation(inventory, model, request)`, and `hashPlan(plan)`.
- Request schema is `{ operation_schema: 1, operation, target_scope_id, source_path?, destination_path?, desired_status?, replacement_scope_id?, adoption_mode?, normalize_files?: [], allowed_write_paths: [] }`.
- Supported operations are `create`, `adopt`, `move`, `set-status`, and `repair`; `adoption_mode` is `whole-vault` or `ancestor-chain` when required.
- The request documents desired state and write authorization evidence; it never bypasses validation.

- [ ] **Step 1: Add red request and state-transition tests**

Test missing/extra fields, duplicate allowed paths, unauthorized derived artifacts, generated-only create, progressive/whole adoption, move collisions, former-path reservation, physical reparenting, and every allowed/refused lifecycle transition.

- [ ] **Step 2: Run and confirm request parsing fails**

Run: `node skills/validator/test/test_scope_topology.js`

Expected: missing `parseOperationRequest`/`planOperation` failures.

- [ ] **Step 3: Implement closed request parsing**

Reject unknown operation types, schema versions, absolute/traversal paths, duplicate normalized write paths, missing operation-specific fields, and request targets inconsistent with inventory. Normalize request values before hashing.

- [ ] **Step 4: Implement deterministic desired-state planning**

Return an ordered plan containing preconditions, descriptor/checkpoint/map replacements, move source/destination effects, redirect schema-v1 bytes, lifecycle checks, Base-formula proposals, and exact content write paths. Root activation is the final canonical replacement during adoption.

- [ ] **Step 5: Verify no implicit Base-formula rewrites**

Recognize only supported root `file.inFolder` formula shapes. Include each proposed Base path in `allowed_write_paths`; otherwise report a proposal and refuse write mode rather than editing arbitrary YAML.

- [ ] **Step 6: Commit operation planning**

```bash
git add skills/validator/scripts/scope-topology/operations.js skills/validator/scripts/scope-topology/index.js skills/validator/test
git commit -m "feat: plan declarative scope operations"
```

### Task 5: Implement recoverable single-writer synchronization

**Files:**
- Create: `skills/validator/scripts/scope-topology/synchronizer.js`
- Create: `skills/validator/scripts/sync_scope_topology.js`
- Modify: `skills/validator/scripts/scope-topology/index.js`
- Modify: `skills/validator/test/test_scope_topology.js`
- Create: `skills/validator/test/test_scope_topology_failures.js`

**Interfaces:**
- CLI: `sync_scope_topology.js VAULT --check [--scope PATH]`.
- CLI: `sync_scope_topology.js VAULT --write --request REQUEST.json`.
- CLI: `sync_scope_topology.js VAULT --resume OPERATION_ID` and `--abort OPERATION_ID`.
- Produces `checkTopology`, `applyOperation`, `resumeOperation`, and `abortOperation`.
- Control paths are `.ariadne/scope-topology.lock` and `.ariadne/scope-topology-operation.json`.

- [ ] **Step 1: Add red zero-write and failure-injection tests**

Hash the complete fixture before/after check mode. Add injection after lock, manifest creation, every temporary write, every rename, activation, derived regeneration, and final check. Add two-process live-lock, stale-lock, and changed-precondition cases.

- [ ] **Step 2: Run and confirm the CLI is absent**

Run: `node skills/validator/test/test_scope_topology_failures.js`

Expected: non-zero exit because `sync_scope_topology.js` does not exist.

- [ ] **Step 3: Implement lock and manifest state machines**

Create the lock with exclusive creation. Record operation ID, normalized request hash, plan hash, phase, allowed content paths, preconditions, expected outputs, completed replacements, activation state, timestamps, and temporary paths. Refuse live/stale conflicts; never infer staleness as permission to steal.

- [ ] **Step 4: Implement safe replacement**

For each target: re-run `lstat`, containment, link-count and identity checks; verify precondition hash; create mode-`0600` same-directory temporary regular files; flush/close; rename; then durably advance the manifest. Refuse hardlinks, symlink targets/swaps, destination collisions and changed inputs.

- [ ] **Step 5: Implement explicit recovery**

Resume validates operation/request/plan hashes and every completed/current output before continuing. Abort deletes only untouched temporaries and control state, never rolls back completed canonical writes, and prints exact reconciliation paths. A second check must propose zero changes before success.

- [ ] **Step 6: Run all failure boundaries and repeatability tests**

Run: `node skills/validator/test/test_scope_topology_failures.js && node skills/validator/test/test_scope_topology.js`

Expected: all tests pass, no unaccounted partial writes, and no residual lock/temporary files after successful completion.

- [ ] **Step 7: Commit synchronization**

```bash
git add skills/validator/scripts/scope-topology skills/validator/scripts/sync_scope_topology.js skills/validator/test
git commit -m "feat: synchronize scope topology safely"
```

### Task 6: Bootstrap the root topology contract in vault templates

**Files:**
- Modify: `skills/vault/assets/templates/00 Index.md`
- Modify: `skills/vault/assets/templates/AGENTS.md`
- Modify: `skills/vault/assets/templates/Agent Navigation.md`
- Modify: `skills/vault/assets/templates/Task Routing Matrix.md`
- Create: `skills/vault/assets/templates/Scope Registry.base`
- Create: `skills/vault/assets/templates/Scope Map.md`
- Create: `skills/vault/assets/templates/Scope Map.canvas`
- Modify: `skills/vault/assets/templates/Bases Index.md`
- Modify: `skills/vault/SKILL.md`
- Modify: `skills/vault/test/test_research_templates.js`
- Create: `skills/vault/test/test_scope_topology_templates.js`

**Interfaces:**
- New vault templates produce one valid active root and the exact initial generated artifacts accepted by the shared topology engine.

- [ ] **Step 1: Add a generated-vault red test**

Copy templates into a temporary vault, run `validate_vault.js TEMP --profile scope`, and assert all three scope counters are zero plus exact registry/tree/Canvas artifacts.

- [ ] **Step 2: Run and verify missing root metadata/artifact failures**

Run: `node skills/vault/test/test_scope_topology_templates.js`

Expected: non-zero with missing schema-v1 root and global artifacts.

- [ ] **Step 3: Update the four root checkpoint templates**

Add valid root frontmatter and generated marker cores while preserving user extension areas and existing root workflows. Do not duplicate policy inside the inheritance block.

- [ ] **Step 4: Add exact root-only derived templates**

Generate the two-view registry, root-only Markdown tree, root Canvas and Bases index link from the renderer’s expected bytes rather than hand-maintaining a second format.

- [ ] **Step 5: Run template and validator suites**

Run: `node skills/vault/test/test_scope_topology_templates.js && node skills/vault/test/test_research_templates.js && node skills/validator/test/test_scope_topology.js`

Expected: all pass.

- [ ] **Step 6: Commit bootstrap templates**

```bash
git add skills/vault
git commit -m "feat: bootstrap root scope topology"
```

### Task 7: Route scope lifecycle and maintenance through the synchronizer

**Files:**
- Modify: `skills/scope/SKILL.md`
- Create: `skills/scope/references/scope-operation-request.md`
- Modify: `skills/navigation/SKILL.md`
- Modify: `skills/maintenance/SKILL.md`
- Modify: `skills/validator/SKILL.md`
- Modify: `skills/vault/references/recursive-scopes.md`

**Interfaces:**
- Skills emit the exact schema-v1 request accepted by `parseOperationRequest` and invoke the validator-owned CLI.
- Audit/check behavior is always zero-write; create/adopt/move/status/repair requires current-turn target confirmation and disclosed `allowed_write_paths`.

- [ ] **Step 1: Add repository assertions for one topology authority**

Extend guardrails to require all topology-changing skills to route to `sync_scope_topology.js` and prohibit alternate mutation scripts or prose-only direct edits to generated blocks.

- [ ] **Step 2: Rewrite scope orchestration**

Document promotion threshold, generated-only checkpoints, request construction, confirmation, preview, lifecycle transitions, physical move/reparent behavior, redirects, resume/abort, both validation passes, and second-check idempotency.

- [ ] **Step 3: Rewrite navigation and maintenance ownership**

Navigation edits user extension areas only. Maintenance audits candidates, respects `ariadne_scope_adoption: dismissed`, offers whole-vault versus ancestor-chain adoption, emits evidence-backed cleanup recommendations, and routes approved repairs through the engine.

- [ ] **Step 4: Document validator/synchronizer CLI and recovery output**

Include complete request examples with generic `/path/to/vault` placeholders, exact refusal behavior, and the distinction between content write paths and engine control paths.

- [ ] **Step 5: Run skill guardrails**

Run: `node scripts/validate_repo.js --skills-only`

Expected: exit 0 with no placeholder skill folders, private paths, alternate topology mutation authority, or missing metadata.

- [ ] **Step 6: Commit skill orchestration**

```bash
git add skills/scope skills/navigation skills/maintenance skills/validator skills/vault/references scripts/validate_repo.js scripts/test_validate_repo.js
git commit -m "docs: route scope operations through synchronizer"
```

### Task 8: Add workspace identity and stale-path checks

**Files:**
- Modify: `skills/workspace-instructions/scripts/check_workspace.js`
- Modify: `skills/workspace-instructions/test/test_workspace_instructions.js`
- Create: `skills/workspace-instructions/test/fixtures/scope_identity_current/scenario.json`
- Create: `skills/workspace-instructions/test/fixtures/scope_identity_stale_path/scenario.json`
- Modify: `skills/workspace-instructions/SKILL.md`
- Modify: `skills/workspace-instructions/references/instruction-file-rules.md`

**Interfaces:**
- Marker-managed workspace links may declare stable `scope_id` and current `scope_path`; checks report a stale path without rewriting user-owned text or replacing vault-local navigation.

- [ ] **Step 1: Add red current/stale marker scenarios**

Assert exact scope ID/path parsing, clean current links, stale-path diagnostics, unknown-ID diagnostics, and preservation outside Ariadne markers.

- [ ] **Step 2: Run and verify stale paths are not detected**

Run: `node skills/workspace-instructions/test/test_workspace_instructions.js`

Expected: new stale-path scenario fails.

- [ ] **Step 3: Implement bounded checks and repair guidance**

Inspect only marker-managed workspace-vault-link content. Report the stable ID/current path pair and recommend confirmed bounded repair; do not read or mutate arbitrary workspace prose.

- [ ] **Step 4: Run workspace and repository tests**

Run: `node skills/workspace-instructions/test/test_workspace_instructions.js && node scripts/test_validate_repo.js`

Expected: both pass.

- [ ] **Step 5: Commit workspace integration**

```bash
git add skills/workspace-instructions scripts
git commit -m "feat: detect stale scope workspace links"
```

### Task 9: Complete public fixtures, migration guidance and counter documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/guides/quickstart.md`
- Modify: `docs/guides/validator.md`
- Modify: `docs/guides/weekly-maintenance-automation.md`
- Create: `docs/guides/scope-topology-migration.md`
- Modify: `docs/pressure-scenarios/recursive-scopes.md`
- Modify: `AGENTS.md`
- Modify: `scripts/validate_repo.js`
- Modify: `scripts/test_validate_repo.js`
- Expand: `skills/validator/test/fixtures/scope_topology/**`

**Interfaces:**
- Public docs explain activation, generated-only checkpoints, exact operations, recovery, migration and the three non-fatal counters without exposing private eval implementation.

- [ ] **Step 1: Add guardrail tests for the full-artifact rule**

Require each new counter in validator output registration, validator skill healthy output, validator guide, README and fixtures. Require migration docs and reject maintainer-local paths/private eval evidence.

- [ ] **Step 2: Complete the adversarial fixture matrix**

Cover flexible layouts, transparent folders, deep ancestry, markers, lifecycle, moves, redirects, former paths, generated artifacts, unsupported activation, dismissal, Unicode/case collisions, control/reserved paths, hardlinks, symlink swaps, Canvas ID collisions, Base formula ordering and scoped isolation.

- [ ] **Step 3: Write migration and operating guidance**

Document no-surprise legacy behavior, candidate dismissal, whole-vault versus ancestor-chain adoption, root activation last, interrupted-operation recovery, installed-skill update expectations, and rollback/reconciliation boundaries.

- [ ] **Step 4: Update README and healthy output**

Add the three counters, scope-profile examples, synchronizer examples and concise explanation that Base/Canvas are derived. Update outdated validator check counts wherever present.

- [ ] **Step 5: Run all public checks**

Run:

```bash
node skills/validator/test/test_scope_topology.js
node skills/validator/test/test_scope_topology_failures.js
node skills/validator/test/test_recursive_scopes.js
node skills/vault/test/test_scope_topology_templates.js
node skills/vault/test/test_research_templates.js
node skills/vault/test/test_register_vault.js
node skills/workspace-instructions/test/test_workspace_instructions.js
node scripts/test_validate_repo.js
node scripts/validate_repo.js
```

Expected: every command exits 0.

- [ ] **Step 6: Commit public documentation and fixtures**

```bash
git add README.md AGENTS.md docs skills/validator/test scripts
git commit -m "docs: publish scope topology contract"
```

### Task 10: Release-gate verification and handoff

**Files:**
- Review all changed public files; do not add private eval artifacts to this repository.

**Interfaces:**
- Produces a candidate commit that is structurally complete but is not release-ready until the separately maintained private scope-topology eval gate passes.

- [ ] **Step 1: Run the complete public verification suite from a clean candidate tree**

Run all commands from Task 9 plus `node scripts/validate_repo.js --skills-only`.

Expected: all exit 0 and the second synchronizer check is no-change for every write fixture.

- [ ] **Step 2: Audit dependency and boundary constraints**

Run: `rg -n "require\\(\"(?!fs|path|crypto|os|assert|child_process)[^\"]+" skills/validator/scripts skills/validator/test`

Expected: no external runtime dependencies in new topology modules. Inspect any regex-engine incompatibility manually if the local `rg` lacks lookahead support.

- [ ] **Step 3: Audit diffs and generated artifacts**

Inspect `git status --short`, `git diff --check`, `git diff`, and generated fixture hashes. Confirm no private paths, eval contracts, local instruction files, unrelated changes, temporary operations, or locks are staged.

- [ ] **Step 4: Run the separate private release gate**

Use the private eval repository’s scope-topology implementation plan against the exact candidate commit. Record only pass/fail and generic verification categories in public release notes; keep contracts, graders, canaries, transcripts and fixture internals private.

- [ ] **Step 5: Request full code review and fix all in-scope findings**

Use `superpowers:requesting-code-review`, then rerun focused and full suites after fixes.

- [ ] **Step 6: Prepare publication without pushing or merging**

Stage explicit public paths, create coherent commits if directed, and report exact test evidence, remaining risks and private-gate status. Wait for explicit push/PR/merge direction.
