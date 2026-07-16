#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { buildTopology, hashPlan, inventoryVault, parseOperationRequest, planOperation } = require("../scripts/scope-topology");

const root = path.resolve(__dirname, "../../..");
const cli = path.join(root, "skills/validator/scripts/sync_scope_topology.js");
const source = path.join(__dirname, "fixtures/scope_topology/deep_transparent_ancestry");
const operation = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/scope_topology/operations/repair.json"), "utf8"));

function vault() {
  const value = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-sync-"));
  fs.cpSync(source, value, { recursive: true });
  return value;
}
function adoptionVault() {
  const value = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-adopt-"));
  fs.cpSync(path.join(__dirname, "fixtures/scope_topology/pending_without_root"), value, { recursive: true });
  fs.writeFileSync(path.join(value, "00 Index.md"), "---\ntitle: Legacy Home\n---\n# Legacy Home\n\nUser prose outside generated markers.\n");
  return value;
}
function hashTree(directory) {
  const rows = [];
  function walk(current, relative = "") {
    for (const name of fs.readdirSync(current).sort()) {
      const absolute = path.join(current, name); const item = path.posix.join(relative, name); const stat = fs.lstatSync(absolute);
      rows.push(`${item}:${stat.mode}:${stat.isSymbolicLink() ? `link:${fs.readlinkSync(absolute)}` : stat.isFile() ? crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex") : "dir"}`);
      if (stat.isDirectory()) walk(absolute, item);
    }
  }
  walk(directory); return crypto.createHash("sha256").update(rows.join("\n")).digest("hex");
}
function disclosedRequest(directory) {
  const previewFile = path.join(directory, "preview.json"); fs.writeFileSync(previewFile, JSON.stringify(operation));
  const preview = spawnSync(process.execPath, [cli, directory, "--check"], { encoding: "utf8" });
  assert.strictEqual(preview.status, 0, preview.stderr);
  const paths = JSON.parse(preview.stdout).changes.map((item) => item.path);
  const request = { ...operation, allowed_write_paths: paths };
  const requestFile = path.join(os.tmpdir(), `ariadne-request-${crypto.randomUUID()}.json`);
  fs.writeFileSync(requestFile, JSON.stringify(request)); return requestFile;
}
function requestFileFor(directory, request) {
  const inventory = inventoryVault(directory); const model = buildTopology(inventory); const preview = planOperation(inventory, model, parseOperationRequest({ ...request, allowed_write_paths: [] }));
  const file = path.join(os.tmpdir(), `ariadne-request-${crypto.randomUUID()}.json`); fs.writeFileSync(file, JSON.stringify({ ...request, allowed_write_paths: preview.content_write_paths })); return file;
}
function reseal(value) { delete value.checksum; value.checksum = hashPlan(value); return value; }
function tamperAuthority(directory, mutate) {
  const lockPath = path.join(directory, ".ariadne/scope-topology.lock"); const manifestPath = path.join(directory, ".ariadne/scope-topology-operation.json"); const lock = JSON.parse(fs.readFileSync(lockPath, "utf8")); const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  mutate(lock); reseal(lock); manifest.authority = structuredClone(lock); manifest.authority_checksum = lock.checksum; reseal(manifest); fs.writeFileSync(lockPath, JSON.stringify(lock)); fs.writeFileSync(manifestPath, JSON.stringify(manifest)); return lock.operation_id;
}
function run(args, options = {}) { const env = { ...process.env, ...options.env }; if (Object.keys(options.env || {}).some((key) => key.startsWith("ARIADNE_SYNC_"))) env.ARIADNE_SCOPE_TOPOLOGY_TEST_MODE = "1"; return spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", env }); }

// Whole-vault adoption composes root activation last and resumes before activation.
{
  const directory = adoptionVault();
  const request = { operation_schema: 1, operation: "adopt", target_scope_id: "pending", adoption_mode: "whole-vault", allowed_write_paths: [] };
  const requestFile = requestFileFor(directory, request);
  const failed = run([directory, "--write", "--request", requestFile], { env: { ARIADNE_SYNC_FAIL_AT: "after-temp-fsync:00 Index.md" } });
  assert.notStrictEqual(failed.status, 0);
  const beforeActivation = fs.readFileSync(path.join(directory, "00 Index.md"), "utf8");
  assert.match(beforeActivation, /User prose outside generated markers\./u);
  assert.doesNotMatch(beforeActivation, /scope_schema: 1/u);
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, ".ariadne/scope-topology-operation.json"), "utf8"));
  const rootEffects = manifest.authority.effects.filter((item) => item.type === "replace" && item.path === "00 Index.md");
  assert.strictEqual(rootEffects.length, 1);
  assert.strictEqual(rootEffects[0].activation, true);
  const canonicalRoot = Buffer.from(rootEffects[0].bytes_base64, "base64").toString("utf8");
  assert.match(canonicalRoot, /scope_schema: 1/u);
  assert.match(canonicalRoot, /<!-- ariadne:scope-boundary:start -->/u);
  assert.match(canonicalRoot, /User prose outside generated markers\./u);
  const resumed = run([directory, "--resume", manifest.operation_id]);
  assert.strictEqual(resumed.status, 0, resumed.stderr);
  const activated = fs.readFileSync(path.join(directory, "00 Index.md"), "utf8");
  assert.match(activated, /scope_schema: 1/u);
  assert.match(activated, /<!-- ariadne:scope-boundary:start -->/u);
  assert.match(activated, /User prose outside generated markers\./u);
  const checked = run([directory, "--check"]);
  assert.strictEqual(checked.status, 0, checked.stderr);
  assert.deepStrictEqual(JSON.parse(checked.stdout).changes, []);
  assert.deepStrictEqual(fs.readdirSync(path.join(directory, ".ariadne")), []);
  fs.rmSync(directory, { recursive: true, force: true });
  fs.rmSync(requestFile, { force: true });
}

// Check mode is byte-for-byte and metadata zero-write.
{
  const directory = vault(); const before = hashTree(directory);
  const result = run([directory, "--check"]);
  assert.strictEqual(result.status, 0, result.stderr); assert.ok(JSON.parse(result.stdout).changes.length > 0);
  assert.strictEqual(hashTree(directory), before); fs.rmSync(directory, { recursive: true, force: true });
}

// Production CLI ignores injection variables unless test mode is exactly 1.
{
  const directory = vault(); const requestFile = disclosedRequest(directory); const productionEnv = { ...process.env, ARIADNE_SYNC_FAIL_AT: "after-lock-create" }; delete productionEnv.ARIADNE_SCOPE_TOPOLOGY_TEST_MODE; const production = spawnSync(process.execPath, [cli, directory, "--write", "--request", requestFile], { encoding: "utf8", env: productionEnv });
  assert.strictEqual(production.status, 0, production.stderr); assert.ok(!fs.existsSync(path.join(directory, ".ariadne/scope-topology.lock"))); assert.ok(!fs.existsSync(path.join(directory, ".ariadne/scope-topology-operation.json")));
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}
{
  const directory = vault(); const requestFile = disclosedRequest(directory); const injected = spawnSync(process.execPath, [cli, directory, "--write", "--request", requestFile], { encoding: "utf8", env: { ...process.env, ARIADNE_SCOPE_TOPOLOGY_TEST_MODE: "1", ARIADNE_SYNC_FAIL_AT: "after-lock-create" } });
  assert.notStrictEqual(injected.status, 0); assert.match(injected.stderr, /injected failure/u); fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}

// Every durable boundary is recoverable through explicit resume.
for (const boundary of ["after-lock", "after-manifest", "after-temp", "after-rename", "after-activation", "after-derived", "before-final-check"]) {
  const directory = vault(); const requestFile = disclosedRequest(directory);
  const failed = run([directory, "--write", "--request", requestFile], { env: { ARIADNE_SYNC_FAIL_AFTER: boundary } });
  assert.notStrictEqual(failed.status, 0, boundary);
  const manifestPath = path.join(directory, ".ariadne/scope-topology-operation.json");
  const lockPath = path.join(directory, ".ariadne/scope-topology.lock");
  assert.ok(fs.existsSync(manifestPath) || fs.existsSync(lockPath), boundary);
  const recoveryFile = fs.existsSync(manifestPath) ? manifestPath : lockPath;
  const id = JSON.parse(fs.readFileSync(recoveryFile, "utf8")).operation_id;
  const resumed = run([directory, "--resume", id]); assert.strictEqual(resumed.status, 0, `${boundary}: ${resumed.stderr}`);
  assert.strictEqual(JSON.parse(resumed.stdout).changes.length, 0, boundary);
  assert.ok(!fs.existsSync(manifestPath)); assert.ok(!fs.existsSync(path.join(directory, ".ariadne/scope-topology.lock")));
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}

// Existing locks, including stale-looking locks, are never stolen.
{
  const directory = vault(); const requestFile = disclosedRequest(directory); fs.mkdirSync(path.join(directory, ".ariadne"), { recursive: true });
  fs.writeFileSync(path.join(directory, ".ariadne/scope-topology.lock"), JSON.stringify({ operation_id: "other", pid: 999999, created_at: "2000-01-01T00:00:00.000Z" }));
  const result = run([directory, "--write", "--request", requestFile]); assert.notStrictEqual(result.status, 0); assert.match(result.stderr, /lock exists/u);
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}

// A separate live process holding the exclusive lock excludes a writer.
{
  const directory = vault(); const requestFile = disclosedRequest(directory); fs.mkdirSync(path.join(directory, ".ariadne"), { recursive: true });
  const lockPath = path.join(directory, ".ariadne/scope-topology.lock");
  const holder = spawn(process.execPath, ["-e", `const fs=require("fs");const fd=fs.openSync(process.argv[1],"wx",0o600);fs.writeFileSync(fd,JSON.stringify({operation_id:"live",pid:process.pid}));fs.closeSync(fd);setTimeout(()=>{},30000)`, lockPath]);
  for (let count = 0; count < 100 && !fs.existsSync(lockPath); count += 1) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
  assert.ok(fs.existsSync(lockPath)); const result = run([directory, "--write", "--request", requestFile]); assert.notStrictEqual(result.status, 0); assert.match(result.stderr, /lock exists/u);
  holder.kill("SIGTERM"); fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}

// A changed precondition refuses continuation, and abort reports canonical writes without rolling them back.
{
  const directory = vault(); const requestFile = disclosedRequest(directory);
  const failed = run([directory, "--write", "--request", requestFile], { env: { ARIADNE_SYNC_FAIL_AFTER: "after-manifest" } }); assert.notStrictEqual(failed.status, 0);
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, ".ariadne/scope-topology-operation.json"), "utf8"));
  fs.appendFileSync(path.join(directory, "00 Index.md"), "\nchanged\n");
  const resumed = run([directory, "--resume", manifest.operation_id]); assert.notStrictEqual(resumed.status, 0); assert.match(resumed.stderr, /precondition changed/u);
  const aborted = run([directory, "--abort", manifest.operation_id]); assert.strictEqual(aborted.status, 0, aborted.stderr); assert.ok(Array.isArray(JSON.parse(aborted.stdout).reconciliation_paths));
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}

// Critical recovery protocol: lock-only abort, tamper refusal, and exact CLI mode.
{
  const directory = vault(); const requestFile = disclosedRequest(directory);
  const failed = run([directory, "--write", "--request", requestFile], { env: { ARIADNE_SYNC_FAIL_AT: "after-lock-create" } });
  assert.notStrictEqual(failed.status, 0); const lock = JSON.parse(fs.readFileSync(path.join(directory, ".ariadne/scope-topology.lock"), "utf8"));
  const aborted = run([directory, "--abort", lock.operation_id]); assert.strictEqual(aborted.status, 0, aborted.stderr);
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}

// Pre/post durable mutation windows reconcile from intent, including terminal cleanup.
for (const point of [
  "after-lock-create", "before-manifest-create-temp-open", "after-manifest-create-temp-open", "before-manifest-create-write", "after-manifest-create-write",
  "before-manifest-create-fsync", "after-manifest-create-fsync", "before-manifest-create-rename", "after-manifest-create-rename", "before-manifest-create-dir-fsync", "after-manifest-create-dir-fsync",
  "after-effect-intent", "before-mkdir", "after-mkdir", "before-temp-open", "after-temp-open", "before-temp-write", "after-temp-write", "before-temp-fsync", "after-temp-fsync",
  "before-target-rename", "after-target-rename", "before-target-rename-dir-fsync", "after-target-rename-dir-fsync", "before-effect-complete-rename", "after-effect-complete-rename",
  "before-final-check", "after-terminal-complete", "before-manifest-remove", "after-manifest-remove", "before-manifest-dir-fsync", "after-manifest-dir-fsync", "after-manifest-cleanup", "before-lock-remove",
]) {
  const directory = vault(); const requestFile = disclosedRequest(directory); const failed = run([directory, "--write", "--request", requestFile], { env: { ARIADNE_SYNC_FAIL_AT: point } });
  assert.notStrictEqual(failed.status, 0, point); const lockPath = path.join(directory, ".ariadne/scope-topology.lock"); const manifestPath = path.join(directory, ".ariadne/scope-topology-operation.json");
  const recoveryPath = fs.existsSync(lockPath) ? lockPath : manifestPath; assert.ok(fs.existsSync(recoveryPath), point); const id = JSON.parse(fs.readFileSync(recoveryPath, "utf8")).operation_id;
  const resumed = run([directory, "--resume", id]); assert.strictEqual(resumed.status, 0, `${point}: ${resumed.stderr}`); assert.deepStrictEqual(JSON.parse(resumed.stdout).changes, [], point);
  assert.ok(!fs.existsSync(lockPath) && !fs.existsSync(manifestPath), point); fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}

// A crash after final lock removal has no recovery state because cleanup is complete.
{
  const directory = vault(); const requestFile = disclosedRequest(directory); const failed = run([directory, "--write", "--request", requestFile], { env: { ARIADNE_SYNC_FAIL_AT: "after-lock-remove" } }); assert.notStrictEqual(failed.status, 0);
  assert.ok(!fs.existsSync(path.join(directory, ".ariadne/scope-topology.lock"))); assert.ok(!fs.existsSync(path.join(directory, ".ariadne/scope-topology-operation.json")));
  const checked = run([directory, "--check"]); assert.strictEqual(checked.status, 0, checked.stderr); assert.deepStrictEqual(JSON.parse(checked.stdout).changes, []);
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}

// Manifest-removed/lock-present remains exclusive and recoverable.
{
  const directory = vault(); const requestFile = disclosedRequest(directory); const failed = run([directory, "--write", "--request", requestFile], { env: { ARIADNE_SYNC_FAIL_AT: "after-manifest-cleanup" } }); assert.notStrictEqual(failed.status, 0);
  const lockPath = path.join(directory, ".ariadne/scope-topology.lock"); const lock = JSON.parse(fs.readFileSync(lockPath, "utf8")); assert.ok(!fs.existsSync(path.join(directory, ".ariadne/scope-topology-operation.json")));
  const second = run([directory, "--write", "--request", requestFile]); assert.notStrictEqual(second.status, 0); assert.match(second.stderr, /lock exists/u);
  const resumed = run([directory, "--resume", lock.operation_id]); assert.strictEqual(resumed.status, 0, resumed.stderr); assert.ok(!fs.existsSync(lockPath));
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}

// A successor lock with identical bytes but a different inode is rejected.
{
  const directory = vault(); const requestFile = disclosedRequest(directory); const failed = run([directory, "--write", "--request", requestFile], { env: { ARIADNE_SYNC_FAIL_AT: "after-manifest-cleanup" } }); assert.notStrictEqual(failed.status, 0);
  const lockPath = path.join(directory, ".ariadne/scope-topology.lock"); const bytes = fs.readFileSync(lockPath); const id = JSON.parse(bytes).operation_id; fs.unlinkSync(lockPath); fs.writeFileSync(lockPath, bytes, { mode: 0o600 });
  const resumed = run([directory, "--resume", id]); assert.notStrictEqual(resumed.status, 0); assert.match(resumed.stderr, /lock identity mismatch/u);
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}

{
  const directory = vault(); const requestFile = disclosedRequest(directory);
  const failed = run([directory, "--write", "--request", requestFile], { env: { ARIADNE_SYNC_FAIL_AT: "after-manifest-create" } }); assert.notStrictEqual(failed.status, 0);
  const file = path.join(directory, ".ariadne/scope-topology-operation.json"); const manifest = JSON.parse(fs.readFileSync(file, "utf8")); manifest.temporary_paths = ["victim"]; reseal(manifest);
  fs.writeFileSync(path.join(directory, "victim"), "keep"); fs.writeFileSync(file, JSON.stringify(manifest));
  const aborted = run([directory, "--abort", manifest.operation_id]); assert.notStrictEqual(aborted.status, 0); assert.match(aborted.stderr, /checksum|invalid manifest runtime field/u); assert.strictEqual(fs.readFileSync(path.join(directory, "victim"), "utf8"), "keep");
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}

// Parent pinning refuses an ancestor swapped to a symlink after intent.
{
  const directory = vault(); const requestFile = disclosedRequest(directory); const point = "after-effect-intent:replace:Agent/Scope Map.md";
  const failed = run([directory, "--write", "--request", requestFile], { env: { ARIADNE_SYNC_FAIL_AT: point } }); assert.notStrictEqual(failed.status, 0);
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, ".ariadne/scope-topology-operation.json"), "utf8")); const agent = path.join(directory, "Agent"); fs.renameSync(agent, `${agent}.saved`); const outside = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-outside-")); fs.symlinkSync(outside, agent);
  const resumed = run([directory, "--resume", manifest.operation_id]); assert.notStrictEqual(resumed.status, 0); assert.match(resumed.stderr, /unsafe directory|identity changed/u);
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}

// Resealing cannot turn non-canonical authority fields into valid effects.
for (const mutate of [
  (authority) => { authority.preconditions.pop(); },
  (authority) => { const effect = authority.effects.find((item) => item.type === "replace"); effect.bytes_base64 = Buffer.from("tampered").toString("base64"); effect.sha256 = crypto.createHash("sha256").update("tampered").digest("hex"); },
  (authority) => { authority.effects.find((item) => item.type === "replace").path = "Unexpected.md"; },
  (authority) => { const first = authority.effects.findIndex((item) => item.type === "replace"); [authority.effects[first], authority.effects[first + 1]] = [authority.effects[first + 1], authority.effects[first]]; },
  (authority) => { authority.effects.pop(); },
]) {
  const directory = vault(); const requestFile = disclosedRequest(directory); const failed = run([directory, "--write", "--request", requestFile], { env: { ARIADNE_SYNC_FAIL_AT: "after-manifest-create" } }); assert.notStrictEqual(failed.status, 0); const id = tamperAuthority(directory, mutate);
  const resumed = run([directory, "--resume", id]); assert.notStrictEqual(resumed.status, 0); assert.match(resumed.stderr, /authority|canonical plan/u);
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}
// The control directory itself may not be redirected outside the vault.
{
  const directory = vault(); const requestFile = disclosedRequest(directory); const outside = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-control-outside-")); fs.symlinkSync(outside, path.join(directory, ".ariadne"));
  const written = run([directory, "--write", "--request", requestFile]); assert.notStrictEqual(written.status, 0); assert.deepStrictEqual(fs.readdirSync(outside), []);
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}
// Abort cannot be redirected through a swapped parent to delete an outside lookalike temp.
{
  const directory = vault(); const requestFile = disclosedRequest(directory); const targetPath = "Agent/Scope Map.md"; const point = `after-temp-fsync:${targetPath}`;
  const failed = run([directory, "--write", "--request", requestFile], { env: { ARIADNE_SYNC_FAIL_AT: point } }); assert.notStrictEqual(failed.status, 0); const manifest = JSON.parse(fs.readFileSync(path.join(directory, ".ariadne/scope-topology-operation.json"), "utf8"));
  const index = manifest.authority.effects.findIndex((item) => item.type === "replace" && item.path === targetPath); const effect = manifest.authority.effects[index]; const agent = path.join(directory, "Agent"); fs.renameSync(agent, `${agent}.saved`); const outside = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-abort-outside-")); fs.writeFileSync(path.join(outside, path.basename(effect.temp_path)), Buffer.from(effect.bytes_base64, "base64")); fs.symlinkSync(outside, agent);
  const aborted = run([directory, "--abort", manifest.operation_id]); assert.notStrictEqual(aborted.status, 0); assert.ok(fs.existsSync(path.join(outside, path.basename(effect.temp_path))));
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}
// Reused temporaries must retain their recorded inode, single-link count, and mode 0600.
for (const mutateTemp of [
  (temp) => fs.chmodSync(temp, 0o644),
  (temp) => fs.linkSync(temp, `${temp}.hardlink`),
]) {
  const directory = vault(); const requestFile = disclosedRequest(directory); const failed = run([directory, "--write", "--request", requestFile], { env: { ARIADNE_SYNC_FAIL_AT: "after-temp-fsync" } }); assert.notStrictEqual(failed.status, 0);
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, ".ariadne/scope-topology-operation.json"), "utf8")); const index = manifest.effect_states.findIndex((state) => state.temp_identity); const temp = path.join(directory, ...manifest.authority.effects[index].temp_path.split("/")); mutateTemp(temp);
  const resumed = run([directory, "--resume", manifest.operation_id]); assert.notStrictEqual(resumed.status, 0); assert.match(resumed.stderr, /operation temporary changed/u);
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}

// A move crash after rename is reconciled; a source-parent symlink swap is refused.
{
  const move = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/scope_topology/operations/move.json"), "utf8")); const directory = vault(); const requestFile = requestFileFor(directory, move);
  const failed = run([directory, "--write", "--request", requestFile], { env: { ARIADNE_SYNC_FAIL_AT: "after-move-rename" } }); assert.notStrictEqual(failed.status, 0); const manifest = JSON.parse(fs.readFileSync(path.join(directory, ".ariadne/scope-topology-operation.json"), "utf8"));
  const resumed = run([directory, "--resume", manifest.operation_id]); assert.strictEqual(resumed.status, 0, resumed.stderr); assert.deepStrictEqual(JSON.parse(resumed.stdout).changes, []);
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}
// A cloned destination with matching bytes but a different root inode is not a completed move.
{
  const move = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/scope_topology/operations/move.json"), "utf8")); const directory = vault(); const requestFile = requestFileFor(directory, move);
  const failed = run([directory, "--write", "--request", requestFile], { env: { ARIADNE_SYNC_FAIL_AT: "after-move-rename" } }); assert.notStrictEqual(failed.status, 0); const manifest = JSON.parse(fs.readFileSync(path.join(directory, ".ariadne/scope-topology-operation.json"), "utf8")); const destination = path.join(directory, move.destination_path); const clone = `${destination}.clone`; fs.cpSync(destination, clone, { recursive: true }); fs.rmSync(destination, { recursive: true }); fs.renameSync(clone, destination);
  const resumed = run([directory, "--resume", manifest.operation_id]); assert.notStrictEqual(resumed.status, 0); assert.match(resumed.stderr, /moved destination changed/u);
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}
{
  const move = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/scope_topology/operations/move.json"), "utf8")); const directory = vault(); const requestFile = requestFileFor(directory, move); const point = `after-effect-intent:move:${move.source_path}`;
  const failed = run([directory, "--write", "--request", requestFile], { env: { ARIADNE_SYNC_FAIL_AT: point } }); assert.notStrictEqual(failed.status, 0); const manifest = JSON.parse(fs.readFileSync(path.join(directory, ".ariadne/scope-topology-operation.json"), "utf8"));
  const parent = path.dirname(path.join(directory, move.source_path)); fs.renameSync(parent, `${parent}.saved`); const outside = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-move-outside-")); fs.symlinkSync(outside, parent);
  const resumed = run([directory, "--resume", manifest.operation_id]); assert.notStrictEqual(resumed.status, 0);
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}
{
  const directory = vault(); const result = run([directory, "--check", "--abort", "x"]); assert.notStrictEqual(result.status, 0); assert.match(result.stderr, /exactly one/u); fs.rmSync(directory, { recursive: true, force: true });
}

// Discoverable candidate stages recover every pre-lock crash without vault orphans.
for (const point of [
  "before-candidate-open", "after-candidate-open", "before-candidate-partial-write", "after-candidate-partial-write", "after-candidate-full-write",
  "before-candidate-fsync", "after-candidate-fsync", "before-candidate-stage-dir-fsync", "after-candidate-stage-dir-fsync",
  "before-candidate-link", "after-candidate-link", "before-lock-create", "after-lock-create",
]) {
  const directory = vault(); const requestFile = disclosedRequest(directory); const failed = run([directory, "--write", "--request", requestFile], { env: { ARIADNE_SYNC_FAIL_AT: point } }); assert.notStrictEqual(failed.status, 0, point);
  const successor = run([directory, "--write", "--request", requestFile]); const lockPath = path.join(directory, ".ariadne/scope-topology.lock");
  if (successor.status !== 0) { assert.ok(fs.existsSync(lockPath), `${point}: ${successor.stderr}`); const id = JSON.parse(fs.readFileSync(lockPath, "utf8")).operation_id; const resumed = run([directory, "--resume", id]); assert.strictEqual(resumed.status, 0, `${point}: ${resumed.stderr}`); }
  const leftovers = fs.existsSync(path.join(directory, ".ariadne")) ? fs.readdirSync(path.join(directory, ".ariadne")).filter((name) => name.includes("candidate") || name === "scope-topology.lock" || name === "scope-topology-operation.json") : [];
  assert.deepStrictEqual(leftovers, [], point); fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}

// A live pre-election stage is not touched; another contender may atomically win.
{
  const directory = vault(); const requestFile = disclosedRequest(directory); const child = spawn(process.execPath, [cli, directory, "--write", "--request", requestFile], { env: { ...process.env, ARIADNE_SCOPE_TOPOLOGY_TEST_MODE: "1", ARIADNE_SYNC_PAUSE_AT: "after-candidate-open" }, stdio: "ignore" }); const control = path.join(directory, ".ariadne");
  for (let count = 0; count < 200 && (!fs.existsSync(control) || !fs.readdirSync(control).some((name) => name.startsWith("scope-topology.candidate-stage-"))); count += 1) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
  const concurrent = run([directory, "--write", "--request", requestFile]); assert.strictEqual(concurrent.status, 0, concurrent.stderr); assert.ok(fs.readdirSync(control).some((name) => name.startsWith("scope-topology.candidate-stage-"))); child.kill("SIGTERM");
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}

// Two fully prepared contenders cross one barrier; atomic link elects exactly one.
{
  const directory = vault(); const requestFile = disclosedRequest(directory); const control = path.join(directory, ".ariadne"); fs.mkdirSync(control); const release = path.join(os.tmpdir(), `ariadne-release-${crypto.randomUUID()}`); const resultRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-race-results-")); const children = [];
  for (const name of ["a", "b"]) {
    const output = path.join(resultRoot, `${name}.out`); const error = path.join(resultRoot, `${name}.err`); const status = path.join(resultRoot, `${name}.status`);
    children.push({ status, child: spawn("sh", ["-c", '"$1" "$2" "$3" --write --request "$4" >"$5" 2>"$6"; echo $? >"$7"', "sh", process.execPath, cli, directory, requestFile, output, error, status], { env: { ...process.env, ARIADNE_SCOPE_TOPOLOGY_TEST_MODE: "1", ARIADNE_SYNC_CANDIDATE_RELEASE: release }, stdio: "ignore" }) });
  }
  for (let count = 0; count < 500 && fs.readdirSync(control).filter((name) => name.startsWith("scope-topology.candidate-stage-")).length < 2; count += 1) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
  assert.strictEqual(fs.readdirSync(control).filter((name) => name.startsWith("scope-topology.candidate-stage-")).length, 2); fs.writeFileSync(release, "go");
  for (let count = 0; count < 1000 && children.some((item) => !fs.existsSync(item.status)); count += 1) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
  assert.deepStrictEqual(children.map((item) => Number(fs.readFileSync(item.status, "utf8"))).sort(), [0, 1]); assert.ok(!fs.readdirSync(control).some((name) => name.includes("candidate") || name === "scope-topology.lock" || name === "scope-topology-operation.json"));
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(resultRoot, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true }); fs.rmSync(release, { force: true });
}

// Recovery deterministically elects one of multiple dead valid stages and removes losers.
{
  const directory = vault(); const requestFile = disclosedRequest(directory); const failed = run([directory, "--write", "--request", requestFile], { env: { ARIADNE_SYNC_FAIL_AT: "before-candidate-link" } }); assert.notStrictEqual(failed.status, 0); const control = path.join(directory, ".ariadne"); const originalName = fs.readdirSync(control).find((name) => name.startsWith("scope-topology.candidate-stage-")); const original = JSON.parse(fs.readFileSync(path.join(control, originalName), "utf8")); const clone = structuredClone(original); const oldId = clone.operation_id; const newId = crypto.randomUUID(); clone.operation_id = newId; clone.effects.filter((item) => item.type === "replace").forEach((item) => { item.temp_path = item.temp_path.replace(oldId, newId); }); const clonePath = path.join(control, `scope-topology.candidate-stage-${newId}-2147483647`); fs.writeFileSync(clonePath, "", { mode: 0o600 }); const stat = fs.lstatSync(clonePath); clone.lock_identity = { dev: stat.dev, ino: stat.ino }; reseal(clone); fs.writeFileSync(clonePath, JSON.stringify(clone));
  const successor = run([directory, "--write", "--request", requestFile]); assert.notStrictEqual(successor.status, 0); const lockPath = path.join(control, "scope-topology.lock"); assert.ok(fs.existsSync(lockPath)); const id = JSON.parse(fs.readFileSync(lockPath, "utf8")).operation_id; const resumed = run([directory, "--resume", id]); assert.strictEqual(resumed.status, 0, resumed.stderr); assert.ok(!fs.readdirSync(control).some((name) => name.includes("candidate")));
  fs.rmSync(directory, { recursive: true, force: true }); fs.rmSync(requestFile, { force: true });
}

console.log("scope topology failure tests passed");
