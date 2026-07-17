"use strict";

const crypto = require("crypto");
const path = require("path");

const STATUS_COLORS = Object.freeze({ active: "4", archived: "6", retired: "1" });
const WIDTH = 320;
const HEIGHT = 120;
const X_STEP = 480;
const Y_STEP = 180;

function result(path, text, reason, owner) {
  return Object.freeze({ path, bytes: Buffer.from(text, "utf8"), reason, owner });
}

function basePath(descriptor) { return descriptor.scopePath === "." ? "" : `${descriptor.scopePath}/`; }
function withoutMarkdownExtension(value) { return value.replace(/\.md$/u, ""); }
function descriptorFile(descriptor) { return `${basePath(descriptor)}00 Index.md`; }
function instructionFile(descriptor) { return `${basePath(descriptor)}AGENTS.md`; }
function qualifiedLink(sourceFile, targetFile, keepExtension = false) {
  if (targetFile.includes("/")) return keepExtension ? targetFile : withoutMarkdownExtension(targetFile);
  const relative = path.posix.relative(path.posix.dirname(sourceFile), targetFile);
  const target = relative || targetFile;
  return keepExtension ? target : withoutMarkdownExtension(target);
}
function descriptorLink(sourceFile, descriptor) { return qualifiedLink(sourceFile, descriptorFile(descriptor)); }
function parent(model, descriptor) { return descriptor.parentScopeId ? model.descriptorsById.get(descriptor.parentScopeId) : null; }
function children(model, descriptor) { return model.childrenById.get(descriptor.scopeId) || []; }
function marker(name, body) { return `<!-- ariadne:${name}:start -->\n${body}\n<!-- ariadne:${name}:end -->\n`; }

function boundaryBody(model, descriptor) {
  const sourceFile = descriptorFile(descriptor);
  const lines = ["## Scope Boundary", "", `- Scope: ${descriptor.title} (\`${descriptor.scopeId}\`)`, `- Path: \`${descriptor.scopePath}\``, `- Status: ${descriptor.status}`];
  const up = parent(model, descriptor);
  if (up) lines.push(`- Parent: [[${descriptorLink(sourceFile, up)}|${up.title}]] (\`${up.scopeId}\`)`);
  const below = children(model, descriptor);
  if (below.length) lines.push("- Direct children:", ...below.map((child) => `  - [[${descriptorLink(sourceFile, child)}|${child.title}]] (\`${child.scopeId}\`, ${child.status})`));
  else lines.push("- Direct children: none");
  return lines.join("\n");
}

function inheritanceBody(model, descriptor) {
  const sourceFile = instructionFile(descriptor);
  const chain = [];
  let current = descriptor;
  while (current) { chain.unshift(current); current = parent(model, current); }
  return ["## Scope Inheritance", "", "Read and obey this root-to-current instruction chain:", ...chain.map((item) => {
    if (instructionFile(item) === sourceFile) return `- ${item.title} instructions (this file; \`${item.scopeId}\`)`;
    return `- [[${qualifiedLink(sourceFile, instructionFile(item), true)}|${item.title} instructions]] (\`${item.scopeId}\`)`;
  })].join("\n");
}

function navigationBody(model, descriptor) {
  const sourceFile = `${basePath(descriptor)}Agent/00 Agent Navigation.md`;
  const routingFile = `${basePath(descriptor)}Agent/Task Routing Matrix.md`;
  const lines = ["## Scope Navigation", "", `- Boundary: [[${descriptorLink(sourceFile, descriptor)}|${descriptor.title}]]`, `- Routing: [[${qualifiedLink(sourceFile, routingFile)}|Task Routing Matrix]]`];
  const up = parent(model, descriptor);
  if (up) lines.push(`- Parent: [[${descriptorLink(sourceFile, up)}|${up.title}]]`);
  lines.push(...children(model, descriptor).map((child) => `- Child: [[${descriptorLink(sourceFile, child)}|${child.title}]]`));
  return lines.join("\n");
}

function routingBody(model, descriptor) {
  const sourceFile = `${basePath(descriptor)}Agent/Task Routing Matrix.md`;
  const lines = ["## Scope Routing", "", "| Destination | Scope ID | Status |", "| --- | --- | --- |"];
  const up = parent(model, descriptor);
  if (up) lines.push(`| [[${descriptorLink(sourceFile, up)}|Parent: ${up.title}]] | \`${up.scopeId}\` | ${up.status} |`);
  lines.push(`| [[${descriptorLink(sourceFile, descriptor)}|Current: ${descriptor.title}]] | \`${descriptor.scopeId}\` | ${descriptor.status} |`);
  for (const child of children(model, descriptor)) lines.push(`| [[${descriptorLink(sourceFile, child)}|Child: ${child.title}]] | \`${child.scopeId}\` | ${child.status} |`);
  return lines.join("\n");
}

function renderCheckpointBlocks(model) {
  const outputs = [];
  for (const descriptor of model.descriptors) {
    const base = basePath(descriptor);
    outputs.push(result(`${base}00 Index.md`, marker("scope-boundary", boundaryBody(model, descriptor)), "synchronize scope boundary", "marker:scope-boundary"));
    outputs.push(result(`${base}AGENTS.md`, marker("scope-inheritance", inheritanceBody(model, descriptor)), "synchronize instruction inheritance", "marker:scope-inheritance"));
    outputs.push(result(`${base}Agent/00 Agent Navigation.md`, marker("scope-navigation", navigationBody(model, descriptor)), "synchronize scope navigation", "marker:scope-navigation"));
    outputs.push(result(`${base}Agent/Task Routing Matrix.md`, marker("scope-routing", routingBody(model, descriptor)), "synchronize scope routing", "marker:scope-routing"));
  }
  return Object.freeze(outputs);
}

function renderScopeRegistry(model) {
  const filter = ["    filters:", "      and:", '        - file.ext == "md"', '        - file.name == "00 Index"', '        - type == "scope-index"'];
  const yaml = [
    "views:",
    "  - name: Scope Topology", "    type: table", ...filter, "    order:", "      - scope_id", "      - scope_path", "      - parent_scope_id", "      - status", "      - scope_order",
    "  - name: Lifecycle", "    type: table", ...filter, "    order:", "      - status", "      - scope_id", "      - scope_path", "      - former_scope_paths", "",
  ].join("\n");
  return result("Bases/Scope Registry.base", yaml, "regenerate scope registry", "generated-file");
}

function yamlScalar(value) {
  const text = String(value).trim();
  if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"'))) return text.slice(1, -1);
  return text;
}

function yamlList(value) {
  const text = String(value || "").trim();
  if (!text.startsWith("[") || !text.endsWith("]")) return [];
  return text.slice(1, -1).split(",").map(yamlScalar).filter(Boolean);
}

function normalizeScopeRegistry(text) {
  const lines = String(text).split(/\r?\n/gu).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
  if (!lines.includes("views:")) throw new Error("registry requires views");
  const views = [];
  let view = null;
  let section = null;
  for (const line of lines.slice(lines.indexOf("views:") + 1)) {
    const start = line.match(/^-(?:\s+)(name|type|filters|order):\s*(.*)$/u);
    if (start) {
      if (view) views.push(view);
      view = { name: "", type: "", filters: [], order: [] };
      section = null;
      const [, key, value] = start;
      if (key === "name" || key === "type") view[key] = yamlScalar(value);
      else { section = key; view[key].push(...yamlList(value)); }
      continue;
    }
    if (!view) throw new Error("registry content outside a view");
    const property = line.match(/^(name|type|filters|order):\s*(.*)$/u);
    if (property) {
      const [, key, value] = property;
      if (key === "name" || key === "type") { view[key] = yamlScalar(value); section = null; }
      else { section = key; view[key].push(...yamlList(value)); }
      continue;
    }
    const and = line.match(/^and:\s*(.*)$/u);
    if (and && section === "filters") { view.filters.push(...yamlList(and[1])); continue; }
    const item = line.match(/^-(?:\s+)(.*)$/u);
    if (item && section) { view[section].push(yamlScalar(item[1])); continue; }
    throw new Error(`unsupported registry YAML: ${line}`);
  }
  if (view) views.push(view);
  for (const item of views) item.filters.sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
  views.sort((a, b) => Buffer.from(a.name).compare(Buffer.from(b.name)));
  return views;
}

function normalizeScopeCanvas(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) throw new Error("invalid Canvas");
  const canonical = (item) => {
    if (Array.isArray(item)) return item.map(canonical);
    if (item && typeof item === "object") return Object.fromEntries(Object.keys(item).sort().map((key) => [key, canonical(item[key])]));
    return item;
  };
  const byId = (left, right) => Buffer.from(String(left.id)).compare(Buffer.from(String(right.id)));
  const normalized = canonical(value);
  delete normalized.metadata;
  normalized.nodes.sort(byId);
  normalized.edges.sort(byId);
  return normalized;
}

function treeLines(model, descriptor, sourceFile, prefix = "") {
  const lines = [`${prefix}- [[${descriptorLink(sourceFile, descriptor)}|${descriptor.title}]] — \`${descriptor.scopeId}\` — \`${descriptor.scopePath}\` — ${descriptor.status}`];
  for (const child of children(model, descriptor)) lines.push(...treeLines(model, child, sourceFile, `${prefix}  `));
  return lines;
}

function renderScopeMapMarkdown(model) {
  const root = model.descriptorsById.get("root");
  const sourceFile = "Agent/Scope Map.md";
  const body = ["## Scope Map", "", ...(root ? treeLines(model, root, sourceFile) : [])].join("\n");
  return result("Agent/Scope Map.md", marker("scope-map", body), "regenerate scope map", "marker:scope-map");
}

function stableId(kind, value) { return crypto.createHash("sha256").update(`${kind}\0${value}`).digest("hex").slice(0, 16); }

function labelText(descriptor) {
  return `[[${descriptorLink("Agent/Scope Map.canvas", descriptor)}|${descriptor.title}]]\n\`${descriptor.scopeId}\`\n${descriptor.scopePath}`;
}

// A text node can carry a clickable wikilink and a meaningful scope label. Using a separate file
// node would add a second box named "00 Index" for every scope without adding information.
function renderScopeMapCanvas(model, options = {}) {
  const idFor = options.idFactory || stableId;
  const depths = new Map();
  for (const descriptor of model.descriptors) depths.set(descriptor.scopeId, descriptor.parentScopeId ? (depths.get(descriptor.parentScopeId) || 0) + 1 : 0);
  const ids = new Set();
  const claim = (id) => { if (ids.has(id)) throw new Error(`Canvas ID collision: ${id}`); ids.add(id); return id; };
  const nodes = [];
  const nodeByScope = new Map();
  [...model.descriptors].forEach((descriptor, index) => {
    const x = depths.get(descriptor.scopeId) * X_STEP;
    const nodeId = claim(idFor("scope-node", descriptor.scopeId));
    nodes.push({ id: nodeId, type: "text", text: labelText(descriptor), x, y: index * Y_STEP, width: WIDTH, height: HEIGHT, color: STATUS_COLORS[descriptor.status] });
    nodeByScope.set(descriptor.scopeId, nodeId);
  });
  const edges = [...model.descriptors].filter((descriptor) => descriptor.parentScopeId).map((descriptor) => ({
    id: claim(idFor("scope-edge", `${descriptor.parentScopeId}\0${descriptor.scopeId}`)),
    fromNode: nodeByScope.get(descriptor.parentScopeId), fromSide: "right", toNode: nodeByScope.get(descriptor.scopeId), toSide: "left",
  }));
  return result("Agent/Scope Map.canvas", `${JSON.stringify({ nodes, edges }, null, 2)}\n`, "regenerate scope canvas", "generated-file");
}

module.exports = { normalizeScopeCanvas, normalizeScopeRegistry, renderCheckpointBlocks, renderScopeMapCanvas, renderScopeMapMarkdown, renderScopeRegistry };
