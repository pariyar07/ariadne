#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");
const {
  buildTopology,
  inventoryVault,
  normalizeNfc,
  normalizeScopePath,
  parseScopeDescriptor,
} = require("../scripts/scope-topology");

function fixture(name) {
  return path.join(__dirname, "fixtures", "scope_topology", name);
}

assert.strictEqual(normalizeNfc("Cafe\u0301"), "Café");
assert.strictEqual(normalizeScopePath("Domains\\Cafe\u0301/./Research"), "Domains/Café/Research");
assert.throws(() => normalizeScopePath("../escape"), /traversal/u);
assert.throws(() => normalizeScopePath("/absolute"), /vault-relative/u);
assert.throws(() => normalizeScopePath("CON/Notes"), /reserved/u);
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

console.log("scope topology tests passed");
