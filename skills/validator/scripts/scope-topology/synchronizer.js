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
const CANDIDATE = ".ariadne/scope-topology.lock.candidate";
const STAGE_PREFIX = "scope-topology.candidate-stage-";
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const posix = (value) => value.split(path.sep).join("/");
const absolute = (root, relative) => path.join(root, ...relative.split("/"));
const control = (root, relative) => absolute(root, relative);
const stableHash = (value) => hashPlan(value);
const candidateStage = (root, operationId, pid = process.pid) => path.join(root, ".ariadne", `${STAGE_PREFIX}${operationId}-${pid}`);
function failpoint(name, legacy = null) { if (process.env.ARIADNE_SYNC_PAUSE_AT === name) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 30000); if (process.env.ARIADNE_SYNC_FAIL_AT === name || process.env.ARIADNE_SYNC_FAIL_AFTER === name || legacy && process.env.ARIADNE_SYNC_FAIL_AFTER === legacy) throw new Error(`injected failure: ${name}`); }
function fsyncDirectory(directory, label) { failpoint(`before-${label}-dir-fsync`); const fd = fs.openSync(directory, "r"); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } failpoint(`after-${label}-dir-fsync`); }
function safeUnlink(file, label) { failpoint(`before-${label}-remove`); try { fs.unlinkSync(file); } catch (error) { if (error.code !== "ENOENT") throw error; } failpoint(`after-${label}-remove`); fsyncDirectory(path.dirname(file), label); }
function regularIdentity(file, maxLinks = 1) { const stat = fs.lstatSync(file); if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink < 1 || stat.nlink > maxLinks) throw new Error(`unsafe control file: ${file}`); return { dev: stat.dev, ino: stat.ino }; }
function unlinkIdentity(file, expected, label) { const current = regularIdentity(file); if (current.dev !== expected.dev || current.ino !== expected.ino) throw new Error(`control file identity changed: ${file}`); safeUnlink(file, label); }
function bytesOf(item) { if (Buffer.isBuffer(item.bytes)) return item.bytes; if (item.bytes && item.bytes.type === "Buffer" && Array.isArray(item.bytes.data)) return Buffer.from(item.bytes.data); return Buffer.from(item.bytes); }
function fileHash(file) { try { const stat = fs.lstatSync(file); return stat.isFile() && !stat.isSymbolicLink() ? sha(fs.readFileSync(file)) : null; } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
function checksum(value) { const copy = { ...value }; delete copy.checksum; return stableHash(copy); }
function seal(value) { value.checksum = checksum(value); return value; }
function validateChecksum(value, label) { if (!value || typeof value !== "object" || typeof value.checksum !== "string" || checksum(value) !== value.checksum) throw new Error(`${label} checksum mismatch`); }

function checkpointBytes(root, item, prior = null) {
  const desired = bytesOf(item); if (item.kind !== "checkpoint") return desired;
  const target = absolute(root, item.path); if (prior === null && !fs.existsSync(target)) return desired;
  const match = desired.toString("utf8").match(/^<!-- ariadne:([a-z0-9-]+):start -->\n([\s\S]*)\n<!-- ariadne:\1:end -->\n$/u);
  if (!match) throw new Error(`invalid checkpoint output: ${item.path}`);
  const existing = prior === null ? fs.readFileSync(target) : prior;
  if (!existing.includes(Buffer.from("<!-- ariadne:"))) return Buffer.concat([existing, Buffer.from(`${existing.length && existing.at(-1) !== 0x0a ? "\n" : ""}${desired}`)]);
  return replaceMarkerBlock(existing, match[1], match[2]);
}
function checkpointBytesFrom(item, existing) {
  const desired = bytesOf(item); if (item.kind !== "checkpoint" || existing === null) return desired;
  const match = desired.toString("utf8").match(/^<!-- ariadne:([a-z0-9-]+):start -->\n([\s\S]*)\n<!-- ariadne:\1:end -->\n$/u); if (!match) throw new Error(`invalid checkpoint output: ${item.path}`);
  if (!existing.includes(Buffer.from("<!-- ariadne:"))) return Buffer.concat([existing, Buffer.from(`${existing.length && existing.at(-1) !== 0x0a ? "\n" : ""}${desired}`)]);
  return replaceMarkerBlock(existing, match[1], match[2]);
}
function desiredChanges(root, plan) {
  const combined = new Map();
  for (const item of plan.replacements) {
    const previous = combined.get(item.path); const bytes = checkpointBytes(root, item, previous ? previous.bytes : null);
    combined.set(item.path, { item: { ...item, activation: item.activation === true || Boolean(previous && previous.item.activation) }, bytes });
  }
  return [...combined.values()].filter(({ item, bytes }) => fileHash(absolute(root, item.path)) !== sha(bytes))
    .map(({ item, bytes }) => ({ path: item.path, kind: item.kind, activation: item.activation === true, sha256: sha(bytes), bytes_base64: bytes.toString("base64") }));
}
function checkTopology(vaultRoot, options = {}) {
  const inventory = inventoryVault(vaultRoot); const topology = buildTopology(inventory); let findings = scopeFindings(topology, inventory);
  if (options.scope) { const descriptor = [...topology.descriptorsById.values()].find((item) => item.scopePath === options.scope || item.scopeId === options.scope); findings = filterFindingsByScope(findings, descriptor ? descriptor.scopeId : options.scope, topology); }
  const target = topology.descriptorsById.has("root") ? "root" : (topology.pendingDescriptors[0] || {}).scopeId;
  if (!target) return { findings, changes: [], content_write_paths: [], plan_hash: null };
  const request = parseOperationRequest(options.request || { operation_schema: 1, operation: "repair", target_scope_id: target, normalize_files: [], allowed_write_paths: [] });
  const plan = planOperation(inventory, topology, request);
  return { findings, changes: desiredChanges(inventory.root, plan).map(({ bytes_base64: _bytes, ...item }) => item), content_write_paths: plan.content_write_paths, plan_hash: hashPlan(plan) };
}

function pinDirectory(root, directory) {
  const canonicalRoot = fs.realpathSync(root); const canonical = fs.realpathSync(directory); const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || canonical !== canonicalRoot && !canonical.startsWith(`${canonicalRoot}${path.sep}`)) throw new Error(`unsafe directory: ${directory}`);
  return { path: posix(path.relative(root, directory)) || ".", canonical, dev: stat.dev, ino: stat.ino };
}
function validatePin(root, pin) {
  const directory = pin.path === "." ? root : absolute(root, pin.path); const current = pinDirectory(root, directory);
  if (current.canonical !== pin.canonical || current.dev !== pin.dev || current.ino !== pin.ino) throw new Error(`directory identity changed: ${pin.path}`);
}
function deterministicTemp(output, operationId, index) { const target = output.path; return posix(path.join(path.dirname(target), `.${path.basename(target)}.ariadne-${operationId}-${index}.tmp`)); }
function treeIdentity(root, relative) {
  const base = absolute(root, relative); const rootPin = pinDirectory(root, base); const rows = [];
  function walk(directory, prefix = "") { for (const name of fs.readdirSync(directory).sort((a, b) => Buffer.from(a).compare(Buffer.from(b)))) { const file = path.join(directory, name); const rel = posix(path.join(prefix, name)); const stat = fs.lstatSync(file); if (stat.isSymbolicLink()) throw new Error(`symlink in move source: ${relative}/${rel}`); if (stat.isDirectory()) { rows.push(`d:${rel}:${stat.mode}`); walk(file, rel); } else if (stat.isFile() && stat.nlink === 1) rows.push(`f:${rel}:${stat.mode}:${sha(fs.readFileSync(file))}`); else throw new Error(`unsafe move entry: ${relative}/${rel}`); } }
  walk(base); return { ...rootPin, tree_hash: sha(rows.join("\n")) };
}
function existingAncestor(root, directory) { let current = directory; while (!fs.existsSync(current)) current = path.dirname(current); return pinDirectory(root, current); }
function deriveOutputs(plan, initialFiles) {
  const inputs = new Map(initialFiles.map((item) => [item.path, item.bytes_base64 === null ? null : Buffer.from(item.bytes_base64, "base64")])); const combined = new Map();
  for (const item of plan.replacements) { const previous = combined.get(item.path); const bytes = checkpointBytesFrom(item, previous ? previous.bytes : (inputs.has(item.path) ? inputs.get(item.path) : null)); combined.set(item.path, { item: { ...item, activation: item.activation === true || Boolean(previous && previous.item.activation) }, bytes }); }
  return [...combined.values()].filter(({ item, bytes }) => sha(bytes) !== ((initialFiles.find((input) => input.path === item.path) || {}).sha256 || null))
    .map(({ item, bytes }) => ({ path: item.path, kind: item.kind, activation: item.activation === true, sha256: sha(bytes), bytes_base64: bytes.toString("base64") }))
    .sort((left, right) => Number(left.activation) - Number(right.activation));
}
function canonicalDirectories(request, plan) {
  const known = new Set(); const addAncestors = (value, include) => { let current = include ? value : path.posix.dirname(value); while (current !== ".") { known.add(current); current = path.posix.dirname(current); } };
  for (const item of plan.preconditions) addAncestors(item.path, false); if (request.operation === "create") addAncestors(request.destination_path, true); if (request.source_path) addAncestors(request.source_path, true); return known;
}
function deriveEffects(operationId, request, plan, initialFiles, moveIdentities) {
  const outputs = deriveOutputs(plan, initialFiles); const directories = new Set(); const knownDirectories = canonicalDirectories(request, plan); const moveDestinations = new Set(plan.moves.map((item) => item.destination_path));
  for (const output of outputs) { let current = path.posix.dirname(output.path); while (current !== "." && !knownDirectories.has(current)) { if (!moveDestinations.has(current)) directories.add(current); current = path.posix.dirname(current); } }
  for (const move of plan.moves) if (outputs.some((output) => output.path === move.source_path || output.path.startsWith(`${move.source_path}/`))) directories.add(move.source_path);
  for (const move of plan.moves) { let current = path.posix.dirname(move.destination_path); while (current !== "." && !knownDirectories.has(current)) { directories.add(current); current = path.posix.dirname(current); } }
  const effects = [];
  for (const move of plan.moves) effects.push({ type: "move", ...move, source_identity: moveIdentities.find((item) => item.source_path === move.source_path).identity });
  for (const directory of [...directories].sort((a, b) => a.split("/").length - b.split("/").length || Buffer.from(a).compare(Buffer.from(b)))) effects.push({ type: "mkdir", path: directory });
  outputs.forEach((output, index) => effects.push({ type: "replace", ...output, temp_path: deterministicTemp(output, operationId, index) }));
  return effects;
}
function buildAuthority(root, operationId, request, plan, controlPin, inventory) {
  const persistedPlan = JSON.parse(JSON.stringify(plan));
  const replacementPaths = [...new Set(plan.replacements.map((item) => item.path))]; const initialFiles = replacementPaths.map((itemPath) => { const file = inventory.files.find((item) => item.relativePath === itemPath); return { path: itemPath, sha256: file ? file.contentHash : null, bytes_base64: file ? file.rawBytes.toString("base64") : null }; });
  const moveIdentities = plan.moves.map((move) => ({ source_path: move.source_path, identity: treeIdentity(root, move.source_path) }));
  const effects = deriveEffects(operationId, request, persistedPlan, initialFiles, moveIdentities);
  return seal({ authority_schema: 1, operation_id: operationId, request, request_hash: stableHash(request), plan: persistedPlan, plan_hash: stableHash(persistedPlan), control_pin: controlPin, lock_identity: null, allowed_content_paths: request.allowed_write_paths, preconditions: plan.preconditions, initial_files: initialFiles, move_identities: moveIdentities, effects });
}
function validateAuthority(authority) {
  validateChecksum(authority, "authority"); if (authority.authority_schema !== 1 || typeof authority.operation_id !== "string") throw new Error("invalid operation authority");
  const authorityFields = new Set(["authority_schema", "operation_id", "request", "request_hash", "plan", "plan_hash", "control_pin", "lock_identity", "allowed_content_paths", "preconditions", "initial_files", "move_identities", "effects", "checksum"]); for (const key of Object.keys(authority)) if (!authorityFields.has(key)) throw new Error(`invalid authority field: ${key}`);
  if (!authority.control_pin || authority.control_pin.path !== ".ariadne" || typeof authority.control_pin.dev !== "number" || typeof authority.control_pin.ino !== "number") throw new Error("invalid authority control pin");
  if (!authority.lock_identity || typeof authority.lock_identity.dev !== "number" || typeof authority.lock_identity.ino !== "number") throw new Error("invalid authority lock identity");
  const request = parseOperationRequest(authority.request); if (stableHash(request) !== authority.request_hash || stableHash(authority.plan) !== authority.plan_hash) throw new Error("operation authority hash mismatch");
  if (authority.plan.operation !== request.operation || authority.plan.target_scope_id !== request.target_scope_id || authority.plan.write_authorized !== true || authority.plan.refusals.length !== 0 || stableHash(request.allowed_write_paths) !== stableHash(authority.allowed_content_paths) || stableHash(authority.plan.content_write_paths) !== stableHash(request.allowed_write_paths) || stableHash(authority.preconditions) !== stableHash(authority.plan.preconditions)) throw new Error("operation authority plan mismatch");
  if (!Array.isArray(authority.initial_files) || new Set(authority.initial_files.map((item) => item.path)).size !== authority.initial_files.length) throw new Error("invalid authority initial inventory");
  const replacementPaths = [...new Set(authority.plan.replacements.map((item) => item.path))]; if (stableHash(authority.initial_files.map((item) => item.path)) !== stableHash(replacementPaths)) throw new Error("authority initial files are incomplete");
  for (const input of authority.initial_files) { if (input.bytes_base64 === null ? input.sha256 !== null : sha(Buffer.from(input.bytes_base64, "base64")) !== input.sha256) throw new Error("authority initial file hash mismatch"); const planned = authority.preconditions.find((item) => item.path === input.path); if ((planned || {}).sha256 !== (input.sha256 || undefined) && input.sha256 !== null) throw new Error("authority initial precondition mismatch"); }
  if (stableHash(authority.move_identities.map((item) => item.source_path)) !== stableHash(authority.plan.moves.map((item) => item.source_path))) throw new Error("authority move identities mismatch");
  const expectedEffects = deriveEffects(authority.operation_id, request, authority.plan, authority.initial_files, authority.move_identities); if (stableHash(authority.effects) !== stableHash(expectedEffects)) throw new Error("authority effects do not match canonical plan");
  return authority;
}

function durableJson(file, value, label, operationId) {
  const temp = `${file}.${operationId}.control.tmp`; safeUnlink(temp, `${label}-stale-temp`);
  failpoint(`before-${label}-temp-open`); const fd = fs.openSync(temp, "wx", 0o600); failpoint(`after-${label}-temp-open`);
  try { failpoint(`before-${label}-write`); fs.writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`); failpoint(`after-${label}-write`); failpoint(`before-${label}-fsync`); fs.fsyncSync(fd); failpoint(`after-${label}-fsync`); } finally { fs.closeSync(fd); }
  failpoint(`before-${label}-rename`); fs.renameSync(temp, file); failpoint(`after-${label}-rename`); fsyncDirectory(path.dirname(file), label);
}
function processAlive(pid) { try { process.kill(pid, 0); return true; } catch (error) { return error.code === "EPERM"; } }
function strictCandidateIdentity(root, file, maxLinks = 3) {
  const parent = pinDirectory(root, path.dirname(file)); if (parent.path !== ".ariadne") throw new Error("candidate is outside control directory"); const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink < 1 || stat.nlink > maxLinks || (stat.mode & 0o777) !== 0o600) throw new Error(`unsafe candidate file: ${file}`); return { dev: stat.dev, ino: stat.ino };
}
function sameIdentity(left, right) { return left.dev === right.dev && left.ino === right.ino; }
function candidateRecord(root, directory, name) {
  const match = name.match(/^scope-topology\.candidate-stage-([0-9a-f-]{36})-([0-9]+)$/u); if (!match) throw new Error(`unrecognized candidate stage: ${name}`); const stage = path.join(directory, name); const identity = strictCandidateIdentity(root, stage, 3); let authority = null;
  try { authority = validateAuthority(readJson(stage, "candidate stage")); } catch (_error) { /* A dead partial stage is handled by recovery. */ }
  return { stage, identity, operationId: match[1], pid: Number(match[2]), alive: processAlive(Number(match[2])), authority };
}
function reconcileCandidates(root, allowActive = false) {
  const directory = path.join(root, ".ariadne"); pinDirectory(root, directory); const fixed = control(root, CANDIDATE); const lock = control(root, LOCK);
  const records = fs.readdirSync(directory).filter((name) => name.startsWith(STAGE_PREFIX)).sort().map((name) => candidateRecord(root, directory, name)); if (!allowActive && records.some((item) => item.alive)) throw new Error("scope topology candidate is held by a live writer");
  for (const record of records) if (record.authority && (record.authority.operation_id !== record.operationId || !sameIdentity(record.identity, record.authority.lock_identity))) throw new Error("candidate stage authority mismatch");
  const dead = records.filter((item) => !item.alive); for (const record of dead.filter((item) => !item.authority)) safeUnlink(record.stage, "dead-partial-candidate");
  const valid = dead.filter((item) => item.authority); if (!fs.existsSync(fixed) && valid.length) { try { fs.linkSync(valid[0].stage, fixed); fsyncDirectory(directory, "candidate-recovery-link"); } catch (error) { if (error.code !== "EEXIST") throw error; } }
  if (allowActive && records.some((item) => item.alive)) return;
  if (!fs.existsSync(fixed)) return;
  const authority = validateAuthority(readJson(fixed, "candidate")); const fixedIdentity = strictCandidateIdentity(root, fixed); if (!sameIdentity(fixedIdentity, authority.lock_identity)) throw new Error("candidate identity mismatch");
  for (const record of valid) safeUnlink(record.stage, sameIdentity(record.identity, fixedIdentity) ? "candidate-winner-stage" : "dead-loser-stage");
  if (fs.existsSync(lock)) { const lockIdentity = regularIdentity(lock, 2); if (!sameIdentity(lockIdentity, fixedIdentity) || stableHash(readJson(lock, "lock")) !== stableHash(authority)) throw new Error("candidate conflicts with lock"); }
  else { failpoint("before-lock-create"); fs.linkSync(fixed, lock); failpoint("after-lock-create"); fsyncDirectory(directory, "lock-create"); }
  safeUnlink(fixed, "candidate");
}
function createLock(root, authority) {
  const controlDirectory = path.dirname(control(root, LOCK)); validatePin(root, authority.control_pin); reconcileCandidates(root, true); if (fs.existsSync(control(root, LOCK))) throw new Error("scope topology lock exists; use explicit --resume or --abort");
  const stage = candidateStage(root, authority.operation_id); failpoint("before-candidate-open"); const fd = fs.openSync(stage, "wx", 0o600); failpoint("after-candidate-open");
  try {
    const stat = fs.fstatSync(fd); authority.lock_identity = { dev: stat.dev, ino: stat.ino }; seal(authority); const bytes = Buffer.from(`${JSON.stringify(authority, null, 2)}\n`); const split = Math.max(1, Math.floor(bytes.length / 2));
    failpoint("before-candidate-partial-write"); fs.writeSync(fd, bytes.subarray(0, split)); failpoint("after-candidate-partial-write"); fs.writeSync(fd, bytes.subarray(split)); failpoint("after-candidate-full-write"); failpoint("before-candidate-fsync"); fs.fsyncSync(fd); failpoint("after-candidate-fsync");
  } finally { fs.closeSync(fd); }
  fsyncDirectory(controlDirectory, "candidate-stage");
  if (process.env.ARIADNE_SYNC_CANDIDATE_RELEASE) { while (!fs.existsSync(process.env.ARIADNE_SYNC_CANDIDATE_RELEASE)) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10); }
  const fixed = control(root, CANDIDATE); const lock = control(root, LOCK); failpoint("before-candidate-link");
  try { fs.linkSync(stage, fixed); } catch (error) {
    if (error.code !== "EEXIST") throw error; const ownIdentity = strictCandidateIdentity(root, stage, 1); if (!sameIdentity(ownIdentity, authority.lock_identity)) throw new Error("candidate stage identity changed"); const winnerPath = fs.existsSync(fixed) ? fixed : lock;
    if (fs.existsSync(winnerPath)) { const winner = validateAuthority(readJson(winnerPath, "candidate winner")); const winnerIdentity = strictCandidateIdentity(root, winnerPath); if (!sameIdentity(winnerIdentity, winner.lock_identity)) throw new Error("candidate identity mismatch"); }
    safeUnlink(stage, "candidate-loser-stage"); throw new Error("scope topology candidate election lost to another writer");
  }
  failpoint("after-candidate-link"); fsyncDirectory(controlDirectory, "candidate-link"); failpoint("before-lock-create");
  try { fs.linkSync(fixed, lock); } catch (error) { if (error.code !== "EEXIST") throw error; throw new Error("scope topology lock exists; use explicit --resume or --abort"); }
  failpoint("after-lock-create"); fsyncDirectory(controlDirectory, "lock-create"); safeUnlink(stage, "candidate-winner-stage"); safeUnlink(fixed, "candidate");
}
function readJson(file, label) { let value; try { value = JSON.parse(fs.readFileSync(file, "utf8")); } catch (error) { throw new Error(`${label} is unreadable: ${error.message}`); } validateChecksum(value, label); return value; }
function saveManifest(root, manifest, label) { manifest.updated_at = new Date().toISOString(); seal(manifest); durableJson(control(root, MANIFEST), manifest, label, manifest.operation_id); }
function initialManifest(authority) { return seal({ manifest_schema: 1, operation_id: authority.operation_id, authority, authority_checksum: authority.checksum, phase: "running", effect_states: authority.effects.map(() => ({ state: "pending" })), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); }
function validateManifest(manifest, authority) {
  validateChecksum(manifest, "manifest"); if (manifest.manifest_schema !== 1 || manifest.operation_id !== authority.operation_id || manifest.authority_checksum !== authority.checksum || stableHash(manifest.authority) !== stableHash(authority)) throw new Error("manifest authority mismatch");
  const manifestFields = new Set(["manifest_schema", "operation_id", "authority", "authority_checksum", "phase", "effect_states", "created_at", "updated_at", "checksum"]); for (const key of Object.keys(manifest)) if (!manifestFields.has(key)) throw new Error(`invalid manifest runtime field: ${key}`);
  if (!Array.isArray(manifest.effect_states) || manifest.effect_states.length !== authority.effects.length) throw new Error("manifest runtime state mismatch");
  for (let index = 0; index < manifest.effect_states.length; index += 1) {
    const state = manifest.effect_states[index]; const effect = authority.effects[index]; if (!state || !["pending", "intent", "complete"].includes(state.state)) throw new Error("invalid manifest effect state");
    const allowed = state.state === "intent" ? new Set(["state", "parent_pin", "source_parent_pin", "source_identity", "target_identity", "temp_identity"]) : new Set(["state"]); for (const key of Object.keys(state)) if (!allowed.has(key)) throw new Error(`invalid manifest effect state field: ${key}`);
    if (state.state === "intent") {
      if (!state.parent_pin || typeof state.parent_pin.dev !== "number" || typeof state.parent_pin.ino !== "number") throw new Error("invalid manifest effect intent");
      const expectedParent = posix(path.posix.dirname(effect.path || effect.destination_path)); if (effect.type !== "mkdir" && state.parent_pin.path !== expectedParent) throw new Error("manifest parent pin path mismatch");
      if (effect.type === "mkdir" && !(effect.path === state.parent_pin.path || effect.path.startsWith(`${state.parent_pin.path === "." ? "" : `${state.parent_pin.path}/`}`))) throw new Error("manifest mkdir pin path mismatch");
      if (effect.type === "move" && (!state.source_parent_pin || state.source_parent_pin.path !== path.posix.dirname(effect.source_path) || stableHash(state.source_identity) !== stableHash(effect.source_identity))) throw new Error("manifest move intent mismatch");
      if (effect.type === "replace" && state.target_identity !== null && (!state.target_identity || typeof state.target_identity.dev !== "number" || typeof state.target_identity.ino !== "number")) throw new Error("manifest target identity mismatch");
      if (state.temp_identity && (effect.type !== "replace" || typeof state.temp_identity.dev !== "number" || typeof state.temp_identity.ino !== "number")) throw new Error("manifest temp identity mismatch");
    }
  }
  if (!["running", "complete", "aborted"].includes(manifest.phase)) throw new Error("invalid manifest phase"); return manifest;
}
function loadRecovery(root, operationId) {
  pinDirectory(root, path.join(root, ".ariadne")); reconcileCandidates(root); const lockFile = control(root, LOCK); const manifestFile = control(root, MANIFEST); const hasLock = fs.existsSync(lockFile); const hasManifest = fs.existsSync(manifestFile);
  if (!hasLock && !hasManifest) throw new Error("no scope topology operation exists");
  const lockAuthority = hasLock ? validateAuthority(readJson(lockFile, "lock")) : null; if (lockAuthority) { const identity = regularIdentity(lockFile, 2); if (identity.dev !== lockAuthority.lock_identity.dev || identity.ino !== lockAuthority.lock_identity.ino) throw new Error("lock identity mismatch"); }
  const rawManifest = hasManifest ? readJson(manifestFile, "manifest") : null; const manifestAuthority = rawManifest ? validateAuthority(rawManifest.authority) : null;
  const authority = lockAuthority || manifestAuthority; if (authority.operation_id !== operationId) throw new Error("operation ID does not match recovery authority");
  validatePin(root, authority.control_pin);
  if (lockAuthority && manifestAuthority && stableHash(lockAuthority) !== stableHash(manifestAuthority)) throw new Error("lock and manifest authority mismatch");
  return { authority, manifest: rawManifest ? validateManifest(rawManifest, authority) : null, hasLock, hasManifest };
}

function targetInitialHash(authority, outputPath, completedMoves) {
  let original = outputPath;
  for (const move of authority.plan.moves) if (completedMoves.has(move.destination_path) && (outputPath === move.destination_path || outputPath.startsWith(`${move.destination_path}/`))) original = `${move.source_path}${outputPath.slice(move.destination_path.length)}`;
  if (authority.plan.moves.some((move) => completedMoves.has(move.destination_path) && (outputPath === move.source_path || outputPath.startsWith(`${move.source_path}/`)))) return null;
  return (authority.preconditions.find((item) => item.path === original) || {}).sha256 || null;
}
function ensureIntent(root, manifest, index, effect) {
  let state = manifest.effect_states[index]; if (state.state !== "pending") return state;
  let parent;
  if (effect.type === "mkdir") parent = existingAncestor(root, path.dirname(absolute(root, effect.path)));
  else if (effect.type === "move") parent = pinDirectory(root, path.dirname(absolute(root, effect.destination_path)));
  else parent = pinDirectory(root, path.dirname(absolute(root, effect.path)));
  state = { state: "intent", parent_pin: parent };
  if (effect.type === "replace") { const target = absolute(root, effect.path); try { const stat = fs.lstatSync(target); if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error(`unsafe replacement target: ${effect.path}`); state.target_identity = { dev: stat.dev, ino: stat.ino }; } catch (error) { if (error.code !== "ENOENT") throw error; state.target_identity = null; } }
  if (effect.type === "move") { state.source_parent_pin = pinDirectory(root, path.dirname(absolute(root, effect.source_path))); state.source_identity = effect.source_identity; }
  manifest.effect_states[index] = state; saveManifest(root, manifest, "effect-intent"); failpoint(`after-effect-intent:${effect.type}:${effect.path || effect.source_path}`); failpoint("after-effect-intent"); return state;
}
function finishEffect(root, manifest, index) { manifest.effect_states[index] = { state: "complete" }; saveManifest(root, manifest, "effect-complete"); failpoint("after-effect-complete"); }
function processMkdir(root, manifest, index, effect, state) {
  const directory = absolute(root, effect.path); if (fs.existsSync(directory)) { pinDirectory(root, directory); return finishEffect(root, manifest, index); }
  validatePin(root, state.parent_pin); failpoint("before-mkdir"); fs.mkdirSync(directory, { mode: 0o700 }); failpoint("after-mkdir"); fsyncDirectory(path.dirname(directory), "mkdir"); finishEffect(root, manifest, index);
}
function processMove(root, manifest, index, effect, state) {
  const source = absolute(root, effect.source_path); const destination = absolute(root, effect.destination_path); const sourceExists = fs.existsSync(source); const destinationExists = fs.existsSync(destination);
  if (!sourceExists && destinationExists) { const identity = treeIdentity(root, effect.destination_path); if (identity.dev !== effect.source_identity.dev || identity.ino !== effect.source_identity.ino || identity.tree_hash !== effect.source_identity.tree_hash) throw new Error(`moved destination changed: ${effect.destination_path}`); return finishEffect(root, manifest, index); }
  if (!sourceExists || destinationExists) throw new Error(`ambiguous move state: ${effect.source_path} -> ${effect.destination_path}`);
  validatePin(root, state.source_parent_pin); validatePin(root, state.parent_pin); const identity = treeIdentity(root, effect.source_path); if (identity.dev !== effect.source_identity.dev || identity.ino !== effect.source_identity.ino || identity.tree_hash !== effect.source_identity.tree_hash) throw new Error(`move source changed: ${effect.source_path}`);
  failpoint("before-move-rename"); fs.renameSync(source, destination); failpoint("after-move-rename", "after-rename"); fsyncDirectory(path.dirname(source), "move-source"); if (path.dirname(source) !== path.dirname(destination)) fsyncDirectory(path.dirname(destination), "move-destination"); finishEffect(root, manifest, index);
}
function processReplace(root, authority, manifest, index, effect, state) {
  const target = absolute(root, effect.path); const temp = absolute(root, effect.temp_path); const completedMoves = new Set(authority.effects.filter((item, offset) => offset < index && item.type === "move" && manifest.effect_states[offset].state === "complete").map((item) => item.destination_path));
  const initialHash = targetInitialHash(authority, effect.path, completedMoves); const targetHash = fileHash(target); const tempHash = fileHash(temp);
  if (targetHash === effect.sha256) { if (tempHash === effect.sha256) safeUnlink(temp, "owned-temp"); return finishEffect(root, manifest, index); }
  if (targetHash !== initialHash) throw new Error(`precondition changed: ${effect.path}`);
  if (state.target_identity) { const stat = fs.lstatSync(target); if (stat.dev !== state.target_identity.dev || stat.ino !== state.target_identity.ino || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error(`target identity changed: ${effect.path}`); }
  validatePin(root, state.parent_pin);
  if (tempHash === null) {
    failpoint("before-temp-open"); const fd = fs.openSync(temp, "wx", 0o600); failpoint("after-temp-open");
    try { const opened = fs.fstatSync(fd); state.temp_identity = { dev: opened.dev, ino: opened.ino }; manifest.effect_states[index] = state; saveManifest(root, manifest, "temp-identity"); failpoint("before-temp-write"); fs.writeFileSync(fd, Buffer.from(effect.bytes_base64, "base64")); failpoint("after-temp-write"); failpoint("before-temp-fsync"); fs.fsyncSync(fd); failpoint(`after-temp-fsync:${effect.path}`); failpoint("after-temp-fsync", "after-temp"); } finally { fs.closeSync(fd); }
    fsyncDirectory(path.dirname(temp), "temp-create");
  } else if (tempHash !== effect.sha256) {
    const stat = fs.lstatSync(temp); if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || (stat.mode & 0o777) !== 0o600 || state.temp_identity && (stat.dev !== state.temp_identity.dev || stat.ino !== state.temp_identity.ino)) throw new Error(`operation temporary changed: ${effect.temp_path}`);
    safeUnlink(temp, "partial-owned-temp"); return processReplace(root, authority, manifest, index, effect, state);
  }
  validatePin(root, state.parent_pin); const tempStat = fs.lstatSync(temp); if (!tempStat.isFile() || tempStat.isSymbolicLink() || tempStat.nlink !== 1 || (tempStat.mode & 0o777) !== 0o600 || !state.temp_identity || tempStat.dev !== state.temp_identity.dev || tempStat.ino !== state.temp_identity.ino || fileHash(temp) !== effect.sha256) throw new Error(`operation temporary changed: ${effect.temp_path}`);
  if (fileHash(target) !== initialHash) throw new Error(`precondition changed: ${effect.path}`); if (state.target_identity) { const targetStat = fs.lstatSync(target); if (!targetStat.isFile() || targetStat.isSymbolicLink() || targetStat.nlink !== 1 || targetStat.dev !== state.target_identity.dev || targetStat.ino !== state.target_identity.ino) throw new Error(`target identity changed: ${effect.path}`); } else if (fs.existsSync(target)) throw new Error(`target identity changed: ${effect.path}`);
  failpoint("before-target-rename"); fs.renameSync(temp, target); failpoint("after-target-rename", "after-rename"); fsyncDirectory(path.dirname(target), "target-rename"); finishEffect(root, manifest, index); if (effect.activation) failpoint("after-activation", "after-activation"); if (["generated", "checkpoint"].includes(effect.kind)) failpoint("after-derived", "after-derived");
}
function cleanupTerminal(root, manifest) {
  validatePin(root, manifest.authority.control_pin);
  const lockFile = control(root, LOCK); const manifestFile = control(root, MANIFEST); const lockIdentity = manifest.authority.lock_identity;
  if (fs.existsSync(manifestFile)) safeUnlink(manifestFile, "manifest"); failpoint("after-manifest-cleanup");
  unlinkIdentity(lockFile, lockIdentity, "lock"); return manifest.phase;
}
function continueOperation(root, authority, manifest) {
  if (manifest.phase !== "running") { cleanupTerminal(root, manifest); return checkTopology(root); }
  for (let index = 0; index < authority.effects.length; index += 1) {
    if (manifest.effect_states[index].state === "complete") continue; const effect = authority.effects[index]; const state = ensureIntent(root, manifest, index, effect);
    if (effect.type === "mkdir") processMkdir(root, manifest, index, effect, state); else if (effect.type === "move") processMove(root, manifest, index, effect, state); else processReplace(root, authority, manifest, index, effect, state);
  }
  failpoint("after-activation-phase", "after-activation");
  failpoint("before-final-check", "before-final-check"); const final = checkTopology(root); if (final.changes.length) throw new Error(`final check proposed changes: ${final.changes.map((item) => item.path).join(", ")}`);
  manifest.phase = "complete"; saveManifest(root, manifest, "terminal-complete"); failpoint("after-terminal-complete"); cleanupTerminal(root, manifest); return final;
}

function applyOperation(vaultRoot, requestValue) {
  const root = fs.realpathSync(vaultRoot); const request = parseOperationRequest(requestValue); const inventory = inventoryVault(root); const plan = planOperation(inventory, buildTopology(inventory), request);
  if (!plan.write_authorized) throw new Error(`operation is not write-authorized: ${plan.refusals.map((item) => `${item.code}:${item.path}`).join(", ")}`);
  const controlDirectory = path.join(root, ".ariadne"); if (!fs.existsSync(controlDirectory)) { failpoint("before-control-mkdir"); fs.mkdirSync(controlDirectory, { mode: 0o700 }); failpoint("after-control-mkdir"); fsyncDirectory(root, "control-mkdir"); }
  const operationId = crypto.randomUUID(); const authority = buildAuthority(root, operationId, request, plan, pinDirectory(root, controlDirectory), inventory); createLock(root, authority);
  failpoint("after-lock-create", "after-lock"); const manifest = initialManifest(authority); saveManifest(root, manifest, "manifest-create"); failpoint("after-manifest-create", "after-manifest"); return continueOperation(root, authority, manifest);
}
function resumeOperation(vaultRoot, operationId) {
  if (typeof operationId !== "string" || !/^[0-9a-f-]{36}$/u.test(operationId)) throw new Error("--resume requires a valid operation ID"); const root = fs.realpathSync(vaultRoot); const recovery = loadRecovery(root, operationId);
  if (!recovery.manifest) { const manifest = initialManifest(recovery.authority); saveManifest(root, manifest, "manifest-recover"); return continueOperation(root, recovery.authority, manifest); }
  return continueOperation(root, recovery.authority, recovery.manifest);
}
function abortOperation(vaultRoot, operationId) {
  if (typeof operationId !== "string" || !/^[0-9a-f-]{36}$/u.test(operationId)) throw new Error("--abort requires a valid operation ID"); const root = fs.realpathSync(vaultRoot); const recovery = loadRecovery(root, operationId); const authority = recovery.authority; const manifest = recovery.manifest;
  const reconciliation = [];
  if (manifest) {
    for (let index = 0; index < authority.effects.length; index += 1) {
      const effect = authority.effects[index]; if (effect.type === "replace") { const temp = absolute(root, effect.temp_path); const state = manifest.effect_states[index]; if (fileHash(temp) === effect.sha256) { if (state.state !== "intent" || !state.temp_identity) throw new Error(`unexpected operation temporary: ${effect.temp_path}`); validatePin(root, state.parent_pin); const stat = fs.lstatSync(temp); if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || (stat.mode & 0o777) !== 0o600 || stat.dev !== state.temp_identity.dev || stat.ino !== state.temp_identity.ino) throw new Error(`unsafe operation temporary: ${effect.temp_path}`); safeUnlink(temp, "abort-owned-temp"); } if (fileHash(absolute(root, effect.path)) === effect.sha256) reconciliation.push(effect.path); }
      if (effect.type === "move" && !fs.existsSync(absolute(root, effect.source_path)) && fs.existsSync(absolute(root, effect.destination_path))) { const identity = treeIdentity(root, effect.destination_path); if (identity.dev === effect.source_identity.dev && identity.ino === effect.source_identity.ino && identity.tree_hash === effect.source_identity.tree_hash) reconciliation.push(effect.destination_path); }
    }
    manifest.phase = "aborted"; saveManifest(root, manifest, "terminal-abort");
  }
  const lockFile = control(root, LOCK); const lockIdentity = authority.lock_identity; if (fs.existsSync(control(root, MANIFEST))) safeUnlink(control(root, MANIFEST), "manifest"); failpoint("after-manifest-cleanup"); unlinkIdentity(lockFile, lockIdentity, "lock");
  return { aborted: true, operation_id: operationId, reconciliation_paths: [...new Set(reconciliation)].sort((a, b) => Buffer.from(a).compare(Buffer.from(b))) };
}

module.exports = { abortOperation, applyOperation, checkTopology, resumeOperation };
