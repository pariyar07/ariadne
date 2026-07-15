#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../../..");
const cli = path.join(root, "skills/validator/scripts/sync_scope_topology.js");
const source = path.join(__dirname, "fixtures/scope_topology/deep_transparent_ancestry");
const operation = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/scope_topology/operations/repair.json"), "utf8"));

function vault() {
  const value = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-sync-"));
  fs.cpSync(source, value, { recursive: true });
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
function run(args, options = {}) { return spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", env: { ...process.env, ...options.env } }); }

// Check mode is byte-for-byte and metadata zero-write.
{
  const directory = vault(); const before = hashTree(directory);
  const result = run([directory, "--check"]);
  assert.strictEqual(result.status, 0, result.stderr); assert.ok(JSON.parse(result.stdout).changes.length > 0);
  assert.strictEqual(hashTree(directory), before); fs.rmSync(directory, { recursive: true, force: true });
}

// Every durable boundary is recoverable through explicit resume.
for (const boundary of ["after-lock", "after-manifest", "after-temp", "after-rename", "after-activation", "after-derived", "before-final-check"]) {
  const directory = vault(); const requestFile = disclosedRequest(directory);
  const failed = run([directory, "--write", "--request", requestFile], { env: { ARIADNE_SYNC_FAIL_AFTER: boundary } });
  assert.notStrictEqual(failed.status, 0, boundary);
  const manifestPath = path.join(directory, ".ariadne/scope-topology-operation.json");
  assert.ok(fs.existsSync(manifestPath), boundary);
  const id = JSON.parse(fs.readFileSync(manifestPath, "utf8")).operation_id;
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

console.log("scope topology failure tests passed");
