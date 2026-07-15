"use strict";

const crypto = require("crypto");

const STATUS_COLORS = Object.freeze({ active: "4", archived: "6", retired: "1" });
const WIDTH = 320;
const HEIGHT = 120;
const X_STEP = 480;
const Y_STEP = 180;

function result(path, text, reason, owner) {
  return Object.freeze({ path, bytes: Buffer.from(text, "utf8"), reason, owner });
}

function basePath(descriptor) { return descriptor.scopePath === "." ? "" : `${descriptor.scopePath}/`; }
function link(descriptor) { return descriptor.scopePath === "." ? "00 Index" : `${descriptor.scopePath}/00 Index`; }
function parent(model, descriptor) { return descriptor.parentScopeId ? model.descriptorsById.get(descriptor.parentScopeId) : null; }
function children(model, descriptor) { return model.childrenById.get(descriptor.scopeId) || []; }
function marker(name, body) { return `<!-- ariadne:${name}:start -->\n${body}\n<!-- ariadne:${name}:end -->\n`; }

function boundaryBody(model, descriptor) {
  const lines = ["## Scope Boundary", "", `- Scope: ${descriptor.title} (\`${descriptor.scopeId}\`)`, `- Path: \`${descriptor.scopePath}\``, `- Status: ${descriptor.status}`];
  const up = parent(model, descriptor);
  if (up) lines.push(`- Parent: [[${link(up)}|${up.title}]] (\`${up.scopeId}\`)`);
  const below = children(model, descriptor);
  if (below.length) lines.push("- Direct children:", ...below.map((child) => `  - [[${link(child)}|${child.title}]] (\`${child.scopeId}\`, ${child.status})`));
  else lines.push("- Direct children: none");
  return lines.join("\n");
}

function inheritanceBody(model, descriptor) {
  const chain = [];
  let current = descriptor;
  while (current) { chain.unshift(current); current = parent(model, current); }
  return ["## Scope Inheritance", "", "Read and obey this root-to-current instruction chain:", ...chain.map((item) => `- [[${basePath(item)}AGENTS.md|${item.title} instructions]] (\`${item.scopeId}\`)`)].join("\n");
}

function navigationBody(model, descriptor) {
  const lines = ["## Scope Navigation", "", `- Boundary: [[${link(descriptor)}|${descriptor.title}]]`];
  const up = parent(model, descriptor);
  if (up) lines.push(`- Parent: [[${link(up)}|${up.title}]]`);
  lines.push(...children(model, descriptor).map((child) => `- Child: [[${link(child)}|${child.title}]]`));
  return lines.join("\n");
}

function routingBody(model, descriptor) {
  const lines = ["## Scope Routing", "", "| Destination | Scope ID | Status |", "| --- | --- | --- |"];
  const up = parent(model, descriptor);
  if (up) lines.push(`| [[${link(up)}|Parent: ${up.title}]] | \`${up.scopeId}\` | ${up.status} |`);
  lines.push(`| [[${link(descriptor)}|Current: ${descriptor.title}]] | \`${descriptor.scopeId}\` | ${descriptor.status} |`);
  for (const child of children(model, descriptor)) lines.push(`| [[${link(child)}|Child: ${child.title}]] | \`${child.scopeId}\` | ${child.status} |`);
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
  normalized.nodes.sort(byId);
  normalized.edges.sort(byId);
  return normalized;
}

function treeLines(model, descriptor, prefix = "") {
  const lines = [`${prefix}- [[${link(descriptor)}|${descriptor.title}]] — \`${descriptor.scopeId}\` — \`${descriptor.scopePath}\` — ${descriptor.status}`];
  for (const child of children(model, descriptor)) lines.push(...treeLines(model, child, `${prefix}  `));
  return lines;
}

function renderScopeMapMarkdown(model) {
  const root = model.descriptorsById.get("root");
  const body = ["## Scope Map", "", ...(root ? treeLines(model, root) : [])].join("\n");
  return result("Agent/Scope Map.md", marker("scope-map", body), "regenerate scope map", "marker:scope-map");
}

function stableId(kind, value) { return crypto.createHash("sha256").update(`${kind}\0${value}`).digest("hex").slice(0, 16); }

function renderScopeMapCanvas(model) {
  const depths = new Map();
  for (const descriptor of model.descriptors) depths.set(descriptor.scopeId, descriptor.parentScopeId ? (depths.get(descriptor.parentScopeId) || 0) + 1 : 0);
  const ids = new Set();
  const claim = (id) => { if (ids.has(id)) throw new Error(`Canvas ID collision: ${id}`); ids.add(id); return id; };
  const nodes = [...model.descriptors].map((descriptor, index) => ({
    id: claim(stableId("scope-node", descriptor.scopeId)), type: "file", file: `${link(descriptor)}.md`,
    x: depths.get(descriptor.scopeId) * X_STEP, y: index * Y_STEP, width: WIDTH, height: HEIGHT, color: STATUS_COLORS[descriptor.status],
  }));
  const nodeByScope = new Map([...model.descriptors].map((descriptor, index) => [descriptor.scopeId, nodes[index].id]));
  const edges = [...model.descriptors].filter((descriptor) => descriptor.parentScopeId).map((descriptor) => ({
    id: claim(stableId("scope-edge", `${descriptor.parentScopeId}\0${descriptor.scopeId}`)),
    fromNode: nodeByScope.get(descriptor.parentScopeId), fromSide: "right", toNode: nodeByScope.get(descriptor.scopeId), toSide: "left",
  }));
  return result("Agent/Scope Map.canvas", `${JSON.stringify({ nodes, edges }, null, 2)}\n`, "regenerate scope canvas", "generated-file");
}

module.exports = { normalizeScopeCanvas, normalizeScopeRegistry, renderCheckpointBlocks, renderScopeMapCanvas, renderScopeMapMarkdown, renderScopeRegistry };
