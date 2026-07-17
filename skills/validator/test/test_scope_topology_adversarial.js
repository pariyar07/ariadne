"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  buildTopology, checkTopology, filterFindingsByScope, inventoryVault, normalizeScopePath,
  parseOperationRequest, renderCheckpointBlocks, renderScopeMapCanvas, renderScopeMapMarkdown, renderScopeRegistry, scopeFindings,
} = require("../scripts/scope-topology");

const fixtures = path.join(__dirname, "fixtures", "scope_topology");
const at = (name) => path.join(fixtures, name);
const contract = (name, fixtureName, verify) => {
  assert.strictEqual(typeof verify, "function", `${name} requires an executable assertion`);
  assert.match(String(verify), /\bassert\./u, `${name} must contain an executable assertion`);
  if (fixtureName) assert.ok(fs.existsSync(at(fixtureName)), `${name} fixture missing: ${fixtureName}`);
  verify();
};

contract("flexible-layout", "deep_transparent_ancestry", () => {
  const model = buildTopology(inventoryVault(at("deep_transparent_ancestry")));
  assert.ok(model.descriptorsById.has("product"));
});
contract("transparent-folder", "deep_transparent_ancestry", () => {
  const model = buildTopology(inventoryVault(at("deep_transparent_ancestry")));
  assert.strictEqual(model.descriptorsById.get("alpha").transparentPath, "Workstreams/Alpha");
});
contract("deep-ancestry", "deep_transparent_ancestry", () => {
  const model = buildTopology(inventoryVault(at("deep_transparent_ancestry")));
  assert.strictEqual(model.descriptorsById.get("alpha").parentScopeId, "product");
});
contract("marker-preservation", "marker_preservation/input.json", () => {
  const bytes = Buffer.from(JSON.parse(fs.readFileSync(at("marker_preservation/input.json"), "utf8")).bytes);
  assert.ok(bytes.includes(Buffer.from("Before")) && bytes.includes(Buffer.from("After")));
});
contract("lifecycle", "contract_failures", () => {
  const inventory = inventoryVault(at("contract_failures"));
  assert.ok(scopeFindings(buildTopology(inventory), inventory).some((item) => item.code === "lifecycle-violation"));
});
contract("move", "operations/move.json", () => {
  assert.strictEqual(parseOperationRequest(JSON.parse(fs.readFileSync(at("operations/move.json"), "utf8"))).operation, "move");
});
contract("redirect", "contract_failures/Redirect.md", () => {
  const inventory = inventoryVault(at("contract_failures"));
  assert.ok(scopeFindings(buildTopology(inventory), inventory).some((item) => item.code === "malformed-redirect"));
});
contract("former-path", "contract_failures", () => {
  const inventory = inventoryVault(at("contract_failures"));
  assert.ok(scopeFindings(buildTopology(inventory), inventory).some((item) => item.code === "reserved-former-path"));
});
contract("generated-only", "deep_transparent_ancestry", () => {
  const model = buildTopology(inventoryVault(at("deep_transparent_ancestry")));
  assert.strictEqual(renderCheckpointBlocks(model).length, model.descriptors.size * 4);
});
contract("unsupported-activation", "unsupported_root", () => {
  const model = buildTopology(inventoryVault(at("unsupported_root")));
  assert.strictEqual(model.active, false); assert.strictEqual(model.unsupportedRoot, true);
});
contract("dismissal", "deep_transparent_ancestry/Dismissed/00 Index.md", () => {
  const model = buildTopology(inventoryVault(at("deep_transparent_ancestry")));
  assert.ok(model.candidates.every((item) => !item.relativePath.startsWith("Dismissed/")));
});
contract("unicode-nfc-collision", "collision_descriptors", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-unicode-contract-"));
  try {
    fs.cpSync(at("root_only"), root, { recursive: true });
    fs.cpSync(at("collision_descriptors/UnicodeOne"), path.join(root, "UnicodeOne"), { recursive: true });
    fs.cpSync(at("collision_descriptors/UnicodeTwo"), path.join(root, "UnicodeTwo"), { recursive: true });
    const inventory = inventoryVault(root);
    assert.ok(scopeFindings(buildTopology(inventory), inventory).some((item) => item.code === "colliding-scope-path"));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
contract("case-fold-collision", "collision_descriptors", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-case-contract-"));
  try {
    fs.cpSync(at("root_only"), root, { recursive: true });
    fs.cpSync(at("collision_descriptors/CaseUpper"), path.join(root, "CaseUpper"), { recursive: true });
    fs.cpSync(at("collision_descriptors/CaseLower"), path.join(root, "CaseLower"), { recursive: true });
    const inventory = inventoryVault(root);
    assert.ok(scopeFindings(buildTopology(inventory), inventory).some((item) => item.code === "colliding-scope-path" && item.message.includes("case-fold")));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
contract("reserved-path", "operations/move.json", () => assert.throws(() => normalizeScopePath("CON/Notes"), /reserved/u));
contract("control-path", "operations/repair.json", () => assert.throws(() => normalizeScopePath("Bad\u0001/Notes"), /control/u));
contract("hardlink", "root_only", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-hardlink-contract-"));
  try {
    fs.writeFileSync(path.join(root, "A.md"), "a"); fs.linkSync(path.join(root, "A.md"), path.join(root, "B.md"));
    assert.ok(inventoryVault(root).files.every((file) => file.linkCount === 2));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
contract("symlink-swap", "root_only", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-symlink-contract-"));
  try {
    fs.writeFileSync(path.join(root, "target.md"), "target"); fs.symlinkSync("target.md", path.join(root, "swap.md"));
    assert.strictEqual(inventoryVault(root).files.find((file) => file.relativePath === "swap.md").lstat.isSymbolicLink(), true);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
contract("canvas-id-collision", "deep_transparent_ancestry", () => {
  const model = buildTopology(inventoryVault(at("deep_transparent_ancestry")));
  assert.throws(() => renderScopeMapCanvas(model, { idFactory: () => "0000000000000000" }), /Canvas ID collision/u);
});
contract("canvas-host-metadata", "deep_transparent_ancestry", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-canvas-metadata-contract-"));
  try {
    fs.cpSync(at("deep_transparent_ancestry"), root, { recursive: true });
    const initialModel = buildTopology(inventoryVault(root));
    for (const artifact of [renderScopeRegistry(initialModel), renderScopeMapMarkdown(initialModel), renderScopeMapCanvas(initialModel)]) {
      const output = path.join(root, artifact.path); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, artifact.bytes);
    }
    const canvasPath = path.join(root, "Agent/Scope Map.canvas");
    const canvas = JSON.parse(fs.readFileSync(canvasPath, "utf8"));
    canvas.metadata = { frontmatter: {}, version: "1.0-1.0" };
    fs.writeFileSync(canvasPath, `${JSON.stringify(canvas)}\n`);
    const inventory = inventoryVault(root);
    assert.ok(!scopeFindings(buildTopology(inventory), inventory).some((item) => item.code === "scope-map-drift" && item.origin === "Agent/Scope Map.canvas"));
    assert.ok(!checkTopology(root).changes.some((item) => item.path === "Agent/Scope Map.canvas"));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
contract("base-formula-order", "base_ordering/Incorrect.base", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-base-order-contract-"));
  try {
    fs.cpSync(at("deep_transparent_ancestry"), root, { recursive: true }); fs.mkdirSync(path.join(root, "Bases"));
    fs.copyFileSync(at("base_ordering/Incorrect.base"), path.join(root, "Bases/Incorrect.base"));
    const inventory = inventoryVault(root);
    assert.ok(scopeFindings(buildTopology(inventory), inventory).some((item) => item.code === "scope-map-drift" && item.message.includes("must precede parent")));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
contract("scoped-isolation", "scoped_sibling_isolation", () => {
  const inventory = inventoryVault(at("scoped_sibling_isolation")); const model = buildTopology(inventory);
  assert.ok(filterFindingsByScope(scopeFindings(model, inventory), "healthy-child", model).every((item) => !item.origin.startsWith("ZBroken/")));
});

module.exports = { contract };
