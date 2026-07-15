"use strict";

const path = require("path");

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/u;
const WINDOWS_RESERVED = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu;
const SCOPE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const STATUSES = new Set(["active", "archived", "retired"]);

function normalizeNfc(value) {
  return String(value).normalize("NFC");
}

function rejectUnsafeText(value, label) {
  if (CONTROL_CHARACTERS.test(value)) throw new Error(`${label} contains a control character`);
}

function normalizeScopePath(value) {
  const source = normalizeNfc(value);
  rejectUnsafeText(source, "scope path");
  if (source === ".") return ".";
  if (source === "" || source.startsWith("/") || source.startsWith("\\") || /^[A-Za-z]:[\\/]/u.test(source)) {
    throw new Error("scope path must be vault-relative");
  }
  const segments = source.replace(/\\/gu, "/").split("/");
  const normalized = [];
  for (const segment of segments) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") throw new Error("scope path must not contain traversal");
    if (/[<>:"|?*]/u.test(segment)) {
      throw new Error(`scope path contains Windows-illegal character in segment: ${segment}`);
    }
    if (WINDOWS_RESERVED.test(segment) || /[. ]$/u.test(segment)) {
      throw new Error(`scope path contains reserved segment: ${segment}`);
    }
    normalized.push(segment);
  }
  if (normalized.length === 0) throw new Error("scope path must be vault-relative");
  return normalized.join("/");
}

function scalar(value, field, { optional = false } = {}) {
  if (value === undefined && optional) return undefined;
  if (value === undefined || value === null || Array.isArray(value) || typeof value === "object") {
    throw new Error(`${field} must be a scalar`);
  }
  const result = normalizeNfc(value).trim();
  rejectUnsafeText(result, field);
  if (result === "" && !optional) throw new Error(`${field} must not be empty`);
  return result;
}

function flatList(value, field) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((entry) => Array.isArray(entry) || entry !== null && typeof entry === "object")) {
    throw new Error(`${field} supports only flat scalar lists`);
  }
  return value.map((entry) => scalar(entry, field));
}

function parseScopeDescriptor(file, frontmatter) {
  if (path.posix.basename(String(file).replace(/\\/gu, "/")) !== "00 Index.md") return null;
  if (!frontmatter || String(frontmatter.type || "") !== "scope-index") return null;
  for (const [field, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) flatList(value, field);
    else if (value !== null && typeof value === "object") {
      throw new Error(`${field} supports only scalars and flat scalar lists`);
    }
  }

  const schema = scalar(frontmatter.scope_schema, "scope_schema");
  const scopeId = scalar(frontmatter.scope_id, "scope_id");
  const scopePath = normalizeScopePath(scalar(frontmatter.scope_path, "scope_path"));
  const title = scalar(frontmatter.title, "title");
  const status = scalar(frontmatter.status, "status");
  const parentScopeId = scalar(frontmatter.parent_scope_id, "parent_scope_id", { optional: true });
  const scopeOrderText = scalar(frontmatter.scope_order, "scope_order", { optional: true });
  const formerScopePaths = flatList(frontmatter.former_scope_paths, "former_scope_paths").map(normalizeScopePath);

  if (!SCOPE_ID.test(scopeId)) throw new Error("scope_id must be lower-kebab-case");
  if (parentScopeId !== undefined && !SCOPE_ID.test(parentScopeId)) throw new Error("parent_scope_id must be lower-kebab-case");
  if (!STATUSES.has(status)) throw new Error(`unsupported scope status: ${status}`);
  if (scopeId === "root" && scopePath !== ".") throw new Error("root scope_path must be .");
  if (scopePath === "." && scopeId !== "root") throw new Error("vault root must use scope_id root");
  if (scopeId === "root" && parentScopeId !== undefined) throw new Error("root must omit parent_scope_id");
  if (scopeId !== "root" && parentScopeId === undefined) throw new Error("non-root scope requires parent_scope_id");

  let scopeOrder = null;
  if (scopeOrderText !== undefined) {
    if (!/^-?\d+$/u.test(scopeOrderText)) throw new Error("scope_order must be an integer");
    scopeOrder = Number(scopeOrderText);
    if (!Number.isSafeInteger(scopeOrder)) throw new Error("scope_order must be a safe integer");
  }

  return Object.freeze({
    file: String(file).replace(/\\/gu, "/"),
    schema: Number(schema),
    supported: schema === "1",
    scopeId,
    scopePath,
    parentScopeId: parentScopeId === undefined ? null : parentScopeId,
    title,
    status,
    scopeOrder,
    formerScopePaths,
    tags: flatList(frontmatter.tags, "tags"),
  });
}

module.exports = { normalizeNfc, normalizeScopePath, parseScopeDescriptor };
