"use strict";

const crypto = require("crypto");
const path = require("path");
const { normalizeNfc, normalizeScopePath } = require("./schema");
const { orderDescriptors } = require("./model");
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

function isWordChar(char) {
  return char !== undefined && /[\p{L}\p{N}]/u.test(char);
}

const YAML_RESERVED_SCALARS = new Set(["null", "~", "true", "false"]);
const YAML_LEADING_INDICATORS = /^[-?:,[\]{}#&*!|>'"%@`]/u;

// A single word-bounded quote character (e.g. the apostrophe in "Satyam's") is safe to leave
// unquoted: validate_vault.js's syntax scanner treats it as scalar-internal punctuation, not a
// delimiter. Two or more quote characters anywhere in the value are not safe even when each is
// individually word-bounded, because the scanner's quote-tracking is stateful across the whole
// value -- for example "Multiple ''' apostrophes here" has three individually-adjacent-to-word
// apostrophes but still misreads as an unterminated quote, since the first non-word-bounded one
// (if any) opens real quote-tracking that subsequent quote characters then interact with.
function hasUnsafeQuoteCharacters(value) {
  const positions = [...value].map((char, index) => ({ char, index })).filter((item) => item.char === "'" || item.char === "\"");
  if (positions.length === 0) return false;
  if (positions.length > 1) return true;
  const { index } = positions[0];
  return !(isWordChar(value[index - 1]) && isWordChar(value[index + 1]));
}

// A minimal, dependency-free YAML plain/quoted-scalar serializer for the exact subset this
// codebase's own hand-rolled parsers (inventory.js's parseScalar and validate_vault.js's
// validateYamlSyntax) support. Neither parser un-escapes doubled or backslash-escaped quote
// characters -- they only strip a literal leading/trailing quote character by position -- so
// correctness here means never emitting a quoted form that either parser could misread, not
// implementing full YAML escaping. Values needing quoting are wrapped in whichever quote
// character does not also appear inside them; a value containing both a `'` and a `"` (or a
// backslash) cannot be serialized safely under this constraint and is refused rather than
// guessed at.
function yamlScalar(value, field) {
  if (value === "") return "''";
  if (/^\s|\s$/u.test(value)) return quoteScalar(value, field);
  if (YAML_RESERVED_SCALARS.has(value)) return quoteScalar(value, field);
  if (YAML_LEADING_INDICATORS.test(value)) return quoteScalar(value, field);
  if (/:(?:\s|$)/u.test(value) || / #/u.test(value)) return quoteScalar(value, field);
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(value)) return quoteScalar(value, field);
  if (hasUnsafeQuoteCharacters(value)) return quoteScalar(value, field);
  return value;
}

function quoteScalar(value, field) {
  const hasSingle = value.includes("'");
  const hasDouble = value.includes("\"");
  const hasBackslash = value.includes("\\");
  if (hasBackslash || (hasSingle && hasDouble)) {
    throw new Error(`${field} cannot be safely serialized as YAML: contains a character combination this vault's parsers cannot round-trip (${value})`);
  }
  return hasSingle ? `"${value}"` : `'${value}'`;
}

function descriptorBytes(descriptor, existingBytes = null) {
  const desired = new Map([
    ["title", [`title: ${yamlScalar(descriptor.title, "title")}`]], ["type", ["type: scope-index"]], ["scope_schema", ["scope_schema: 1"]],
    ["scope_id", [`scope_id: ${descriptor.scopeId}`]], ["scope_path", [`scope_path: ${descriptor.scopePath}`]],
    ["parent_scope_id", descriptor.parentScopeId ? [`parent_scope_id: ${descriptor.parentScopeId}`] : []], ["status", [`status: ${descriptor.status}`]],
    ["scope_order", descriptor.scopeOrder !== null && descriptor.scopeOrder !== undefined ? [`scope_order: ${descriptor.scopeOrder}`] : []],
    ["former_scope_paths", descriptor.formerScopePaths && descriptor.formerScopePaths.length ? ["former_scope_paths:", ...descriptor.formerScopePaths.map((item) => `  - ${item}`)] : []],
    ["replaced_by_scope_id", descriptor.replacedByScopeId ? [`replaced_by_scope_id: ${descriptor.replacedByScopeId}`] : []],
  ]);
  let lines = ["---", ...[...desired.values()].flat(), "---"];
  let body = `\n# ${descriptor.title}\n`;
  if (existingBytes) {
    const raw = Buffer.from(existingBytes); let text = raw.toString("utf8");
    const bom = text.startsWith("\ufeff") ? "\ufeff" : "";
    if (bom) text = text.slice(1);
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n[\s\S]*|$)/u);
    if (match) {
      const bomBytes = raw.subarray(0, raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf ? 3 : 0);
      const start = bomBytes.length; const lfClose = raw.indexOf(Buffer.from("\n---"), start + 4);
      const closeEnd = lfClose < 0 ? -1 : lfClose + 4;
      const bodyStart = closeEnd < 0 ? -1 : raw[closeEnd] === 0x0d && raw[closeEnd + 1] === 0x0a ? closeEnd + 2 : raw[closeEnd] === 0x0a ? closeEnd + 1 : closeEnd;
      const rawBody = bodyStart < 0 ? Buffer.from("\n") : raw.subarray(bodyStart);
      const original = match[1].split(/\r?\n/u); const merged = []; const seen = new Set();
      for (let index = 0; index < original.length;) {
        const field = original[index].match(/^([A-Za-z0-9_-]+):(?:\s.*)?$/u);
        if (!field) { merged.push(original[index]); index += 1; continue; }
        let end = index + 1; while (end < original.length && (/^\s/u.test(original[end]) || original[end] === "")) end += 1;
        if (desired.has(field[1])) { if (!seen.has(field[1])) merged.push(...desired.get(field[1])); seen.add(field[1]); }
        else merged.push(...original.slice(index, end));
        index = end;
      }
      for (const [field, value] of desired) if (!seen.has(field)) merged.push(...value);
      lines = ["---", ...merged, "---"];
      const output = Buffer.concat([bomBytes, Buffer.from(lines.join("\n")), rawBody.length ? Buffer.from("\n") : Buffer.alloc(0), rawBody]);
      return raw.equals(Buffer.from(raw.toString("utf8"), "utf8")) ? output.toString("utf8") : output;
    }
    return `${bom}${lines.join("\n")}${body}`;
  }
  return `${lines.join("\n")}${body}`;
}

function virtualModel(descriptors) {
  const byPath = [...descriptors].sort((a, b) => Buffer.from(a.scopePath).compare(Buffer.from(b.scopePath)));
  const byId = new Map(byPath.map((item) => [item.scopeId, item]));
  const { descriptors: ordered, descriptorsById, childrenById } = orderDescriptors(byId);
  return { active: descriptorsById.has("root"), descriptors: ordered, descriptorsById, childrenById, candidates: [], pendingDescriptors: [], unsupportedRoot: false };
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

function fileAt(inventory, directory, name) {
  const target = directory === "." ? name : `${directory}/${name}`;
  const record = inventory.files.find((item) => item.relativePath === target);
  return record && record.lstat.isFile() ? record : null;
}

function isDismissedCandidate(record) {
  return Boolean(record && record.frontmatter && String(record.frontmatter.ariadne_scope_adoption || "") === "dismissed");
}

// Dismissal must be honored on any "00 * Index.md" hub in the directory, not only a bare
// "00 Index.md" -- an intentional legacy hub named e.g. "00 Legacy Index.md" is exactly the
// kind of named index the migration guide says can carry ariadne_scope_adoption: dismissed.
function anyIndexDismissed(inventory, directory) {
  return inventory.files
    .filter((item) => path.posix.dirname(item.relativePath) === directory && /^00 .*Index\.md$/u.test(path.posix.basename(item.relativePath)))
    .some((item) => isDismissedCandidate(item));
}

function namedIndexTitle(inventory, directory) {
  const named = inventory.files
    .filter((item) => path.posix.dirname(item.relativePath) === directory && /^00 .*Index\.md$/u.test(path.posix.basename(item.relativePath)))
    .sort((left, right) => Buffer.from(left.relativePath).compare(Buffer.from(right.relativePath)));
  for (const item of named) {
    const title = item.frontmatter && typeof item.frontmatter.title === "string" ? item.frontmatter.title.trim() : "";
    if (title) return title;
  }
  return null;
}

function slugify(name) {
  const slug = normalizeNfc(name).toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
  return slug || "scope";
}

function pathSlug(directory) {
  return directory.split("/").map(slugify).join("-");
}

// A full-path slug can itself collide (e.g. "A-B/X" and "A/B/X" both slugify to "a-b-x"), and
// slugify's non-ASCII fallback ("scope") is not unique across multiple non-Latin-only names. A
// deterministic hash of the real path disambiguates without ever guessing at a human-meaningful
// name; a caller who wants a specific ID should rename the folder or use ariadne:scope create.
function hashSuffixedSlug(directory) {
  return `${pathSlug(directory)}-${crypto.createHash("sha256").update(directory).digest("hex").slice(0, 8)}`;
}

// Legacy candidate discovery for the "adopt" operation only. A directory is a legacy
// candidate when it has a local AGENTS.md (the LLD's own discovery signal) and is not
// already active, pending, or explicitly dismissed. The vault root is always eligible
// unless it is already active or pending. Discovery never touches disk; it only plans.
function discoverLegacyCandidates(inventory, model) {
  // A directory holding a malformed *explicit* type: scope-index descriptor already declares
  // deliberate (if broken) scope identity. Silently reinterpreting it as ordinary legacy
  // content -- merging fresh, auto-derived frontmatter over it, or discovering a
  // freshly-derived scope_id that may not match what the author intended -- would discard
  // that identity without the human ever being asked. Refuse instead of guessing.
  if (model.invalidDescriptors && model.invalidDescriptors.length) {
    const first = model.invalidDescriptors[0];
    throw new Error(`legacy discovery refused: invalid scope descriptor at ${first.file.relativePath} (${first.error.message}); repair or remove it before adopting`);
  }
  const knownIds = new Set([...model.descriptorsById.keys(), ...model.pendingDescriptors.map((item) => item.scopeId)]);
  const knownDirectories = new Map();
  for (const item of model.descriptorsById.values()) knownDirectories.set(item.scopePath, item.scopeId);
  for (const item of model.pendingDescriptors) knownDirectories.set(item.directory, item.scopeId);

  const eligible = [];
  for (const directory of inventory.directories) {
    const dir = directory.relativePath;
    if (knownDirectories.has(dir)) continue;
    // Hidden/tool-owned directories (.ariadne, .claude, .codex, and similar) are never legacy
    // scope candidates even if they happen to contain an AGENTS.md.
    if (dir !== "." && dir.split("/").some((segment) => segment.startsWith("."))) continue;
    if (dir !== ".") {
      const agents = fileAt(inventory, dir, "AGENTS.md");
      if (!agents || isDismissedCandidate(agents)) continue;
    }
    if (anyIndexDismissed(inventory, dir)) continue;
    eligible.push(dir);
  }
  eligible.sort((left, right) => {
    const leftDepth = left === "." ? 0 : left.split("/").length;
    const rightDepth = right === "." ? 0 : right.split("/").length;
    return leftDepth - rightDepth || Buffer.from(left).compare(Buffer.from(right));
  });

  const naiveSlugs = new Map();
  for (const dir of eligible) {
    const slug = dir === "." ? "root" : slugify(path.posix.basename(dir));
    naiveSlugs.set(slug, [...(naiveSlugs.get(slug) || []), dir]);
  }

  const resolved = new Map(knownDirectories);
  const candidates = [];
  for (const dir of eligible) {
    let parentScopeId = null;
    if (dir !== ".") {
      let current = path.posix.dirname(dir);
      while (current !== "." && !resolved.has(current)) current = path.posix.dirname(current);
      parentScopeId = resolved.get(current) || resolved.get(".") || "root";
    }
    let scopeId = dir === "." ? "root" : slugify(path.posix.basename(dir));
    if (dir !== "." && ((naiveSlugs.get(scopeId) || []).length > 1 || knownIds.has(scopeId))) scopeId = pathSlug(dir);
    if (dir !== "." && knownIds.has(scopeId)) scopeId = hashSuffixedSlug(dir);
    if (knownIds.has(scopeId)) throw new Error(`legacy candidate scope_id collision could not be resolved deterministically: ${dir}`);
    const bare = fileAt(inventory, dir, "00 Index.md");
    const title = (bare && bare.frontmatter && typeof bare.frontmatter.title === "string" && bare.frontmatter.title.trim())
      || namedIndexTitle(inventory, dir)
      || (dir === "." ? "Vault" : path.posix.basename(dir));
    const descriptor = Object.freeze({
      scopeId, scopePath: dir, parentScopeId, title, status: "active", scopeOrder: null,
      formerScopePaths: [], replacedByScopeId: null, fileRecord: bare || null, directory: dir, supported: true,
    });
    resolved.set(dir, scopeId);
    knownIds.add(scopeId);
    candidates.push(descriptor);
  }
  return candidates;
}

function planOperation(inventory, model, requestValue) {
  const request = parseOperationRequest(requestValue);
  const legacyCandidates = request.operation === "adopt" ? discoverLegacyCandidates(inventory, model) : [];
  const current = model.descriptorsById.get(request.target_scope_id)
    || model.pendingDescriptors.find((item) => item.scopeId === request.target_scope_id)
    || legacyCandidates.find((item) => item.scopeId === request.target_scope_id);
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
    const pool = [...pending, ...legacyCandidates];
    let selected = request.adoption_mode === "whole-vault" ? pool : pool.filter((item) => item.scopeId === request.target_scope_id || current.scopePath.startsWith(`${item.scopePath}/`));
    if (!selected.some((item) => item.scopeId === request.target_scope_id)) throw new Error("adoption target is not a pending descriptor");
    if (!selected.some((item) => item.scopeId === "root")) {
      const rootCandidate = legacyCandidates.find((item) => item.scopeId === "root");
      if (rootCandidate) selected = [rootCandidate, ...selected];
    }
    descriptors = [...model.descriptors, ...selected];
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
      if (item.scopeId === current.scopeId) return { ...item, scopePath: request.destination_path, parentScopeId: parents[0].scopeId, formerScopePaths: [...new Set([...(item.formerScopePaths || []), request.source_path])].sort(), replacedByScopeId: item.status === "retired" ? item.replacedByScopeId : null };
      if (item.scopePath.startsWith(`${request.source_path}/`)) return { ...item, scopePath: `${request.destination_path}${item.scopePath.slice(request.source_path.length)}`, replacedByScopeId: item.status === "retired" ? item.replacedByScopeId : null };
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
      descriptors = descriptors.map((item) => item.scopeId === current.scopeId ? { ...item, status: request.desired_status, replacedByScopeId: request.desired_status === "retired" ? (replacement ? replacement.scopeId : item.replacedByScopeId) : null } : item);
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
    .map((item) => ({ path: item.path, recognized: true, authorized: false, action: "report-only; no rewrite authorized" }));
  const base_formula_reports = baseMentions.filter((item) => !item.recognized)
    .map((item) => ({ path: item.path, code: "unsupported-base-formula", rewrite_proposed: false }));
  const normalization_proposals = request.normalize_files.map((item) => ({ path: item, authorized: false, action: "normalization deferred" }));
  const content_write_paths = lifecycleRefused ? [] : [...new Set(replacements.map((item) => item.path))].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
  const refusals = [];
  if (lifecycleRefused) refusals.push({ code: "lifecycle-transition-refused", path: descriptorPath(current) });
  refusals.push(...normalization_proposals.map((item) => ({ code: "normalization-deferred", path: item.path })));
  const missing = content_write_paths.filter((item) => !request.allowed_write_paths.includes(item));
  const unused = request.allowed_write_paths.filter((item) => !content_write_paths.includes(item));
  refusals.push(...missing.map((item) => ({ code: "missing-write-authorization", path: item })));
  refusals.push(...unused.map((item) => ({ code: "unused-write-authorization", path: item })));
  return Object.freeze({ plan_schema: 1, operation: request.operation, target_scope_id: request.target_scope_id, preconditions, lifecycle_checks, moves, replacements, base_formula_proposals, base_formula_reports, normalization_proposals, content_write_paths, refusals, write_authorized: refusals.length === 0 });
}

module.exports = { hashPlan, parseOperationRequest, planOperation };
