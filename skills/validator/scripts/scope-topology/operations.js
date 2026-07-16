"use strict";

const crypto = require("crypto");
const path = require("path");
const { normalizeScopePath } = require("./schema");
const { renderCheckpointBlocks, renderScopeMapCanvas, renderScopeMapMarkdown, renderScopeRegistry } = require("./render");

const OPERATIONS = new Set(["create", "adopt", "move", "set-status", "repair"]);
const STATUSES = new Set(["active", "archived", "retired"]);
const ADOPTION_MODES = new Set(["whole-vault", "ancestor-chain"]);
const FIELDS = new Set(["operation_schema", "operation", "target_scope_id", "source_path", "destination_path", "desired_status", "replacement_scope_id", "adoption_mode", "normalize_files", "allowed_write_paths"]);
const REQUIRED = Object.freeze({ create: ["destination_path"], adopt: ["adoption_mode"], move: ["source_path", "destination_path"], "set-status": ["desired_status"], repair: [] });
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function normalizedPath(value, field) {
  try { return normalizeScopePath(value); } catch (error) { throw new Error(`${field}: ${error.message}`); }
}

function normalizedList(value, field) {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  const output = value.map((item) => {
    if (typeof item !== "string") throw new Error(`${field} entries must be strings`);
    return normalizedPath(item, field);
  });
  if (new Set(output).size !== output.length) throw new Error(`${field} contains a duplicate normalized path`);
  return Object.freeze(output.sort((a, b) => Buffer.from(a).compare(Buffer.from(b))));
}

function parseOperationRequest(json) {
  if (!json || typeof json !== "object" || Array.isArray(json)) throw new Error("operation request must be an object");
  for (const key of Object.keys(json)) if (!FIELDS.has(key)) throw new Error(`unknown field: ${key}`);
  for (const key of ["operation_schema", "operation", "target_scope_id", "allowed_write_paths"]) if (!Object.hasOwn(json, key)) throw new Error(`missing field: ${key}`);
  if (json.operation_schema !== 1) throw new Error("operation_schema must be 1");
  if (typeof json.operation !== "string" || !OPERATIONS.has(json.operation)) throw new Error(`unsupported operation: ${json.operation}`);
  if (typeof json.target_scope_id !== "string" || !ID.test(json.target_scope_id)) throw new Error("target_scope_id must be lower-kebab-case");
  for (const field of REQUIRED[json.operation]) if (json[field] === undefined) throw new Error(`${json.operation} requires ${field}`);
  const permitted = new Set(["operation_schema", "operation", "target_scope_id", "normalize_files", "allowed_write_paths", ...REQUIRED[json.operation]]);
  if (json.operation === "set-status") permitted.add("replacement_scope_id");
  for (const key of Object.keys(json)) if (!permitted.has(key)) throw new Error(`${key} is not valid for ${json.operation}`);
  const result = { operation_schema: 1, operation: json.operation, target_scope_id: json.target_scope_id };
  for (const field of ["source_path", "destination_path"]) if (json[field] !== undefined) result[field] = normalizedPath(json[field], field);
  if (json.desired_status !== undefined) {
    if (typeof json.desired_status !== "string" || !STATUSES.has(json.desired_status)) throw new Error("desired_status is unsupported");
    result.desired_status = json.desired_status;
  }
  if (json.replacement_scope_id !== undefined) {
    if (json.operation !== "set-status") throw new Error(`replacement_scope_id is not valid for ${json.operation}`);
    if (json.desired_status !== "retired") throw new Error("replacement_scope_id is only valid when desired_status is retired");
    if (typeof json.replacement_scope_id !== "string" || !ID.test(json.replacement_scope_id)) throw new Error("replacement_scope_id must be lower-kebab-case");
    result.replacement_scope_id = json.replacement_scope_id;
  }
  if (json.adoption_mode !== undefined) {
    if (!ADOPTION_MODES.has(json.adoption_mode)) throw new Error("adoption_mode must be whole-vault or ancestor-chain");
    result.adoption_mode = json.adoption_mode;
  }
  result.normalize_files = normalizedList(json.normalize_files || [], "normalize_files");
  result.allowed_write_paths = normalizedList(json.allowed_write_paths, "allowed_write_paths");
  return Object.freeze(result);
}

function canonical(value) {
  if (Buffer.isBuffer(value)) return { $bytes: value.toString("base64") };
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}
function hashPlan(plan) { return crypto.createHash("sha256").update(JSON.stringify(canonical(plan))).digest("hex"); }
function descriptorPath(descriptor) { return descriptor.scopePath === "." ? "00 Index.md" : `${descriptor.scopePath}/00 Index.md`; }

function descriptorBytes(descriptor, existingBytes = null) {
  const lines = ["---", `title: ${descriptor.title}`, "type: scope-index", "scope_schema: 1", `scope_id: ${descriptor.scopeId}`, `scope_path: ${descriptor.scopePath}`];
  if (descriptor.parentScopeId) lines.push(`parent_scope_id: ${descriptor.parentScopeId}`);
  lines.push(`status: ${descriptor.status}`);
  if (descriptor.scopeOrder !== null && descriptor.scopeOrder !== undefined) lines.push(`scope_order: ${descriptor.scopeOrder}`);
  if (descriptor.formerScopePaths && descriptor.formerScopePaths.length) lines.push("former_scope_paths:", ...descriptor.formerScopePaths.map((item) => `  - ${item}`));
  if (descriptor.replacedByScopeId) lines.push(`replaced_by_scope_id: ${descriptor.replacedByScopeId}`);
  lines.push("---");
  let body = `\n# ${descriptor.title}\n`;
  if (existingBytes) {
    let text = existingBytes.toString("utf8");
    const bom = text.startsWith("\ufeff") ? "\ufeff" : "";
    if (bom) text = text.slice(1);
    const match = text.match(/^---\r?\n[\s\S]*?\r?\n---(\r?\n[\s\S]*|$)/u);
    if (match) body = match[1] || "\n";
    return `${bom}${lines.join("\n")}${body}`;
  }
  return `${lines.join("\n")}${body}`;
}

function virtualModel(descriptors) {
  const ordered = [...descriptors].sort((a, b) => Buffer.from(a.scopePath).compare(Buffer.from(b.scopePath)));
  const byId = new Map(ordered.map((item) => [item.scopeId, item]));
  const children = new Map(ordered.map((item) => [item.scopeId, []]));
  for (const item of ordered) if (item.parentScopeId && children.has(item.parentScopeId)) children.get(item.parentScopeId).push(item);
  return { active: byId.has("root"), descriptors: new Set(ordered), descriptorsById: byId, childrenById: children, candidates: [], pendingDescriptors: [], unsupportedRoot: false };
}

function hasSupportedRootBaseFormula(text) {
  const lines = String(text).split(/\r?\n/u);
  const roots = lines.map((line, index) => /^formulas:\s*$/u.test(line) ? index : -1).filter((index) => index >= 0);
  if (roots.length !== 1) return false;
  const root = roots[0];
  let end = lines.length;
  for (let index = root + 1; index < lines.length; index += 1) {
    if (/^[^\s#][^:]*:/u.test(lines[index])) { end = index; break; }
  }
  const entries = lines.slice(root + 1, end).filter((line) => line.trim() !== "" && !/^\s*#/u.test(line));
  if (entries.length !== 1 || !/^  scope:\s*\S.*$/u.test(entries[0])) return false;
  let supportedCall = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/file\.inFolder/u.test(line)) continue;
    if (index <= root || index >= end) return false;
    const entry = line.match(/^  scope:\s*(\S.*)$/u);
    if (!entry || /\s+#/u.test(entry[1])) return false;
    const calls = [...entry[1].matchAll(/(?:^|[^\w.])file\.inFolder\(\s*(["'])[^"']+\1\s*\)/gu)];
    if (calls.length === 0) return false;
    const residue = entry[1].replace(/(?:^|[^\w.])file\.inFolder\(\s*(["'])[^"']+\1\s*\)/gu, "");
    if (/file\.inFolder/u.test(residue)) return false;
    supportedCall = true;
  }
  return supportedCall;
}

function planOperation(inventory, model, requestValue) {
  const request = parseOperationRequest(requestValue);
  const current = model.descriptorsById.get(request.target_scope_id) || model.pendingDescriptors.find((item) => item.scopeId === request.target_scope_id);
  if (request.operation !== "create" && !current) throw new Error(`target_scope_id is inconsistent with inventory: ${request.target_scope_id}`);
  if (request.operation === "create" && model.descriptorsById.has(request.target_scope_id)) throw new Error("create target already exists");
  const directoryPaths = new Set(inventory.directories.map((item) => item.relativePath));
  const filePaths = new Set(inventory.files.map((item) => item.relativePath));
  const preconditions = inventory.files.map((item) => ({ path: item.relativePath, sha256: item.contentHash })).filter((item) => item.sha256);
  const lifecycle_checks = [];
  const moves = [];
  const replacements = [];
  let descriptors = [...model.descriptors];
  let changedDescriptorIds = new Set();

  if (request.operation === "create") {
    const knownIds = inventory.files.filter((item) => path.posix.basename(item.relativePath) === "00 Index.md" && item.frontmatter && typeof item.frontmatter.scope_id === "string").map((item) => item.frontmatter.scope_id.normalize("NFC").trim());
    if (knownIds.includes(request.target_scope_id)) throw new Error(`scope ID already exists: ${request.target_scope_id}`);
    if (!directoryPaths.has(request.destination_path)) throw new Error("create destination directory does not exist");
    if (filePaths.has(`${request.destination_path}/00 Index.md`)) throw new Error("create destination already has a descriptor");
    const ancestors = descriptors.filter((item) => item.scopePath === "." || request.destination_path.startsWith(`${item.scopePath}/`)).sort((a, b) => b.scopePath.length - a.scopePath.length);
    if (!ancestors[0]) throw new Error("create destination has no adopted physical ancestor");
    descriptors.push({ scopeId: request.target_scope_id, scopePath: request.destination_path, parentScopeId: ancestors[0].scopeId, title: request.target_scope_id, status: "active", scopeOrder: null, formerScopePaths: [] });
    changedDescriptorIds.add(request.target_scope_id);
  }
  if (request.operation === "adopt") {
    const pending = model.pendingDescriptors.filter((item) => item.supported);
    let selected = request.adoption_mode === "whole-vault" ? pending : pending.filter((item) => item.scopeId === request.target_scope_id || current.scopePath.startsWith(`${item.scopePath}/`));
    if (!selected.some((item) => item.scopeId === request.target_scope_id)) throw new Error("adoption target is not a pending descriptor");
    if (!selected.some((item) => item.scopeId === "root")) {
      const rootFile = inventory.files.find((item) => item.relativePath === "00 Index.md") || null;
      selected = [{ scopeId: "root", scopePath: ".", parentScopeId: null, title: "Vault", status: "active", scopeOrder: null, formerScopePaths: [], fileRecord: rootFile }, ...selected];
    }
    descriptors = selected;
    changedDescriptorIds = new Set(selected.map((item) => item.scopeId));
  }
  if (request.operation === "move") {
    if (current.scopePath !== request.source_path) throw new Error("source_path does not match target scope");
    if (request.destination_path === request.source_path || request.destination_path.startsWith(`${request.source_path}/`)) throw new Error("move destination must not be equal to or beneath the source subtree");
    if (directoryPaths.has(request.destination_path) || filePaths.has(request.destination_path)) throw new Error("move destination already exists");
    for (const item of model.descriptorsById.values()) if ((item.formerScopePaths || []).includes(request.destination_path)) throw new Error("move destination is a reserved former path");
    const parentPath = path.posix.dirname(request.destination_path);
    const parents = descriptors.filter((item) => item.scopeId !== current.scopeId && (item.scopePath === "." || parentPath === item.scopePath || parentPath.startsWith(`${item.scopePath}/`))).sort((a, b) => b.scopePath.length - a.scopePath.length);
    if (!parents[0]) throw new Error("move destination has no physical parent scope");
    moves.push({ source_path: request.source_path, destination_path: request.destination_path });
    descriptors = descriptors.map((item) => {
      if (item.scopeId === current.scopeId) return { ...item, scopePath: request.destination_path, parentScopeId: parents[0].scopeId, formerScopePaths: [...new Set([...(item.formerScopePaths || []), request.source_path])].sort() };
      if (item.scopePath.startsWith(`${request.source_path}/`)) return { ...item, scopePath: `${request.destination_path}${item.scopePath.slice(request.source_path.length)}` };
      return item;
    });
    changedDescriptorIds = new Set(descriptors.filter((item) => item.scopeId === current.scopeId || item.scopePath.startsWith(`${request.destination_path}/`)).map((item) => item.scopeId));
    replacements.push({ kind: "redirect", path: `${request.source_path}/00 Index.md`, bytes: `---\ntype: scope-redirect\nredirect_schema: 1\nformer_scope_path: ${request.source_path}\ntarget_scope_id: ${current.scopeId}\ntarget_scope_path: ${request.destination_path}\n---\n` });
  }
  if (request.operation === "set-status") {
    let replacement = null;
    if (request.replacement_scope_id !== undefined) {
      replacement = model.descriptorsById.get(request.replacement_scope_id);
      if (request.replacement_scope_id === current.scopeId) throw new Error("replacement_scope_id must name a distinct scope");
      if (!replacement || !["active", "archived"].includes(replacement.status)) throw new Error("replacement_scope_id must name an active or archived adopted scope");
    }
    const allowed = current.status === request.desired_status || current.status === "active" && request.desired_status === "archived" || current.status === "archived" && ["active", "retired"].includes(request.desired_status) || current.status === "retired" && request.desired_status === "archived";
    lifecycle_checks.push({ from: current.status, to: request.desired_status, allowed });
    if (allowed && request.desired_status === "retired" && (model.childrenById.get(current.scopeId) || []).some((item) => item.status === "active")) lifecycle_checks[0] = { ...lifecycle_checks[0], allowed: false, reason: "retired scopes may not contain active children" };
    if (lifecycle_checks[0].allowed) {
      descriptors = descriptors.map((item) => item.scopeId === current.scopeId ? { ...item, status: request.desired_status, ...(replacement ? { replacedByScopeId: replacement.scopeId } : {}) } : item);
      changedDescriptorIds.add(current.scopeId);
    }
  }

  const desired = virtualModel(descriptors);
  const lifecycleRefused = lifecycle_checks.some((item) => !item.allowed);
  for (const item of descriptors) if (!lifecycleRefused && changedDescriptorIds.has(item.scopeId)) {
    const original = model.descriptorsById.get(item.scopeId) || model.pendingDescriptors.find((candidate) => candidate.scopeId === item.scopeId) || item;
    replacements.push({ kind: "descriptor", path: descriptorPath(item), bytes: descriptorBytes(item, original && original.fileRecord && original.fileRecord.rawBytes), activation: request.operation === "adopt" && item.scopeId === "root" });
  }
  const generated = lifecycleRefused ? [] : [...renderCheckpointBlocks(desired), renderScopeRegistry(desired), renderScopeMapMarkdown(desired), renderScopeMapCanvas(desired)]
    .map((item) => ({ kind: item.owner === "generated-file" ? "generated" : "checkpoint", path: item.path, bytes: item.bytes.toString("utf8") }));
  replacements.push(...generated);
  const baseMentions = inventory.files.filter((item) => item.relativePath.startsWith("Bases/") && item.relativePath.endsWith(".base") && item.rawBytes && /file\.inFolder/u.test(item.rawBytes.toString("utf8")))
    .map((item) => ({ path: item.relativePath, recognized: hasSupportedRootBaseFormula(item.rawBytes.toString("utf8")) }));
  const base_formula_proposals = baseMentions.filter((item) => item.recognized)
    .map((item) => ({ path: item.path, recognized: true, authorized: request.allowed_write_paths.includes(item.path), action: "add child-before-parent scope branches" }));
  const base_formula_reports = baseMentions.filter((item) => !item.recognized)
    .map((item) => ({ path: item.path, code: "unsupported-base-formula", rewrite_proposed: false }));
  const content_write_paths = lifecycleRefused ? [] : [...new Set([...replacements.map((item) => item.path), ...request.normalize_files, ...base_formula_proposals.filter((item) => item.recognized).map((item) => item.path)])].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
  const refusals = [];
  if (lifecycleRefused) refusals.push({ code: "lifecycle-transition-refused", path: descriptorPath(current) });
  const missing = content_write_paths.filter((item) => !request.allowed_write_paths.includes(item));
  const unused = request.allowed_write_paths.filter((item) => !content_write_paths.includes(item));
  refusals.push(...missing.map((item) => ({ code: "missing-write-authorization", path: item })));
  refusals.push(...unused.map((item) => ({ code: "unused-write-authorization", path: item })));
  return Object.freeze({ plan_schema: 1, operation: request.operation, target_scope_id: request.target_scope_id, preconditions, lifecycle_checks, moves, replacements, base_formula_proposals, base_formula_reports, content_write_paths, refusals, write_authorized: refusals.length === 0 });
}

module.exports = { hashPlan, parseOperationRequest, planOperation };
