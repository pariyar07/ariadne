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
} = require("../scripts/scope-topology");
const { spawnSync } = require("child_process");

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
function authorizePlan(inventory, model, request) {
  try { return planOperation(inventory, model, parseOperationRequest(request)); }
  catch (error) {
    assert.match(error.message, /allowed_write_paths must exactly match/u);
    assert(Array.isArray(error.missing_paths));
    return planOperation(inventory, model, parseOperationRequest({ ...request, allowed_write_paths: [...(request.allowed_write_paths || []), ...error.missing_paths] }));
  }
}

assert.throws(() => planOperation(operationInventory, operationModel, parsedRepair), /allowed_write_paths must exactly match/u);
const repairPlan = authorizePlan(operationInventory, operationModel, operationFixture("repair"));
assert.deepStrictEqual(repairPlan.content_write_paths, [...repairPlan.content_write_paths].sort((a, b) => Buffer.from(a).compare(Buffer.from(b))));
assert.ok(repairPlan.replacements.some((item) => item.path === "Agent/Scope Map.md"));
assert.strictEqual(repairPlan.write_authorized, true);
assert.throws(() => planOperation(operationInventory, operationModel, parseOperationRequest({ ...operationFixture("repair"), allowed_write_paths: [...repairPlan.content_write_paths, "Unused.md"] })), /unused: Unused.md/u);
assert.strictEqual(hashPlan(repairPlan), hashPlan(authorizePlan(operationInventory, operationModel, operationFixture("repair"))));

assert.throws(() => parseOperationRequest({ ...operationFixture("repair"), replacement_scope_id: "alpha" }), /replacement_scope_id is not valid/u);
assert.throws(() => parseOperationRequest({ ...operationFixture("set-status"), desired_status: "archived", replacement_scope_id: "zulu" }), /only valid.*retired/u);
assert.throws(() => authorizePlan(operationInventory, operationModel, { ...operationFixture("set-status"), desired_status: "retired", replacement_scope_id: "alpha" }), /distinct/u);
assert.throws(() => authorizePlan(operationInventory, operationModel, { ...operationFixture("set-status"), desired_status: "retired", replacement_scope_id: "missing" }), /adopted scope/u);
const archivedAlphaModel = { ...operationModel, descriptorsById: new Map(operationModel.descriptorsById) };
archivedAlphaModel.descriptorsById.set("alpha", { ...archivedAlphaModel.descriptorsById.get("alpha"), status: "archived" });
const retirement = authorizePlan(operationInventory, archivedAlphaModel, { ...operationFixture("set-status"), desired_status: "retired", replacement_scope_id: "zulu" });
assert.match(retirement.replacements.find((item) => item.kind === "descriptor" && item.path.endsWith("Alpha/00 Index.md")).bytes, /replaced_by_scope_id: zulu/u);

for (const [from, to, allowed] of [
  ["active", "active", true], ["archived", "archived", true], ["retired", "retired", true],
  ["active", "archived", true], ["archived", "active", true], ["archived", "retired", true],
  ["retired", "archived", true], ["active", "retired", false], ["retired", "active", false],
]) {
  const synthetic = { ...operationModel, descriptorsById: new Map(operationModel.descriptorsById) };
  synthetic.descriptorsById.set("alpha", { ...synthetic.descriptorsById.get("alpha"), status: from });
  const request = { ...operationFixture("set-status"), desired_status: to };
  if (to === "retired") request.replacement_scope_id = "zulu";
  const plan = authorizePlan(operationInventory, synthetic, request);
  assert.strictEqual(plan.lifecycle_checks[0].allowed, allowed, `${from} -> ${to}`);
}

const movePlan = authorizePlan(operationInventory, operationModel, operationFixture("move"));
assert.deepStrictEqual(movePlan.moves, [{ source_path: "Domains/Product/Workstreams/Alpha", destination_path: "Domains/Product/Workstreams/Beta" }]);
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
const adoption = authorizePlan(adoptionInventory, buildTopology(adoptionInventory), operationFixture("adopt"));
assert.strictEqual(adoption.replacements.at(-1).path, "00 Index.md");
assert.strictEqual(adoption.replacements.at(-1).activation, true);

const createVault = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-operation-create-"));
fs.cpSync(fixture("root_only"), createVault, { recursive: true });
fs.mkdirSync(path.join(createVault, "New Scope"));
const createInventory = inventoryVault(createVault);
const createPlan = authorizePlan(createInventory, buildTopology(createInventory), {
  operation_schema: 1, operation: "create", target_scope_id: "new-scope", destination_path: "New Scope", allowed_write_paths: [],
});
assert.ok(createPlan.replacements.some((item) => item.path === "New Scope/00 Index.md" && item.kind === "descriptor"));
assert.ok(createPlan.replacements.some((item) => item.path === "New Scope/AGENTS.md" && item.kind === "checkpoint"));
fs.rmSync(createVault, { recursive: true, force: true });

const baseVault = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-operation-base-"));
fs.cpSync(fixture("root_only"), baseVault, { recursive: true });
fs.mkdirSync(path.join(baseVault, "Bases"), { recursive: true });
fs.writeFileSync(path.join(baseVault, "Bases", "Recognized.base"), 'formulas:\n  scope: file.inFolder("Domains/Alpha")\n');
fs.writeFileSync(path.join(baseVault, "Bases", "Unsupported.base"), "formulas:\n  scope: file.inFolder(dynamicPath)\n");
const baseInventory = inventoryVault(baseVault);
const basePlan = authorizePlan(baseInventory, buildTopology(baseInventory), { ...operationFixture("repair"), allowed_write_paths: [] });
assert.deepStrictEqual(basePlan.base_formula_proposals.map(({ path: itemPath, recognized, authorized }) => ({ path: itemPath, recognized, authorized })), [
  { path: "Bases/Recognized.base", recognized: true, authorized: true },
]);
assert.deepStrictEqual(basePlan.base_formula_reports, [{ path: "Bases/Unsupported.base", code: "unsupported-base-formula", rewrite_proposed: false }]);
assert.ok(!basePlan.content_write_paths.includes("Bases/Unsupported.base"));
assert.throws(() => planOperation(baseInventory, buildTopology(baseInventory), parseOperationRequest({
  ...operationFixture("repair"), allowed_write_paths: [...basePlan.content_write_paths, "Bases/Unsupported.base"],
})), /unused: Bases\/Unsupported\.base/u);
assert.ok(!basePlan.replacements.some((item) => item.path.endsWith(".base") && item.path !== "Bases/Scope Registry.base"), "Base proposals must not become implicit rewrites");
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
assert.ok(scoped.every((item) => !item.origin.startsWith("ZBroken/")), "duplicate ID leaked a sibling finding");

const validator = path.join(__dirname, "..", "scripts", "validate_vault.js");
const wholeCli = spawnSync(process.execPath, [validator, fixture("scoped_sibling_isolation"), "--profile", "scope"], { encoding: "utf8" });
assert.strictEqual(wholeCli.status, 0, wholeCli.stderr);
assert.match(wholeCli.stdout, /scope-adoption-warnings: \d+/u);
assert.match(wholeCli.stdout, /scope-contract-warnings: \d+/u);
assert.match(wholeCli.stdout, /scope-map-warnings: \d+/u);
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
