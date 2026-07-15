"use strict";

const crypto = require("crypto");
const path = require("path");
const { parseScopeDescriptor } = require("./schema");
const { normalizeScopeCanvas, normalizeScopeRegistry, renderScopeMapCanvas, renderScopeMapMarkdown, renderScopeRegistry } = require("./render");

function sortedUnique(values) {
  return [...new Set((values || []).map(String))].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
}

function normalizedFindingPath(value) {
  const normalized = String(value || "").replace(/\\/gu, "/").normalize("NFC").replace(/^\.\//u, "");
  return normalized === "." ? "" : normalized;
}

function finding({ code, origin = "", obligations = [], scopeIds = [], message, discriminator = "" }) {
  const structural = {
    code: String(code),
    origin: normalizedFindingPath(origin),
    obligations: sortedUnique(obligations.map(normalizedFindingPath)),
    scope_ids: sortedUnique(scopeIds),
    discriminator: String(discriminator).normalize("NFC"),
  };
  const findingId = crypto.createHash("sha256").update(JSON.stringify(structural)).digest("hex");
  return Object.freeze({
    code: structural.code,
    finding_id: findingId,
    origin: structural.origin,
    obligations: Object.freeze(structural.obligations),
    scope_ids: Object.freeze(structural.scope_ids),
    message: String(message),
    sort_key: `${structural.origin}\u0000${structural.code}\u0000${structural.discriminator}\u0000${findingId}`,
  });
}

function descriptorDirectory(file) {
  const directory = path.posix.dirname(file.relativePath);
  return directory === "." ? "." : directory;
}

function descriptorErrorToken(frontmatter) {
  const nested = Object.entries(frontmatter).filter(([, value]) => value !== null && typeof value === "object" &&
    (!Array.isArray(value) || value.some((entry) => entry !== null && typeof entry === "object")));
  if (nested.length > 0) return `nested:${nested.map(([field]) => field).sort().join(",")}`;
  for (const field of ["scope_schema", "scope_id", "scope_path", "title", "status"]) {
    if (frontmatter[field] === undefined || frontmatter[field] === null || frontmatter[field] === "") return `missing:${field}`;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(String(frontmatter.scope_id))) return "format:scope_id";
  if (frontmatter.parent_scope_id !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(String(frontmatter.parent_scope_id))) return "format:parent_scope_id";
  if (!new Set(["active", "archived", "retired"]).has(String(frontmatter.status))) return "value:status";
  if (frontmatter.scope_order !== undefined && !/^-?\d+$/u.test(String(frontmatter.scope_order))) return "format:scope_order";
  return "invalid:descriptor";
}

function scopeFindings(topology, inventory) {
  const results = [];
  const parsed = [];
  const add = (code, origin, message, scopeId = "", obligations = [], discriminator = "") => {
    results.push(finding({ code, origin, message, obligations, discriminator, scopeIds: scopeId ? [scopeId] : [] }));
  };

  for (const file of inventory.files) {
    if (path.posix.basename(file.relativePath) !== "00 Index.md" || !file.frontmatter) continue;
    if (String(file.frontmatter.type || "") !== "scope-index") {
      if (String(file.frontmatter.ariadne_scope_adoption || "") === "dismissed") {
        add("dismissed-candidate", file.relativePath, `${file.relativePath}: scope adoption candidate is dismissed`, "", [], "dismissed");
      }
      continue;
    }
    try {
      const descriptor = parseScopeDescriptor(file.relativePath, file.frontmatter);
      parsed.push({ descriptor, file, directory: descriptorDirectory(file) });
      if (!descriptor.supported) add("invalid-schema", file.relativePath, `${file.relativePath}: unsupported scope_schema ${descriptor.schema}`, descriptor.scopeId, [], String(descriptor.schema));
    } catch (error) {
      add("invalid-schema", file.relativePath, `${file.relativePath}: ${error.message}`, String(file.frontmatter.scope_id || ""), [], descriptorErrorToken(file.frontmatter));
    }
  }

  if (topology.active) {
    const artifacts = [renderScopeRegistry(topology), renderScopeMapMarkdown(topology), renderScopeMapCanvas(topology)];
    const recordAt = (target) => inventory.files.find((candidate) => candidate.relativePath === target);
    const addMap = (artifact, detail) => add("scope-map-drift", artifact.path, `${artifact.path}: ${detail}`, "root", [artifact.path], detail);
    for (const artifact of artifacts) {
      const record = recordAt(artifact.path);
      if (!record || !record.lstat.isFile()) { addMap(artifact, "missing generated artifact"); continue; }
      const actual = record.rawBytes.toString("utf8");
      const expected = artifact.bytes.toString("utf8");
      if (artifact.path.endsWith(".canvas")) {
        try {
          if (JSON.stringify(normalizeScopeCanvas(JSON.parse(actual))) !== JSON.stringify(normalizeScopeCanvas(JSON.parse(expected)))) addMap(artifact, "Canvas topology differs");
        } catch { addMap(artifact, "Canvas is not valid JSON"); }
      } else if (artifact.path.endsWith(".base")) {
        try {
          if (JSON.stringify(normalizeScopeRegistry(actual)) !== JSON.stringify(normalizeScopeRegistry(expected))) addMap(artifact, "registry views or filters differ");
        } catch { addMap(artifact, "registry is not supported semantic YAML"); }
      } else {
        const marker = (text) => {
          const start = "<!-- ariadne:scope-map:start -->";
          const end = "<!-- ariadne:scope-map:end -->";
          const lines = text.split(/\r?\n/gu);
          const starts = lines.reduce((all, line, index) => line === start ? [...all, index] : all, []);
          const ends = lines.reduce((all, line, index) => line === end ? [...all, index] : all, []);
          return starts.length === 1 && ends.length === 1 && starts[0] < ends[0] ? lines.slice(starts[0], ends[0] + 1).join("\n") : null;
        };
        if (marker(actual) !== marker(expected)) addMap(artifact, "Markdown scope map differs");
      }
    }
  }

  if (topology.unsupportedRoot) {
    const root = parsed.find((item) => item.directory === "." && item.descriptor.scopeId === "root");
    add("unsupported-root", root ? root.file.relativePath : "00 Index.md", "00 Index.md: unsupported root disables scope topology", "root", [], root ? String(root.descriptor.schema) : "unknown");
  }
  for (const pending of topology.pendingDescriptors) {
    add("pending-adoption", pending.file, `${pending.file}: supported descriptor is pending root activation`, pending.scopeId, [], pending.scopePath);
  }

  const ids = new Map();
  const paths = new Map();
  for (const item of parsed) {
    if (!item.descriptor.supported) continue;
    const idGroup = ids.get(item.descriptor.scopeId) || [];
    idGroup.push(item);
    ids.set(item.descriptor.scopeId, idGroup);
    const pathGroup = paths.get(item.descriptor.scopePath) || [];
    pathGroup.push(item);
    paths.set(item.descriptor.scopePath, pathGroup);
  }
  for (const [id, group] of ids) if (group.length > 1) {
    const participants = sortedUnique(group.map((entry) => entry.file.relativePath));
    for (const item of group) add("duplicate-scope-id", item.file.relativePath, `${item.file.relativePath}: duplicate scope_id ${id}`, id, [item.file.relativePath], `${id}|${participants.join("|")}`);
  }
  for (const [scopePath, group] of paths) if (group.length > 1) {
    const participants = sortedUnique(group.map((entry) => entry.file.relativePath));
    for (const item of group) add("colliding-scope-path", item.file.relativePath, `${item.file.relativePath}: colliding scope_path ${scopePath}`, item.descriptor.scopeId, [item.file.relativePath], `${scopePath}|${participants.join("|")}`);
  }

  const byDirectory = new Map(parsed.filter((item) => item.descriptor.supported).map((item) => [item.directory, item]));
  for (const item of parsed.filter((entry) => entry.descriptor.supported)) {
    if (item.descriptor.scopeId !== "root") {
      let parentDirectory = path.posix.dirname(item.directory);
      let nearest = null;
      while (parentDirectory !== ".") {
        if (byDirectory.has(parentDirectory)) { nearest = byDirectory.get(parentDirectory); break; }
        parentDirectory = path.posix.dirname(parentDirectory);
      }
      if (!nearest) nearest = byDirectory.get(".") || null;
      if (!nearest || item.descriptor.parentScopeId !== nearest.descriptor.scopeId) {
        add("skipped-ancestor", item.file.relativePath, `${item.file.relativePath}: parent_scope_id does not name nearest adopted ancestor`, item.descriptor.scopeId, nearest ? [nearest.file.relativePath] : [], item.descriptor.parentScopeId || "");
      }
    }
    const base = item.directory === "." ? "" : `${item.directory}/`;
    const checkpoints = [
      ["AGENTS.md", "scope-inheritance"],
      ["Agent/00 Agent Navigation.md", "scope-navigation"],
      ["Agent/Task Routing Matrix.md", "scope-routing"],
    ];
    for (const [relative, marker] of checkpoints) {
      const required = `${base}${relative}`;
      const record = inventory.files.find((candidate) => candidate.relativePath === required);
      if (!record || !record.lstat.isFile()) {
        add("missing-checkpoint", item.file.relativePath, `${required}: missing required scope checkpoint`, item.descriptor.scopeId, [required], relative);
      } else {
        const text = record.rawBytes.toString("utf8");
        const start = `<!-- ariadne:${marker}:start -->`;
        const end = `<!-- ariadne:${marker}:end -->`;
        if ((text.match(new RegExp(start.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "gu")) || []).length !== 1 ||
            (text.match(new RegExp(end.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "gu")) || []).length !== 1) {
          add("marker-drift", required, `${required}: missing or ambiguous ${marker} marker pair`, item.descriptor.scopeId, [required], marker);
        }
      }
    }
    const descriptorText = item.file.rawBytes.toString("utf8");
    if (descriptorText.includes("ariadne:scope-boundary:") &&
        (!descriptorText.includes("<!-- ariadne:scope-boundary:start -->") || !descriptorText.includes("<!-- ariadne:scope-boundary:end -->"))) {
      add("marker-drift", item.file.relativePath, `${item.file.relativePath}: malformed scope-boundary markers`, item.descriptor.scopeId, [item.file.relativePath], "scope-boundary");
    }
  }

  for (const item of parsed) {
    const parent = parsed.find((candidate) => candidate.descriptor.scopeId === item.descriptor.parentScopeId);
    if (parent && parent.descriptor.status === "retired" && item.descriptor.status === "active") {
      add("lifecycle-violation", item.file.relativePath, `${item.file.relativePath}: active scope cannot descend from retired scope`, item.descriptor.scopeId, [parent.file.relativePath], `${parent.descriptor.scopeId}:retired`);
    }
  }

  const currentPaths = new Map(parsed.map((item) => [item.descriptor.scopePath, item]));
  for (const item of parsed) for (const former of item.descriptor.formerScopePaths) {
    const occupant = currentPaths.get(former);
    if (occupant) add("reserved-former-path", item.file.relativePath, `${former}: former scope path is occupied by ${occupant.descriptor.scopeId}`, item.descriptor.scopeId, [occupant.file.relativePath], former);
  }

  for (const file of inventory.files) {
    if (!file.frontmatter || String(file.frontmatter.type || "") !== "scope-redirect") continue;
    const data = file.frontmatter;
    const required = ["redirect_schema", "former_scope_path", "target_scope_id", "target_scope_path"];
    if (String(data.redirect_schema || "") !== "1" || required.some((field) => typeof data[field] !== "string" || data[field] === "")) {
      add("malformed-redirect", file.relativePath, `${file.relativePath}: malformed scope redirect`, String(data.target_scope_id || ""), [file.relativePath], required.filter((field) => !data[field]).join(","));
    }
  }

  return Object.freeze(results.sort((left, right) => Buffer.from(left.sort_key).compare(Buffer.from(right.sort_key))));
}

function filterFindingsByScope(findings, targetScopeId, topology) {
  if (!topology || !topology.descriptorsById.has(targetScopeId)) {
    return Object.freeze(findings.filter((item) => item.scope_ids.includes(targetScopeId)));
  }
  const target = topology.descriptorsById.get(targetScopeId);
  const ambiguousTargetId = findings.filter((item) => item.code === "duplicate-scope-id" && item.scope_ids.includes(targetScopeId)).length > 1;
  const targetPath = target.scopePath === "." ? "" : target.scopePath;
  const ancestorSurfaces = new Set();
  let current = target;
  while (current) {
    const base = current.scopePath === "." ? "" : `${current.scopePath}/`;
    ancestorSurfaces.add(`${base}00 Index.md`);
    ancestorSurfaces.add(`${base}AGENTS.md`);
    ancestorSurfaces.add(`${base}Agent/00 Agent Navigation.md`);
    ancestorSurfaces.add(`${base}Agent/Task Routing Matrix.md`);
    current = current.parentScopeId ? topology.descriptorsById.get(current.parentScopeId) : null;
  }
  function inTarget(value) {
    const candidate = normalizedFindingPath(value);
    return targetPath === "" || candidate === targetPath || candidate.startsWith(`${targetPath}/`);
  }
  return Object.freeze(findings.filter((item) => {
    if (item.origin && (inTarget(item.origin) || ancestorSurfaces.has(item.origin))) return true;
    if (item.obligations.some((value) => inTarget(value) || ancestorSurfaces.has(value))) return true;
    return !ambiguousTargetId && item.scope_ids.includes(targetScopeId);
  }));
}

const ADOPTION_CODES = new Set(["pending-adoption", "dismissed-candidate", "unsupported-root"]);
const MAP_CODES = new Set(["scope-map-drift"]);
function findingCounter(item) {
  if (ADOPTION_CODES.has(item.code)) return "scopeAdoptionWarnings";
  if (MAP_CODES.has(item.code)) return "scopeMapWarnings";
  return "scopeContractWarnings";
}

module.exports = { filterFindingsByScope, finding, findingCounter, scopeFindings };
