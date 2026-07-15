#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");
const {
  buildTopology,
  filterFindingsByScope,
  finding,
  inventoryVault,
  normalizeNfc,
  normalizeScopePath,
  parseScopeDescriptor,
  scopeFindings,
} = require("../scripts/scope-topology");
const { spawnSync } = require("child_process");

function fixture(name) {
  return path.join(__dirname, "fixtures", "scope_topology", name);
}

function bySortKey(left, right) {
  return Buffer.from(left.sort_key).compare(Buffer.from(right.sort_key));
}

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

const isolationInventory = inventoryVault(fixture("scoped_sibling_isolation"));
const isolationModel = buildTopology(isolationInventory);
const whole = scopeFindings(isolationModel, isolationInventory);
const scoped = filterFindingsByScope(whole, "healthy-child");
assert.ok(scoped.every((item) => whole.some((candidate) => candidate.finding_id === item.finding_id)));
assert.deepStrictEqual(scoped.map((item) => item.finding_id), [...scoped].sort(bySortKey).map((item) => item.finding_id));
assert.ok(whole.some((item) => item.scope_ids.includes("broken-sibling")));
assert.ok(scoped.every((item) => !item.scope_ids.includes("broken-sibling")));

const validator = path.join(__dirname, "..", "scripts", "validate_vault.js");
const wholeCli = spawnSync(process.execPath, [validator, fixture("scoped_sibling_isolation"), "--profile", "scope"], { encoding: "utf8" });
assert.strictEqual(wholeCli.status, 0, wholeCli.stderr);
assert.match(wholeCli.stdout, /scope-adoption-warnings: \d+/u);
assert.match(wholeCli.stdout, /scope-contract-warnings: \d+/u);
assert.match(wholeCli.stdout, /scope-map-warnings: \d+/u);
const scopedCli = spawnSync(process.execPath, [validator, fixture("scoped_sibling_isolation"), "--scope", "Healthy", "--profile", "scope"], { encoding: "utf8" });
assert.strictEqual(scopedCli.status, 0, scopedCli.stderr);
assert.doesNotMatch(scopedCli.stdout, /Broken\/AGENTS\.md/u);
const cliFindingIds = (text) => [...text.matchAll(/\[(?:[^\s]+) ([a-f0-9]{64})\]/gu)].map((match) => match[1]);
const wholeIds = new Set(cliFindingIds(wholeCli.stdout));
assert.ok(cliFindingIds(scopedCli.stdout).every((id) => wholeIds.has(id)));
const rootCli = spawnSync(process.execPath, [validator, fixture("scoped_sibling_isolation"), "--scope", ".", "--profile", "scope"], { encoding: "utf8" });
assert.strictEqual(rootCli.status, 0, rootCli.stderr);
assert.ok(cliFindingIds(rootCli.stdout).every((id) => wholeIds.has(id)));

console.log("scope topology tests passed");
