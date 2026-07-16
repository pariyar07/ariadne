#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  buildTopology,
  filterFindingsByScope,
  finding,
  inventoryVault,
  normalizeNfc,
  normalizeScopePath,
  parseScopeDescriptor,
  parseOperationRequest,
  planOperation,
  hashPlan,
  replaceMarkerBlock,
  renderCheckpointBlocks,
  renderScopeRegistry,
  renderScopeMapMarkdown,
  renderScopeMapCanvas,
  scopeFindings,
  checkTopology,
  applyOperation,
} = require("../scripts/scope-topology");
const { spawnSync } = require("child_process");
require("./test_scope_topology_adversarial");

function fixture(name) {
  return path.join(__dirname, "fixtures", "scope_topology", name);
}

function bySortKey(left, right) {
  return Buffer.from(left.sort_key).compare(Buffer.from(right.sort_key));
}

const operationFixture = (name) => JSON.parse(fs.readFileSync(fixture(`operations/${name}.json`), "utf8"));

assert.throws(() => parseOperationRequest({}), /missing field/u);
assert.throws(() => parseOperationRequest({ ...operationFixture("repair"), surprise: true }), /unknown field/u);
assert.throws(() => parseOperationRequest({ ...operationFixture("repair"), operation_schema: 2 }), /operation_schema/u);
assert.throws(() => parseOperationRequest({ ...operationFixture("repair"), operation: "delete" }), /unsupported operation/u);
assert.throws(() => parseOperationRequest({ ...operationFixture("repair"), allowed_write_paths: ["Agent/Scope Map.md", "Agent/./Scope Map.md"] }), /duplicate normalized/u);
assert.throws(() => parseOperationRequest({ ...operationFixture("repair"), allowed_write_paths: ["/tmp/out"] }), /vault-relative/u);
assert.throws(() => parseOperationRequest({ ...operationFixture("move"), destination_path: "../outside" }), /traversal/u);
assert.throws(() => parseOperationRequest({ ...operationFixture("move"), source_path: undefined }), /requires source_path/u);

const parsedRepair = parseOperationRequest(operationFixture("repair"));
assert(Object.isFrozen(parsedRepair));
assert.deepStrictEqual(parsedRepair.allowed_write_paths, [...parsedRepair.allowed_write_paths].sort((a, b) => Buffer.from(a).compare(Buffer.from(b))));
assert.strictEqual(hashPlan({ b: 2, a: 1 }), hashPlan({ a: 1, b: 2 }));

const operationInventory = inventoryVault(fixture("deep_transparent_ancestry"));
const operationModel = buildTopology(operationInventory);
assert.ok(checkTopology(fixture("deep_transparent_ancestry")).changes.length > 0);
function planWithDisclosedWrites(inventory, model, request) {
  const preview = planOperation(inventory, model, parseOperationRequest({ ...request, allowed_write_paths: [] }));
  assert.strictEqual(preview.write_authorized, false);
  if (preview.content_write_paths.length) assert.ok(preview.refusals.some((item) => item.code === "missing-write-authorization"));
  return planOperation(inventory, model, parseOperationRequest({ ...request, allowed_write_paths: preview.content_write_paths }));
}

const repairPreview = planOperation(operationInventory, operationModel, parsedRepair);
assert.strictEqual(repairPreview.write_authorized, false);
assert.ok(repairPreview.refusals.some((item) => item.code === "missing-write-authorization" && item.path === "Agent/Scope Map.canvas"));
const repairPlan = planOperation(operationInventory, operationModel, parseOperationRequest({ ...operationFixture("repair"), allowed_write_paths: repairPreview.content_write_paths }));
assert.deepStrictEqual(repairPlan.content_write_paths, [...repairPlan.content_write_paths].sort((a, b) => Buffer.from(a).compare(Buffer.from(b))));
assert.ok(repairPlan.replacements.some((item) => item.path === "Agent/Scope Map.md"));
assert.strictEqual(repairPlan.write_authorized, true);
const unusedAuthorization = planOperation(operationInventory, operationModel, parseOperationRequest({ ...operationFixture("repair"), allowed_write_paths: [...repairPlan.content_write_paths, "Unused.md"] }));
assert.strictEqual(unusedAuthorization.write_authorized, false);
assert.ok(unusedAuthorization.refusals.some((item) => item.code === "unused-write-authorization" && item.path === "Unused.md"));
const normalizationVault = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-normalization-deferred-"));
fs.cpSync(fixture("deep_transparent_ancestry"), normalizationVault, { recursive: true });
fs.writeFileSync(path.join(normalizationVault, "User.md"), Buffer.from([0x75, 0x73, 0x65, 0x72, 0x0a, 0x80]));
const normalizationInventory = inventoryVault(normalizationVault); const normalizationModel = buildTopology(normalizationInventory);
const normalizationRequest = { ...operationFixture("repair"), normalize_files: ["User.md"], allowed_write_paths: [] };
const normalizationPlan = planOperation(normalizationInventory, normalizationModel, parseOperationRequest(normalizationRequest));
assert.ok(!normalizationPlan.content_write_paths.includes("User.md"));
assert.deepStrictEqual(normalizationPlan.normalization_proposals, [{ path: "User.md", authorized: false, action: "normalization deferred" }]);
assert.ok(normalizationPlan.refusals.some((item) => item.code === "normalization-deferred" && item.path === "User.md"));
assert.strictEqual(normalizationPlan.write_authorized, false);
const userBefore = fs.readFileSync(path.join(normalizationVault, "User.md"));
assert.throws(() => applyOperation(normalizationVault, normalizationRequest), /normalization-deferred/u);
assert.deepStrictEqual(fs.readFileSync(path.join(normalizationVault, "User.md")), userBefore);
fs.rmSync(normalizationVault, { recursive: true, force: true });
assert.strictEqual(hashPlan(repairPlan), hashPlan(planOperation(operationInventory, operationModel, parseOperationRequest({ ...operationFixture("repair"), allowed_write_paths: repairPreview.content_write_paths }))));

assert.throws(() => parseOperationRequest({ ...operationFixture("repair"), replacement_scope_id: "alpha" }), /replacement_scope_id is not valid/u);
assert.throws(() => parseOperationRequest({ ...operationFixture("set-status"), desired_status: "archived", replacement_scope_id: "zulu" }), /only valid.*retired/u);
assert.throws(() => planWithDisclosedWrites(operationInventory, operationModel, { ...operationFixture("set-status"), desired_status: "retired", replacement_scope_id: "alpha" }), /distinct/u);
assert.throws(() => planWithDisclosedWrites(operationInventory, operationModel, { ...operationFixture("set-status"), desired_status: "retired", replacement_scope_id: "missing" }), /adopted scope/u);
const archivedAlphaModel = { ...operationModel, descriptorsById: new Map(operationModel.descriptorsById) };
archivedAlphaModel.descriptorsById.set("alpha", { ...archivedAlphaModel.descriptorsById.get("alpha"), status: "archived" });
const retirement = planWithDisclosedWrites(operationInventory, archivedAlphaModel, { ...operationFixture("set-status"), desired_status: "retired", replacement_scope_id: "zulu" });
assert.match(retirement.replacements.find((item) => item.kind === "descriptor" && item.path.endsWith("Alpha/00 Index.md")).bytes, /replaced_by_scope_id: zulu/u);
const retirementWithoutReplacement = planWithDisclosedWrites(operationInventory, archivedAlphaModel, { ...operationFixture("set-status"), desired_status: "retired" });
assert.doesNotMatch(retirementWithoutReplacement.replacements.find((item) => item.kind === "descriptor" && item.path.endsWith("Alpha/00 Index.md")).bytes, /replaced_by_scope_id/u);
const retiredAlphaModel = { ...operationModel, descriptorsById: new Map(operationModel.descriptorsById) };
retiredAlphaModel.descriptorsById.set("alpha", { ...retiredAlphaModel.descriptorsById.get("alpha"), status: "retired", replacedByScopeId: "zulu" });
const unretirement = planWithDisclosedWrites(operationInventory, retiredAlphaModel, { ...operationFixture("set-status"), desired_status: "archived" });
assert.doesNotMatch(unretirement.replacements.find((item) => item.kind === "descriptor" && item.path.endsWith("Alpha/00 Index.md")).bytes, /replaced_by_scope_id/u);

for (const [from, to, allowed] of [
  ["active", "active", true], ["archived", "archived", true], ["retired", "retired", true],
  ["active", "archived", true], ["archived", "active", true], ["archived", "retired", true],
  ["retired", "archived", true], ["active", "retired", false], ["retired", "active", false],
]) {
  const synthetic = { ...operationModel, descriptorsById: new Map(operationModel.descriptorsById) };
  synthetic.descriptorsById.set("alpha", { ...synthetic.descriptorsById.get("alpha"), status: from });
  const request = { ...operationFixture("set-status"), desired_status: to };
  if (to === "retired") request.replacement_scope_id = "zulu";
  const plan = planWithDisclosedWrites(operationInventory, synthetic, request);
  assert.strictEqual(plan.lifecycle_checks[0].allowed, allowed, `${from} -> ${to}`);
  if (!allowed) {
    assert.deepStrictEqual(plan.replacements, []);
    assert.deepStrictEqual(plan.content_write_paths, []);
    assert.strictEqual(plan.write_authorized, false);
  }
}

const movePlan = planWithDisclosedWrites(operationInventory, operationModel, operationFixture("move"));
assert.deepStrictEqual(movePlan.moves, [{ source_path: "Domains/Product/Workstreams/Alpha", destination_path: "Domains/Product/Workstreams/Beta" }]);
const moveVault = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-operation-move-"));
fs.cpSync(fixture("deep_transparent_ancestry"), moveVault, { recursive: true });
const moved = applyOperation(moveVault, { ...operationFixture("move"), allowed_write_paths: movePlan.content_write_paths });
assert.deepStrictEqual(moved.changes, []);
assert.ok(fs.existsSync(path.join(moveVault, "Domains/Product/Workstreams/Beta/00 Index.md")));
assert.ok(fs.existsSync(path.join(moveVault, "Domains/Product/Workstreams/Alpha/00 Index.md")));
fs.rmSync(moveVault, { recursive: true, force: true });

// A move composes destination checkpoints from the pre-move source bytes.
const preservingMoveVault = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-operation-move-preserve-"));
fs.cpSync(fixture("deep_transparent_ancestry"), preservingMoveVault, { recursive: true });
const sourceScope = "Domains/Product/Workstreams/Alpha";
const destinationScope = "Domains/Product/Workstreams/Beta";
const checkpointPaths = ["00 Index.md", "AGENTS.md", "Agent/00 Agent Navigation.md", "Agent/Task Routing Matrix.md"];
for (const [index, relative] of checkpointPaths.entries()) {
  const file = path.join(preservingMoveVault, sourceScope, relative); fs.mkdirSync(path.dirname(file), { recursive: true });
  const rendered = renderCheckpointBlocks(operationModel).find((item) => item.path === `${sourceScope}/${relative}`);
  const original = fs.existsSync(file) ? fs.readFileSync(file) : rendered.bytes;
  const prefix = index === 0 ? Buffer.alloc(0) : Buffer.from(`user-prefix-${index}\n`);
  fs.writeFileSync(file, Buffer.concat([prefix, original, Buffer.from([0x0a, 0x75, 0x73, 0x65, 0x72, 0x2d, 0x80 + index])]));
}
const descriptorFile = path.join(preservingMoveVault, sourceScope, "00 Index.md");
let descriptorText = fs.readFileSync(descriptorFile).toString("latin1");
descriptorText = descriptorText.replace("status: active", "status: retired\ncreated: 2020-01-02\ntags:\n  - user-tag\nuser_note: keep-me\nreplaced_by_scope_id: zulu");
fs.writeFileSync(descriptorFile, Buffer.from(descriptorText, "latin1"));
const preservingInventory = inventoryVault(preservingMoveVault); const preservingModel = buildTopology(preservingInventory);
const preservingPlan = planWithDisclosedWrites(preservingInventory, preservingModel, operationFixture("move"));
applyOperation(preservingMoveVault, { ...operationFixture("move"), allowed_write_paths: preservingPlan.content_write_paths });
for (const [index, relative] of checkpointPaths.entries()) {
  const bytes = fs.readFileSync(path.join(preservingMoveVault, destinationScope, relative));
  if (index > 0) assert.ok(bytes.subarray(0, `user-prefix-${index}\n`.length).equals(Buffer.from(`user-prefix-${index}\n`)), relative);
  assert.ok(bytes.includes(Buffer.from([0x0a, 0x75, 0x73, 0x65, 0x72, 0x2d, 0x80 + index])), relative);
}
const movedDescriptor = fs.readFileSync(path.join(preservingMoveVault, destinationScope, "00 Index.md"), "latin1");
for (const preserved of ["created: 2020-01-02", "  - user-tag", "user_note: keep-me", "replaced_by_scope_id: zulu"]) assert.match(movedDescriptor, new RegExp(preserved.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
assert.match(movedDescriptor, /scope_path: Domains\/Product\/Workstreams\/Beta/u);
assert.match(movedDescriptor, /status: retired/u);
assert.match(fs.readFileSync(path.join(preservingMoveVault, sourceScope, "00 Index.md"), "utf8"), /type: scope-redirect/u);
assert.deepStrictEqual(checkTopology(preservingMoveVault).changes, []);
fs.rmSync(preservingMoveVault, { recursive: true, force: true });
assert.ok(movePlan.replacements.some((item) => item.kind === "redirect" && item.path === "Domains/Product/Workstreams/Alpha/00 Index.md"));
assert.match(movePlan.replacements.find((item) => item.kind === "redirect").bytes, /redirect_schema: 1/u);
assert.match(movePlan.replacements.find((item) => item.kind === "descriptor" && item.path.endsWith("Beta/00 Index.md")).bytes, /parent_scope_id: product/u);
assert.throws(() => planOperation(operationInventory, operationModel, parseOperationRequest({ ...operationFixture("move"), source_path: "Domains/Product/Zulu" })), /does not match target/u);
assert.throws(() => planOperation(operationInventory, operationModel, parseOperationRequest({ ...operationFixture("move"), destination_path: "Domains/Product/Zulu" })), /destination already exists/u);
assert.throws(() => planOperation(operationInventory, operationModel, parseOperationRequest({ ...operationFixture("move"), destination_path: "Domains/Product/Workstreams/Alpha/Child" })), /source subtree/u);
assert.throws(() => planOperation(operationInventory, operationModel, parseOperationRequest({ ...operationFixture("move"), destination_path: "Domains/Product/Workstreams/Alpha" })), /source subtree/u);
const reservedModel = { ...operationModel, descriptorsById: new Map(operationModel.descriptorsById) };
reservedModel.descriptorsById.set("zulu", { ...reservedModel.descriptorsById.get("zulu"), formerScopePaths: ["Legacy/Alpha"] });
assert.throws(() => planOperation(operationInventory, reservedModel, parseOperationRequest({ ...operationFixture("move"), destination_path: "Legacy/Alpha" })), /reserved former path/u);

const adoptionInventory = inventoryVault(fixture("pending_without_root"));
const adoption = planWithDisclosedWrites(adoptionInventory, buildTopology(adoptionInventory), operationFixture("adopt"));
const rootDescriptorReplacement = adoption.replacements.findIndex((item) => item.path === "00 Index.md" && item.kind === "descriptor");
const rootCheckpointReplacement = adoption.replacements.findIndex((item) => item.path === "00 Index.md" && item.kind === "checkpoint");
assert.ok(rootDescriptorReplacement >= 0 && rootDescriptorReplacement < rootCheckpointReplacement);
assert.strictEqual(adoption.replacements[rootDescriptorReplacement].activation, true);

// Legacy candidate discovery: a genuinely unadopted vault (zero pre-existing scope-index
// descriptors anywhere) must be whole-vault adoptable in one operation, per
// docs/guides/scope-topology-migration.md. Root, a bare-index candidate, a named-index
// candidate, and a nested candidate behind a transparent intermediate folder are all
// discovered from local AGENTS.md presence; a dismissed candidate is excluded.
const legacyWholeVault = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-legacy-whole-vault-"));
fs.cpSync(fixture("legacy_vault"), legacyWholeVault, { recursive: true });
const legacyWholeInventory = inventoryVault(legacyWholeVault);
const legacyWholeModel = buildTopology(legacyWholeInventory);
assert.strictEqual(legacyWholeModel.active, false);
const legacyWholeRequest = { operation_schema: 1, operation: "adopt", target_scope_id: "root", adoption_mode: "whole-vault", normalize_files: [], allowed_write_paths: [] };
const legacyWholePlan = planWithDisclosedWrites(legacyWholeInventory, legacyWholeModel, legacyWholeRequest);
assert.strictEqual(legacyWholePlan.write_authorized, true);
const legacyWholeDescriptors = legacyWholePlan.replacements.filter((item) => item.kind === "descriptor");
assert.deepStrictEqual(legacyWholeDescriptors.map((item) => item.path).sort(), [
  "00 Index.md", "Domains/Alpha/00 Index.md", "Domains/Beta/00 Index.md", "Domains/Gamma/Delta/00 Index.md",
]);
assert.match(legacyWholeDescriptors.find((item) => item.path === "00 Index.md").bytes, /title: Example Vault/u);
const legacyBeta = legacyWholeDescriptors.find((item) => item.path === "Domains/Beta/00 Index.md").bytes;
assert.match(legacyBeta, /title: Beta Domain/u);
assert.match(legacyBeta, /parent_scope_id: root/u);
assert.match(legacyWholeDescriptors.find((item) => item.path === "Domains/Alpha/00 Index.md").bytes, /parent_scope_id: root/u);
assert.match(legacyWholeDescriptors.find((item) => item.path === "Domains/Gamma/Delta/00 Index.md").bytes, /parent_scope_id: root/u);
applyOperation(legacyWholeVault, { ...legacyWholeRequest, allowed_write_paths: legacyWholePlan.content_write_paths });
assert.deepStrictEqual(checkTopology(legacyWholeVault).changes, []);
assert.ok(fs.existsSync(path.join(legacyWholeVault, "Domains/Beta/00 Beta Index.md")));
assert.match(fs.readFileSync(path.join(legacyWholeVault, "Domains/Beta/00 Beta Index.md"), "utf8"), /title: Beta Domain/u);
assert.ok(!fs.existsSync(path.join(legacyWholeVault, "Domains/Gamma/00 Index.md")));
const omegaAfter = fs.readFileSync(path.join(legacyWholeVault, "Domains/Omega/00 Index.md"), "utf8");
assert.match(omegaAfter, /ariadne_scope_adoption: dismissed/u);
assert.doesNotMatch(omegaAfter, /type: scope-index/u);
fs.rmSync(legacyWholeVault, { recursive: true, force: true });

// Ancestor-chain adoption against the same unadopted vault only adopts the target and its
// physical ancestors, leaving unrelated legacy candidates untouched.
const legacyAncestorVault = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-legacy-ancestor-"));
fs.cpSync(fixture("legacy_vault"), legacyAncestorVault, { recursive: true });
const legacyAncestorInventory = inventoryVault(legacyAncestorVault);
const legacyAncestorRequest = { operation_schema: 1, operation: "adopt", target_scope_id: "alpha", adoption_mode: "ancestor-chain", normalize_files: [], allowed_write_paths: [] };
const legacyAncestorPlan = planWithDisclosedWrites(legacyAncestorInventory, buildTopology(legacyAncestorInventory), legacyAncestorRequest);
assert.deepStrictEqual(legacyAncestorPlan.replacements.filter((item) => item.kind === "descriptor").map((item) => item.path).sort(), ["00 Index.md", "Domains/Alpha/00 Index.md"]);
fs.rmSync(legacyAncestorVault, { recursive: true, force: true });

// Legacy scope_id collisions (same basename at different physical locations) are
// disambiguated deterministically by full path rather than silently colliding.
const collisionVault = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-legacy-collision-"));
fs.cpSync(fixture("root_only"), collisionVault, { recursive: true });
fs.mkdirSync(path.join(collisionVault, "Engineering"), { recursive: true });
fs.writeFileSync(path.join(collisionVault, "Engineering", "AGENTS.md"), "# Engineering\n");
fs.mkdirSync(path.join(collisionVault, "Product", "Engineering"), { recursive: true });
fs.writeFileSync(path.join(collisionVault, "Product", "AGENTS.md"), "# Product\n");
fs.writeFileSync(path.join(collisionVault, "Product", "Engineering", "AGENTS.md"), "# Product Engineering\n");
const collisionInventory = inventoryVault(collisionVault);
const collisionModel = buildTopology(collisionInventory);
assert.strictEqual(collisionModel.active, true);
const collisionRequest = { operation_schema: 1, operation: "adopt", target_scope_id: "engineering", adoption_mode: "whole-vault", normalize_files: [], allowed_write_paths: [] };
const collisionPlan = planWithDisclosedWrites(collisionInventory, collisionModel, collisionRequest);
const collisionDescriptors = collisionPlan.replacements.filter((item) => item.kind === "descriptor" && item.path !== "00 Index.md");
const collisionIds = collisionDescriptors.map((item) => item.bytes.toString().match(/scope_id: (\S+)/u)[1]).sort();
assert.deepStrictEqual(collisionIds, ["engineering", "product", "product-engineering"]);
assert.strictEqual(new Set(collisionIds).size, 3);
fs.rmSync(collisionVault, { recursive: true, force: true });

// virtualModel (write-time planning) and buildTopology (post-write reads) must order
// siblings identically. A folder whose basename sorts differently than its title (e.g.
// "Engineering" the folder vs "Company Operating Context Graph" the title) previously
// produced a Scope Map/Canvas that matched what was written but disagreed with what a
// later scopeFindings pass considered canonical, permanently reporting scope-map-drift.
// This targets a fresh whole-vault adoption (root included in the same operation),
// matching how legacy vaults are actually first adopted.
const orderingVault = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-legacy-ordering-"));
fs.mkdirSync(path.join(orderingVault, "Zeta"), { recursive: true });
fs.writeFileSync(path.join(orderingVault, "AGENTS.md"), "# Root\n");
fs.writeFileSync(path.join(orderingVault, "Zeta", "AGENTS.md"), "# Zeta\n");
fs.writeFileSync(path.join(orderingVault, "Zeta", "00 Index.md"), "---\ntitle: Alpha Priority\ntype: index\nstatus: active\n---\n# Alpha Priority\n");
fs.mkdirSync(path.join(orderingVault, "Alpha"), { recursive: true });
fs.writeFileSync(path.join(orderingVault, "Alpha", "AGENTS.md"), "# Alpha\n");
fs.writeFileSync(path.join(orderingVault, "Alpha", "00 Index.md"), "---\ntitle: Zeta Priority\ntype: index\nstatus: active\n---\n# Zeta Priority\n");
const orderingInventory = inventoryVault(orderingVault);
const orderingRequest = { operation_schema: 1, operation: "adopt", target_scope_id: "root", adoption_mode: "whole-vault", normalize_files: [], allowed_write_paths: [] };
const orderingPlan = planWithDisclosedWrites(orderingInventory, buildTopology(orderingInventory), orderingRequest);
applyOperation(orderingVault, { ...orderingRequest, allowed_write_paths: orderingPlan.content_write_paths });
const onDiskMap = fs.readFileSync(path.join(orderingVault, "Agent/Scope Map.md"), "utf8");
const freshExpectedMap = renderScopeMapMarkdown(buildTopology(inventoryVault(orderingVault))).bytes.toString("utf8");
assert.strictEqual(onDiskMap, freshExpectedMap);
assert.ok(onDiskMap.indexOf("Alpha Priority") < onDiskMap.indexOf("Zeta Priority"));
assert.deepStrictEqual(checkTopology(orderingVault).changes, []);
fs.rmSync(orderingVault, { recursive: true, force: true });

const createVault = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-operation-create-"));
fs.cpSync(fixture("root_only"), createVault, { recursive: true });
fs.mkdirSync(path.join(createVault, "New Scope"));
const createInventory = inventoryVault(createVault);
const createPlan = planWithDisclosedWrites(createInventory, buildTopology(createInventory), {
  operation_schema: 1, operation: "create", target_scope_id: "new-scope", destination_path: "New Scope", allowed_write_paths: [],
});
assert.ok(createPlan.replacements.some((item) => item.path === "New Scope/00 Index.md" && item.kind === "descriptor"));
assert.ok(createPlan.replacements.some((item) => item.path === "New Scope/AGENTS.md" && item.kind === "checkpoint"));
fs.rmSync(createVault, { recursive: true, force: true });

const baseVault = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-operation-base-"));
fs.cpSync(fixture("root_only"), baseVault, { recursive: true });
fs.mkdirSync(path.join(baseVault, "Bases"), { recursive: true });
fs.writeFileSync(path.join(baseVault, "Bases", "Recognized.base"), 'formulas:\n  scope: \'if(file.inFolder("Domains/Alpha"), "Alpha", "Global")\'\n');
fs.writeFileSync(path.join(baseVault, "Bases", "Unsupported.base"), "formulas:\n  scope: file.inFolder(dynamicPath)\n");
fs.writeFileSync(path.join(baseVault, "Bases", "Comment.base"), '# example: file.inFolder("Domains/Alpha")\nviews: []\n');
fs.writeFileSync(path.join(baseVault, "Bases", "Nested.base"), 'views:\n  formulas:\n    scope: file.inFolder("Domains/Alpha")\n');
fs.writeFileSync(path.join(baseVault, "Bases", "NestedRoot.base"), 'formulas:\n  scope:\n    nested: file.inFolder("Domains/Alpha")\n');
fs.writeFileSync(path.join(baseVault, "Bases", "Filter.base"), 'views:\n  - filters: file.inFolder("Domains/Alpha")\n');
fs.writeFileSync(path.join(baseVault, "Bases", "Ambiguous.base"), 'formulas:\n  scope: file.inFolder("Domains/Alpha")\nviews:\n  - filters: file.inFolder("Elsewhere")\n');
fs.writeFileSync(path.join(baseVault, "Bases", "Additional.base"), 'formulas:\n  scope: file.inFolder("Domains/Alpha")\n  other: file.inFolder("Elsewhere")\n');
fs.writeFileSync(path.join(baseVault, "Bases", "Substring.base"), 'formulas:\n  scope: prefixfile.inFolder("Domains/Alpha")\n');
const baseInventory = inventoryVault(baseVault);
const basePlan = planWithDisclosedWrites(baseInventory, buildTopology(baseInventory), { ...operationFixture("repair"), allowed_write_paths: [] });
assert.deepStrictEqual(basePlan.base_formula_proposals.map(({ path: itemPath, recognized, authorized }) => ({ path: itemPath, recognized, authorized })), [
  { path: "Bases/Recognized.base", recognized: true, authorized: false },
]);
assert.deepStrictEqual(basePlan.base_formula_reports, ["Additional", "Ambiguous", "Comment", "Filter", "Nested", "NestedRoot", "Substring", "Unsupported"].map((name) => ({ path: `Bases/${name}.base`, code: "unsupported-base-formula", rewrite_proposed: false })));
assert.ok(!basePlan.content_write_paths.includes("Bases/Unsupported.base"));
for (const name of ["Additional", "Ambiguous", "Comment", "Filter", "Nested", "NestedRoot", "Substring", "Unsupported"]) assert.ok(!basePlan.content_write_paths.includes(`Bases/${name}.base`));
const unsupportedAuthorization = planOperation(baseInventory, buildTopology(baseInventory), parseOperationRequest({
  ...operationFixture("repair"), allowed_write_paths: [...basePlan.content_write_paths, "Bases/Unsupported.base"],
}));
assert.ok(unsupportedAuthorization.refusals.some((item) => item.code === "unused-write-authorization" && item.path === "Bases/Unsupported.base"));
assert.ok(!basePlan.replacements.some((item) => item.path.endsWith(".base") && item.path !== "Bases/Scope Registry.base"), "Base proposals must not become implicit rewrites");
assert.ok(!basePlan.content_write_paths.includes("Bases/Recognized.base"), "report-only Base proposals must not be authorized");
const recognizedAuthorization = planOperation(baseInventory, buildTopology(baseInventory), parseOperationRequest({
  ...operationFixture("repair"), allowed_write_paths: [...basePlan.content_write_paths, "Bases/Recognized.base"],
}));
assert.ok(recognizedAuthorization.refusals.some((item) => item.code === "unused-write-authorization" && item.path === "Bases/Recognized.base"));
fs.rmSync(baseVault, { recursive: true, force: true });

const duplicateCreateVault = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-operation-duplicate-"));
fs.cpSync(fixture("pending_without_root"), duplicateCreateVault, { recursive: true });
fs.mkdirSync(path.join(duplicateCreateVault, "Elsewhere"));
const duplicateInventory = inventoryVault(duplicateCreateVault);
assert.throws(() => planOperation(duplicateInventory, buildTopology(duplicateInventory), parseOperationRequest({
  operation_schema: 1, operation: "create", target_scope_id: "pending", destination_path: "Elsewhere", allowed_write_paths: [],
})), /scope ID already exists/u);
fs.rmSync(duplicateCreateVault, { recursive: true, force: true });

assert.strictEqual(normalizeNfc("Cafe\u0301"), "Café");
assert.strictEqual(normalizeScopePath("Domains\\Cafe\u0301/./Research"), "Domains/Café/Research");
assert.throws(() => normalizeScopePath("../escape"), /traversal/u);
assert.throws(() => normalizeScopePath("/absolute"), /vault-relative/u);
assert.throws(() => normalizeScopePath("\\rooted"), /vault-relative/u);
assert.throws(() => normalizeScopePath("C:\\rooted"), /vault-relative/u);
assert.throws(() => normalizeScopePath("CON/Notes"), /reserved/u);
for (const character of ["<", ">", ":", "\"", "|", "?", "*"]) {
  assert.throws(() => normalizeScopePath(`Bad${character}Name/Notes`), /illegal/u);
}
assert.throws(() => normalizeScopePath("Bad\u0000Path"), /control/u);

assert.throws(
  () => parseScopeDescriptor("00 Index.md", { type: "scope-index", scope_schema: "1", scope_id: "root", scope_path: ".", tags: [["nested"]] }),
  /flat scalar lists/u,
);

const rootInventory = inventoryVault(fixture("root_only"));
const rootOnly = buildTopology(rootInventory);
assert.strictEqual(rootOnly.active, true);
assert.deepStrictEqual([...rootOnly.descriptorsById.keys()], ["root"]);
assert.strictEqual(rootOnly.descriptors.size, 1);
assert.deepStrictEqual(rootOnly.childrenById.get("root"), []);
const rootFile = rootInventory.files.find((file) => file.relativePath === "00 Index.md");
assert(rootFile);
assert(Buffer.isBuffer(rootFile.rawBytes));
assert.strictEqual(rootFile.lstat.isFile(), true);
assert.strictEqual(rootFile.linkCount, 1);
assert.match(rootFile.canonicalPath, /00 Index\.md$/u);
assert.match(rootFile.contentHash, /^[a-f0-9]{64}$/u);
assert.strictEqual(rootFile.frontmatter.scope_id, "root");

const pending = buildTopology(inventoryVault(fixture("pending_without_root")));
assert.strictEqual(pending.active, false);
assert.strictEqual(pending.descriptors.size, 0);
assert.strictEqual(pending.pendingDescriptors.length, 1);
assert.strictEqual(pending.pendingDescriptors[0].scopeId, "pending");

const unsupported = buildTopology(inventoryVault(fixture("unsupported_root")));
assert.strictEqual(unsupported.active, false);
assert.strictEqual(unsupported.descriptors.size, 0);
assert.strictEqual(unsupported.pendingDescriptors.length, 1);
assert.strictEqual(unsupported.unsupportedRoot, true);

const deep = buildTopology(inventoryVault(fixture("deep_transparent_ancestry")));
assert.strictEqual(deep.active, true);
assert.deepStrictEqual([...deep.descriptorsById.keys()], ["root", "product", "alpha", "zulu"]);
assert.deepStrictEqual(deep.childrenById.get("root").map((item) => item.scopeId), ["product"]);
assert.deepStrictEqual(deep.childrenById.get("product").map((item) => item.scopeId), ["alpha", "zulu"]);
assert.strictEqual(deep.descriptorsById.get("product").parentScopeId, "root");
assert.strictEqual(deep.descriptorsById.get("alpha").parentScopeId, "product");
assert.strictEqual(deep.descriptorsById.get("alpha").transparentPath, "Workstreams/Alpha");
assert.strictEqual(deep.candidates.length, 1);
assert.strictEqual(deep.candidates[0].relativePath, "Ideas/00 Index.md");

const generated = fixture("generated_artifacts");
const renders = [
  ...renderCheckpointBlocks(deep).slice(0, 4),
  renderScopeRegistry(deep),
  renderScopeMapMarkdown(deep),
  renderScopeMapCanvas(deep),
];
for (const result of renders) {
  assert.deepStrictEqual(Object.keys(result), ["path", "bytes", "reason", "owner"]);
  assert(Buffer.isBuffer(result.bytes));
  const golden = path.join(generated, result.path);
  if (result.path.endsWith(".canvas")) assert.deepStrictEqual(JSON.parse(result.bytes), JSON.parse(fs.readFileSync(golden, "utf8")), result.path);
  else assert.strictEqual(result.bytes.toString("utf8"), fs.readFileSync(golden, "utf8"), result.path);
}
assert.strictEqual(renderCheckpointBlocks(deep).length, 16);
const registry = renderScopeRegistry(deep).bytes.toString("utf8");
assert.strictEqual((registry.match(/^  - name:/gmu) || []).length, 2);
assert.match(registry, /name: Scope Topology/u);
assert.match(registry, /name: Lifecycle/u);
assert.doesNotMatch(registry, /^filters:/u);
assert.strictEqual((registry.match(/^    filters:/gmu) || []).length, 2);
const canvas = JSON.parse(renderScopeMapCanvas(deep).bytes);
assert.strictEqual(canvas.nodes.length, 4);
assert.strictEqual(canvas.edges.length, 3);
assert.deepStrictEqual(canvas.nodes.map(({ x, y, width, height, color }) => ({ x, y, width, height, color })), [
  { x: 0, y: 0, width: 320, height: 120, color: "4" },
  { x: 480, y: 180, width: 320, height: 120, color: "4" },
  { x: 960, y: 360, width: 320, height: 120, color: "4" },
  { x: 960, y: 540, width: 320, height: 120, color: "6" },
]);
for (const item of [...canvas.nodes, ...canvas.edges]) assert.match(item.id, /^[a-f0-9]{16}$/u);
assert.strictEqual(new Set([...canvas.nodes, ...canvas.edges].map((item) => item.id)).size, 7);
assert.deepStrictEqual(JSON.parse(renderScopeMapCanvas(deep).bytes), canvas);

const semanticVault = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-render-"));
fs.cpSync(fixture("deep_transparent_ancestry"), semanticVault, { recursive: true });
fs.mkdirSync(path.join(semanticVault, "Bases"), { recursive: true });
fs.mkdirSync(path.join(semanticVault, "Agent"), { recursive: true });
for (const artifact of [renderScopeRegistry(deep), renderScopeMapMarkdown(deep), renderScopeMapCanvas(deep)]) {
  fs.writeFileSync(path.join(semanticVault, artifact.path), artifact.bytes);
}
let semanticInventory = inventoryVault(semanticVault);
assert.strictEqual(scopeFindings(buildTopology(semanticInventory), semanticInventory).filter((item) => item.code === "scope-map-drift").length, 0);
const canvasPath = path.join(semanticVault, "Agent", "Scope Map.canvas");
fs.writeFileSync(canvasPath, JSON.stringify(JSON.parse(fs.readFileSync(canvasPath, "utf8"))));
semanticInventory = inventoryVault(semanticVault);
assert.strictEqual(scopeFindings(buildTopology(semanticInventory), semanticInventory).filter((item) => item.code === "scope-map-drift").length, 0);
const reorderedCanvas = JSON.parse(fs.readFileSync(canvasPath, "utf8"));
reorderedCanvas.nodes.reverse();
reorderedCanvas.edges.reverse();
reorderedCanvas.nodes = reorderedCanvas.nodes.map((node) => Object.fromEntries(Object.entries(node).reverse()));
fs.writeFileSync(canvasPath, JSON.stringify({ edges: reorderedCanvas.edges, nodes: reorderedCanvas.nodes }));
semanticInventory = inventoryVault(semanticVault);
assert.strictEqual(scopeFindings(buildTopology(semanticInventory), semanticInventory).filter((item) => item.code === "scope-map-drift").length, 0);
const expectedCanvas = JSON.parse(renderScopeMapCanvas(deep).bytes);
for (const mutate of [
  (value) => { value.nodes[0].id = "wrong-id"; },
  (value) => { value.nodes[0].x += 1; },
  (value) => { value.edges[0].toNode = value.nodes[0].id; },
  (value) => { value.nodes.push({ id: "stale", type: "text", text: "stale", x: 0, y: 0, width: 1, height: 1 }); },
  (value) => { value.manualMetadata = { note: "unsupported" }; },
]) {
  const changed = structuredClone(expectedCanvas);
  mutate(changed);
  fs.writeFileSync(canvasPath, JSON.stringify(changed));
  semanticInventory = inventoryVault(semanticVault);
  assert.ok(scopeFindings(buildTopology(semanticInventory), semanticInventory).some((item) => item.code === "scope-map-drift" && /Canvas topology/u.test(item.message)));
}
fs.writeFileSync(canvasPath, renderScopeMapCanvas(deep).bytes);
const registryPath = path.join(semanticVault, "Bases", "Scope Registry.base");
fs.writeFileSync(registryPath, `views:
- type: table
  name: 'Lifecycle'
  order: [status, scope_id, scope_path, former_scope_paths]
  filters:
    and: ['type == "scope-index"', 'file.name == "00 Index"', 'file.ext == "md"']
- filters:
    and: ['file.name == "00 Index"', 'type == "scope-index"', 'file.ext == "md"']
  order: [scope_id, scope_path, parent_scope_id, status, scope_order]
  type: table
  name: "Scope Topology"
`);
semanticInventory = inventoryVault(semanticVault);
assert.strictEqual(scopeFindings(buildTopology(semanticInventory), semanticInventory).filter((item) => item.code === "scope-map-drift").length, 0);
fs.writeFileSync(registryPath, fs.readFileSync(registryPath, "utf8").replace('type == "scope-index"', 'type == "note"'));
semanticInventory = inventoryVault(semanticVault);
assert.ok(scopeFindings(buildTopology(semanticInventory), semanticInventory).some((item) => item.code === "scope-map-drift" && /registry/u.test(item.message)));
fs.rmSync(semanticVault, { recursive: true, force: true });

const bomCrlf = Buffer.from(JSON.parse(fs.readFileSync(fixture("marker_preservation/input.json"), "utf8")).bytes);
const replaced = replaceMarkerBlock(bomCrlf, "scope-map", "new\nbody");
assert.strictEqual(replaced.toString("utf8"), "\ufeffBefore\r\n`<!-- ariadne:scope-map:start -->`\r\n<!-- ariadne:scope-map:start -->\r\nnew\r\nbody\r\n<!-- ariadne:scope-map:end -->\r\nAfter\r\n");
const binaryOutside = Buffer.concat([
  Buffer.from([0xff, 0xfe, 0x00, 0x80]),
  Buffer.from("\n<!-- ariadne:x:start -->\nold\n<!-- ariadne:x:end -->\n"),
  Buffer.from([0xc0, 0xaf, 0xf5]),
]);
const binaryReplaced = replaceMarkerBlock(binaryOutside, "x", "new");
assert.deepStrictEqual(binaryReplaced.subarray(0, 5), binaryOutside.subarray(0, 5));
assert.deepStrictEqual(binaryReplaced.subarray(binaryReplaced.length - 3), binaryOutside.subarray(binaryOutside.length - 3));
for (const malformed of [
  "plain", "<!-- ariadne:x:start -->\n", "<!-- ariadne:x:end -->\n<!-- ariadne:x:start -->\n",
  "<!-- ariadne:x:start -->\n<!-- ariadne:x:start -->\n<!-- ariadne:x:end -->\n",
  "<!-- ariadne:x:start -->\n<!-- ariadne:y:start -->\n<!-- ariadne:y:end -->\n<!-- ariadne:x:end -->\n",
  "<!-- ariadne:y:start -->\n<!-- ariadne:x:start -->\n<!-- ariadne:x:end -->\n<!-- ariadne:y:end -->\n",
  "<!-- ariadne:y:start -->\n<!-- ariadne:x:start -->\n<!-- ariadne:y:end -->\n<!-- ariadne:x:end -->\n",
  "<!-- ariadne:x:start -->\n<!-- ariadne:y:start -->\n<!-- ariadne:x:end -->\n<!-- ariadne:y:end -->\n",
]) assert.throws(() => replaceMarkerBlock(Buffer.from(malformed), "x", "body"), /marker/u);

const rejectedAncestor = buildTopology(inventoryVault(fixture("rejected_ancestor_is_transparent")));
assert.strictEqual(rejectedAncestor.active, true);
assert.deepStrictEqual([...rejectedAncestor.descriptorsById.keys()], ["root", "child"]);
assert.deepStrictEqual(rejectedAncestor.childrenById.get("root").map((item) => item.scopeId), ["child"]);
assert.strictEqual(rejectedAncestor.descriptorsById.get("child").transparentPath, "Wrapper/Child");

const structural = finding({
  code: "scope-contract-test",
  origin: "A/00 Index.md",
  obligations: ["A/AGENTS.md"],
  scopeIds: ["a"],
  message: "wording one",
  discriminator: "missing-agents",
});
const reworded = finding({
  code: "scope-contract-test",
  origin: "A/00 Index.md",
  obligations: ["A/AGENTS.md"],
  scopeIds: ["a"],
  message: "wording two",
  discriminator: "missing-agents",
});
assert.strictEqual(structural.finding_id, reworded.finding_id);
assert.match(structural.finding_id, /^[a-f0-9]{64}$/u);

const contractInventory = inventoryVault(fixture("contract_failures"));
const contractModel = buildTopology(contractInventory);
const contractFindings = scopeFindings(contractModel, contractInventory);
for (const code of [
  "invalid-schema", "duplicate-scope-id", "colliding-scope-path", "skipped-ancestor",
  "missing-checkpoint", "lifecycle-violation", "malformed-redirect", "reserved-former-path",
  "marker-drift", "pending-adoption", "unsupported-root", "dismissed-candidate",
]) assert.ok(contractFindings.some((item) => item.code === code), `missing finding code ${code}`);

for (const testCase of [
  { name: "active", replacement: "zulu", expected: /requires retired status/u },
  { name: "missing", status: "retired", replacement: "missing", expected: /does not exist/u },
  { name: "self", status: "retired", replacement: "alpha", expected: /must differ/u },
  { name: "retired-target", status: "retired", replacement: "zulu", retireTarget: true, expected: /active or archived/u },
]) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `ariadne-replacement-${testCase.name}-`)); fs.cpSync(fixture("deep_transparent_ancestry"), directory, { recursive: true });
  const alphaFile = path.join(directory, "Domains/Product/Workstreams/Alpha/00 Index.md"); let alpha = fs.readFileSync(alphaFile, "utf8");
  if (testCase.status) alpha = alpha.replace("status: active", `status: ${testCase.status}`);
  alpha = alpha.replace(/status: (?:active|retired)/u, (line) => `${line}\nreplaced_by_scope_id: ${testCase.replacement}`); fs.writeFileSync(alphaFile, alpha);
  if (testCase.retireTarget) { const zuluFile = path.join(directory, "Domains/Product/Zulu/00 Index.md"); fs.writeFileSync(zuluFile, fs.readFileSync(zuluFile, "utf8").replace(/status: (?:active|archived)/u, "status: retired")); }
  const replacementInventory = inventoryVault(directory); const replacementFindings = scopeFindings(buildTopology(replacementInventory), replacementInventory).filter((item) => item.code === "replacement-lifecycle-violation" && item.origin.endsWith("Alpha/00 Index.md"));
  assert.strictEqual(replacementFindings.length, 1, testCase.name); assert.match(replacementFindings[0].message, testCase.expected);
  const stableId = replacementFindings[0].finding_id; fs.appendFileSync(alphaFile, "\nUnrelated prose.\n"); const after = scopeFindings(buildTopology(inventoryVault(directory)), inventoryVault(directory)).find((item) => item.code === "replacement-lifecycle-violation" && item.origin.endsWith("Alpha/00 Index.md")); assert.strictEqual(after.finding_id, stableId);
  fs.rmSync(directory, { recursive: true, force: true });
}
assert.deepStrictEqual(contractFindings, [...contractFindings].sort(bySortKey));
const temporaryContract = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-findings-"));
fs.cpSync(fixture("contract_failures"), temporaryContract, { recursive: true });
const dismissedPath = path.join(temporaryContract, "Dismissed", "00 Index.md");
let proseInventory = inventoryVault(temporaryContract);
const beforeProse = scopeFindings(buildTopology(proseInventory), proseInventory)
  .find((item) => item.code === "dismissed-candidate").finding_id;
fs.appendFileSync(dismissedPath, "\nChanged prose that is not structural.\n");
proseInventory = inventoryVault(temporaryContract);
const afterProse = scopeFindings(buildTopology(proseInventory), proseInventory)
  .find((item) => item.code === "dismissed-candidate").finding_id;
assert.strictEqual(beforeProse, afterProse);
fs.rmSync(temporaryContract, { recursive: true, force: true });

const isolationInventory = inventoryVault(fixture("scoped_sibling_isolation"));
const isolationModel = buildTopology(isolationInventory);
const whole = scopeFindings(isolationModel, isolationInventory);
const scoped = filterFindingsByScope(whole, "healthy-child", isolationModel);
assert.ok(scoped.every((item) => whole.some((candidate) => candidate.finding_id === item.finding_id)));
assert.deepStrictEqual(scoped.map((item) => item.finding_id), [...scoped].sort(bySortKey).map((item) => item.finding_id));
assert.ok(scoped.some((item) => item.code === "invalid-schema" && item.origin.startsWith("Healthy/")));
assert.ok(scoped.some((item) => item.code === "dismissed-candidate" && item.origin.startsWith("Healthy/")));
assert.ok(scoped.some((item) => item.code === "malformed-redirect" && item.origin.startsWith("Healthy/")));
assert.deepStrictEqual(scoped.filter((item) => item.code === "scope-map-drift").map((item) => item.finding_id), whole.filter((item) => item.code === "scope-map-drift").map((item) => item.finding_id));
assert.ok(scoped.every((item) => !item.origin.startsWith("ZBroken/")), "duplicate ID leaked a sibling finding");

const validator = path.join(__dirname, "..", "scripts", "validate_vault.js");
const wholeCli = spawnSync(process.execPath, [validator, fixture("scoped_sibling_isolation"), "--profile", "scope"], { encoding: "utf8" });
assert.strictEqual(wholeCli.status, 0, wholeCli.stderr);
assert.match(wholeCli.stdout, /scope-adoption-warnings: \d+/u);
assert.match(wholeCli.stdout, /scope-contract-warnings: \d+/u);
assert.match(wholeCli.stdout, /scope-map-warnings: \d+/u);
const expectedScopeCounters = JSON.parse(fs.readFileSync(fixture("expected/scope-profile-counters.json"), "utf8"));
for (const counter of expectedScopeCounters) assert.match(wholeCli.stdout, new RegExp(`^${counter}: \\d+$`, "mu"));
const scopedCli = spawnSync(process.execPath, [validator, fixture("scoped_sibling_isolation"), "--scope", "Healthy", "--profile", "scope"], { encoding: "utf8" });
assert.strictEqual(scopedCli.status, 0, scopedCli.stderr);
assert.doesNotMatch(scopedCli.stdout, /ZBroken\/AGENTS\.md/u);
const cliFindingIds = (text) => [...text.matchAll(/\[(?:[^\s]+) ([a-f0-9]{64})\]/gu)].map((match) => match[1]);
const wholeIds = new Set(cliFindingIds(wholeCli.stdout));
assert.ok(cliFindingIds(scopedCli.stdout).every((id) => wholeIds.has(id)));
const rootCli = spawnSync(process.execPath, [validator, fixture("scoped_sibling_isolation"), "--scope", ".", "--profile", "scope"], { encoding: "utf8" });
assert.strictEqual(rootCli.status, 0, rootCli.stderr);
assert.ok(cliFindingIds(rootCli.stdout).every((id) => wholeIds.has(id)));
const tracedCli = spawnSync(process.execPath, [validator, fixture("scoped_sibling_isolation"), "--profile", "scope"], {
  encoding: "utf8",
  env: { ...process.env, ARIADNE_TEST_INVENTORY_TRACE: "1" },
});
assert.strictEqual(tracedCli.status, 0, tracedCli.stderr);
assert.match(tracedCli.stderr, /^inventory-snapshots: 1; fallback-reads: 0; live-observations: 0\n$/u);
const researchMissingScope = spawnSync(process.execPath, [validator, fixture("scoped_sibling_isolation"), "--profile", "research"], { encoding: "utf8" });
assert.strictEqual(researchMissingScope.status, 1);
assert.strictEqual(researchMissingScope.stderr, "validator-error: --profile requires --scope\n");

console.log("scope topology tests passed");
