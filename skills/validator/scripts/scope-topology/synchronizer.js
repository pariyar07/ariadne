"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { inventoryVault } = require("./inventory");
const { buildTopology } = require("./model");
const { scopeFindings, filterFindingsByScope } = require("./findings");
const { parseOperationRequest, planOperation, hashPlan } = require("./operations");
const { replaceMarkerBlock } = require("./markers");

const LOCK = ".ariadne/scope-topology.lock";
const MANIFEST = ".ariadne/scope-topology-operation.json";
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const sort = (items) => [...items].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
function absolute(root, relative) { return path.join(root, ...relative.split("/")); }
function control(root, name) { return absolute(root, name); }
function ensureControl(root) { fs.mkdirSync(path.join(root, ".ariadne"), { recursive: true, mode: 0o700 }); }
function fsyncDirectory(directory) { const fd = fs.openSync(directory, "r"); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } }
function inject(boundary) { if (process.env.ARIADNE_SYNC_FAIL_AFTER === boundary) throw new Error(`injected failure: ${boundary}`); }
function bytesOf(item) { return Buffer.isBuffer(item.bytes) ? item.bytes : Buffer.from(item.bytes); }
function currentHash(file) { try { const stat = fs.lstatSync(file); return stat.isFile() && !stat.isSymbolicLink() ? sha(fs.readFileSync(file)) : null; } catch (error) { if (error.code === "ENOENT") return null; throw error; } }

function outputBytes(root, item, prior = null) {
  const desired = bytesOf(item); if (item.kind !== "checkpoint") return desired;
  const target = absolute(root, item.path); if (prior === null && !fs.existsSync(target)) return desired;
  const match = desired.toString("utf8").match(/^<!-- ariadne:([a-z0-9-]+):start -->\n([\s\S]*)\n<!-- ariadne:\1:end -->\n$/u);
  if (!match) throw new Error(`invalid checkpoint output: ${item.path}`);
  const existing = prior === null ? fs.readFileSync(target) : prior;
  if (!existing.includes(Buffer.from("<!-- ariadne:"))) {
    const separator = existing.length === 0 || existing.at(-1) === 0x0a ? "" : "\n";
    return Buffer.concat([existing, Buffer.from(`${separator}${desired.toString("utf8")}`)]);
  }
  return replaceMarkerBlock(existing, match[1], match[2]);
}
function desiredChanges(root, plan) {
  const combined = new Map();
  for (const item of plan.replacements) {
    const prior = combined.has(item.path) ? combined.get(item.path).bytes : null;
    combined.set(item.path, { item: { ...item, activation: item.activation === true || (combined.get(item.path) || {}).item?.activation === true }, bytes: outputBytes(root, item, prior) });
  }
  return [...combined.values()].filter(({ item, bytes }) => currentHash(absolute(root, item.path)) !== sha(bytes))
    .map(({ item, bytes }) => ({ path: item.path, kind: item.kind, sha256: sha(bytes), activation: item.activation === true, bytes }));
}

function checkTopology(vaultRoot, options = {}) {
  const inventory = inventoryVault(vaultRoot); const topology = buildTopology(inventory);
  let findings = scopeFindings(topology, inventory);
  if (options.scope) {
    const descriptor = [...topology.descriptorsById.values()].find((item) => item.scopePath === options.scope || item.scopeId === options.scope);
    findings = filterFindingsByScope(findings, descriptor ? descriptor.scopeId : options.scope, topology);
  }
  const request = parseOperationRequest(options.request || { operation_schema: 1, operation: "repair", target_scope_id: topology.descriptorsById.has("root") ? "root" : (topology.pendingDescriptors[0] || {}).scopeId, normalize_files: [], allowed_write_paths: [] });
  const plan = planOperation(inventory, topology, request);
  return { findings, changes: desiredChanges(inventory.root, plan).map(({ bytes: _bytes, ...item }) => item), content_write_paths: plan.content_write_paths, plan_hash: hashPlan(plan) };
}

function writeJsonDurable(file, value) {
  const temp = `${file}.tmp-${process.pid}-${crypto.randomUUID()}`; const fd = fs.openSync(temp, "wx", 0o600);
  try { fs.writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temp, file);
  fsyncDirectory(path.dirname(file));
}
function saveManifest(root, manifest) { manifest.updated_at = new Date().toISOString(); writeJsonDurable(control(root, MANIFEST), manifest); }
function loadManifest(root) { return JSON.parse(fs.readFileSync(control(root, MANIFEST), "utf8")); }
function acquire(root, operationId) {
  ensureControl(root); const file = control(root, LOCK); let fd;
  try { fd = fs.openSync(file, "wx", 0o600); } catch (error) { if (error.code === "EEXIST") throw new Error("scope topology lock exists; use explicit --resume or --abort"); throw error; }
  try { fs.writeFileSync(fd, `${JSON.stringify({ operation_id: operationId, pid: process.pid, created_at: new Date().toISOString() })}\n`); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fsyncDirectory(path.dirname(file));
}
function validateContained(root, relative, allowMissing = true) {
  const target = absolute(root, relative); const parent = path.dirname(target); const canonicalRoot = fs.realpathSync(root); const canonicalParent = fs.realpathSync(parent);
  if (canonicalParent !== canonicalRoot && !canonicalParent.startsWith(`${canonicalRoot}${path.sep}`)) throw new Error(`path escapes vault: ${relative}`);
  try { const stat = fs.lstatSync(target); if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error(`unsafe replacement target: ${relative}`); return stat; }
  catch (error) { if (allowMissing && error.code === "ENOENT") return null; throw error; }
}
function validatePrecondition(root, expected) {
  const actual = currentHash(absolute(root, expected.path));
  if (actual !== expected.sha256) throw new Error(`precondition changed: ${expected.path}`);
}
function effectivePreconditionPath(manifest, originalPath) {
  for (const move of manifest.moves) if (manifest.completed_moves.includes(move.destination_path) && (originalPath === move.source_path || originalPath.startsWith(`${move.source_path}/`))) return `${move.destination_path}${originalPath.slice(move.source_path.length)}`;
  return originalPath;
}
function outputPrecondition(manifest, outputPath) {
  const movedAway = manifest.moves.some((move) => manifest.completed_moves.includes(move.destination_path) && (outputPath === move.source_path || outputPath.startsWith(`${move.source_path}/`)));
  const direct = manifest.preconditions.find((item) => item.path === outputPath); if (direct && !movedAway) return direct;
  for (const move of manifest.moves) if (manifest.completed_moves.includes(move.destination_path) && (outputPath === move.destination_path || outputPath.startsWith(`${move.destination_path}/`))) {
    const original = `${move.source_path}${outputPath.slice(move.destination_path.length)}`; return manifest.preconditions.find((item) => item.path === original) || null;
  }
  return null;
}
function verifyOperation(root, manifest) {
  if (manifest.operation_schema !== 1 || hashPlan(manifest.request) !== manifest.request_hash) throw new Error("operation manifest request hash mismatch");
  if (hashPlan(manifest.plan) !== manifest.plan_hash) throw new Error("operation manifest plan hash mismatch");
  for (const done of manifest.completed_replacements) if (currentHash(absolute(root, done.path)) !== done.sha256) throw new Error(`completed output changed: ${done.path}`);
  for (const precondition of manifest.preconditions) {
    const effectivePath = effectivePreconditionPath(manifest, precondition.path);
    if (!manifest.completed_replacements.some((item) => item.path === effectivePath) && currentHash(absolute(root, effectivePath)) !== precondition.sha256) throw new Error(`precondition changed: ${effectivePath}`);
  }
}
function safeReplace(root, manifest, output) {
  const target = absolute(root, output.path); fs.mkdirSync(path.dirname(target), { recursive: true });
  const before = validateContained(root, output.path); const expected = outputPrecondition(manifest, output.path);
  if (expected && currentHash(target) !== expected.sha256) throw new Error(`precondition changed: ${output.path}`); else if (!expected && before) throw new Error(`unexpected destination collision: ${output.path}`);
  const temp = `${target}.ariadne-tmp-${manifest.operation_id}`;
  if (fs.existsSync(temp)) {
    const stat = fs.lstatSync(temp); if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || currentHash(temp) !== output.sha256 || !manifest.temporary_paths.includes(path.relative(root, temp).split(path.sep).join("/"))) throw new Error(`temporary destination collision: ${output.path}`);
  } else {
    const fd = fs.openSync(temp, "wx", 0o600); manifest.temporary_paths.push(path.relative(root, temp).split(path.sep).join("/")); saveManifest(root, manifest);
    try { fs.writeFileSync(fd, Buffer.from(output.bytes_base64, "base64")); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    inject("after-temp");
  }
  validateContained(root, output.path); if (before) { const now = fs.lstatSync(target); if (now.dev !== before.dev || now.ino !== before.ino) throw new Error(`target identity changed: ${output.path}`); }
  fs.renameSync(temp, target); fsyncDirectory(path.dirname(target)); manifest.temporary_paths = manifest.temporary_paths.filter((item) => absolute(root, item) !== temp);
  manifest.completed_replacements.push({ path: output.path, sha256: output.sha256 }); saveManifest(root, manifest); inject("after-rename");
  if (output.activation) { manifest.activation_state = "activated"; saveManifest(root, manifest); inject("after-activation"); }
  if (["generated", "checkpoint"].includes(output.kind)) inject("after-derived");
}
function continueOperation(root, manifest) {
  verifyOperation(root, manifest);
  for (const move of manifest.moves) {
    if (manifest.completed_moves.includes(move.destination_path)) continue;
    const source = absolute(root, move.source_path); const destination = absolute(root, move.destination_path);
    const stat = fs.lstatSync(source); if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`unsafe move source: ${move.source_path}`);
    if (fs.existsSync(destination)) throw new Error(`move destination collision: ${move.destination_path}`);
    fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.renameSync(source, destination); fsyncDirectory(path.dirname(source)); if (path.dirname(source) !== path.dirname(destination)) fsyncDirectory(path.dirname(destination)); manifest.completed_moves.push(move.destination_path); saveManifest(root, manifest); inject("after-rename");
  }
  manifest.phase = "replacing"; saveManifest(root, manifest);
  for (const output of manifest.expected_outputs) if (!manifest.completed_replacements.some((item) => item.path === output.path)) safeReplace(root, manifest, output);
  if (manifest.activation_state === "pending") { manifest.activation_state = "not-applicable"; saveManifest(root, manifest); inject("after-activation"); }
  manifest.phase = "verifying"; saveManifest(root, manifest); inject("before-final-check");
  const final = checkTopology(root);
  if (final.changes.length) throw new Error(`final check proposed changes: ${final.changes.map((item) => item.path).join(", ")}`);
  fs.rmSync(control(root, MANIFEST)); fs.rmSync(control(root, LOCK));
  return final;
}

function applyOperation(vaultRoot, requestValue) {
  const root = fs.realpathSync(vaultRoot); const request = parseOperationRequest(requestValue); const inventory = inventoryVault(root); const plan = planOperation(inventory, buildTopology(inventory), request);
  if (!plan.write_authorized) throw new Error(`operation is not write-authorized: ${plan.refusals.map((item) => `${item.code}:${item.path}`).join(", ")}`);
  const operationId = crypto.randomUUID(); acquire(root, operationId);
  const changes = desiredChanges(root, plan); const outputs = changes.map(({ bytes, ...change }) => ({ ...change, bytes_base64: bytes.toString("base64") }));
  const manifest = { operation_schema: 1, operation_id: operationId, request, request_hash: hashPlan(request), plan: JSON.parse(JSON.stringify(plan, (_key, value) => Buffer.isBuffer(value) ? value.toString("utf8") : value)), plan_hash: hashPlan(plan), phase: "prepared", allowed_content_paths: request.allowed_write_paths, preconditions: plan.preconditions, expected_outputs: outputs, completed_replacements: [], moves: plan.moves, completed_moves: [], activation_state: "pending", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), temporary_paths: [] };
  // Hash the persisted representation, which is the recovery authority.
  manifest.plan_hash = hashPlan(manifest.plan); saveManifest(root, manifest); inject("after-lock"); inject("after-manifest"); return continueOperation(root, manifest);
}
function resumeOperation(vaultRoot, operationId) {
  const root = fs.realpathSync(vaultRoot); const manifest = loadManifest(root); if (manifest.operation_id !== operationId) throw new Error("operation ID does not match manifest");
  const lock = JSON.parse(fs.readFileSync(control(root, LOCK), "utf8")); if (lock.operation_id !== operationId) throw new Error("lock operation ID does not match manifest");
  return continueOperation(root, manifest);
}
function abortOperation(vaultRoot, operationId) {
  const root = fs.realpathSync(vaultRoot); const manifest = loadManifest(root); if (manifest.operation_id !== operationId) throw new Error("operation ID does not match manifest");
  for (const relative of manifest.temporary_paths) { const file = absolute(root, relative); try { const stat = fs.lstatSync(file); if (stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1) fs.rmSync(file); } catch (error) { if (error.code !== "ENOENT") throw error; } }
  const reconciliation_paths = sort(manifest.completed_replacements.map((item) => item.path).concat(manifest.completed_moves));
  fs.rmSync(control(root, MANIFEST)); fs.rmSync(control(root, LOCK)); return { aborted: true, operation_id: operationId, reconciliation_paths };
}

module.exports = { abortOperation, applyOperation, checkTopology, resumeOperation };
