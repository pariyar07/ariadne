"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function excluded(relativePath) {
  return relativePath.split("/").some((segment) => segment === ".git" || segment === ".obsidian");
}

function parseScalar(source) {
  const value = source.trim();
  if (value === "null" || value === "~") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function parseInlineList(source) {
  const inner = source.slice(1, -1).trim();
  if (inner === "") return [];
  return inner.split(",").map((entry) => {
    const value = entry.trim();
    if (value.startsWith("[") || value.startsWith("{")) return { unsupportedNestedValue: value };
    return parseScalar(value);
  });
}

function parseFrontmatter(rawBytes) {
  let text = rawBytes.toString("utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u);
  if (!match) return null;
  const result = {};
  const lines = match[1].split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    const top = lines[index].match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/u);
    if (!top) continue;
    const key = top[1];
    const source = top[2] || "";
    if (source.startsWith("[") && source.endsWith("]")) {
      result[key] = parseInlineList(source);
      continue;
    }
    if (source.startsWith("{") && source.endsWith("}")) {
      result[key] = { unsupportedNestedValue: source };
      continue;
    }
    if (source !== "") {
      result[key] = parseScalar(source);
      continue;
    }
    const children = [];
    while (index + 1 < lines.length && /^\s+/u.test(lines[index + 1])) children.push(lines[++index]);
    if (children.length > 0 && children.every((line) => /^\s{2}-\s+/u.test(line))) {
      result[key] = children.map((line) => {
        const value = line.replace(/^\s{2}-\s+/u, "");
        if (value.startsWith("[") || value.startsWith("{")) return { unsupportedNestedValue: value };
        return parseScalar(value);
      });
    } else if (children.length > 0) {
      result[key] = { unsupportedNestedValue: children.join("\n") };
    } else {
      result[key] = "";
    }
  }
  return result;
}

function inventoryVault(vaultRoot) {
  const root = path.resolve(vaultRoot);
  const canonicalRoot = fs.realpathSync(root);
  const files = [];
  const directories = [];

  function directoryRecord(absolutePath, relativePath) {
    const lstat = fs.lstatSync(absolutePath);
    let canonicalPath = null;
    let canonicalContained = false;
    try {
      canonicalPath = fs.realpathSync(absolutePath);
      canonicalContained = canonicalPath === canonicalRoot || canonicalPath.startsWith(`${canonicalRoot}${path.sep}`);
    } catch (_error) {
      // An unreadable directory remains represented by its captured metadata.
    }
    return Object.freeze({ relativePath, lexicalPath: absolutePath, canonicalPath, canonicalContained, lstat });
  }

  function walk(directory, relativeDirectory = ".") {
    directories.push(directoryRecord(directory, relativeDirectory));
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => Buffer.from(left.name).compare(Buffer.from(right.name)));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = toPosix(path.relative(root, absolutePath)).normalize("NFC");
      if (excluded(relativePath)) continue;
      const lstat = fs.lstatSync(absolutePath);
      if (lstat.isDirectory()) {
        walk(absolutePath, relativePath);
        continue;
      }
      let canonicalPath = null;
      let contained = false;
      try {
        canonicalPath = fs.realpathSync(absolutePath);
        contained = canonicalPath === canonicalRoot || canonicalPath.startsWith(`${canonicalRoot}${path.sep}`);
      } catch (_error) {
        // Broken links remain inventoried and are not canonical candidates.
      }
      const rawBytes = lstat.isFile() ? fs.readFileSync(absolutePath) : null;
      files.push(Object.freeze({
        relativePath,
        lexicalPath: absolutePath,
        canonicalPath,
        canonicalContained: contained,
        lstat,
        linkCount: lstat.nlink,
        rawBytes,
        frontmatter: rawBytes && relativePath.endsWith(".md") ? parseFrontmatter(rawBytes) : null,
        contentHash: rawBytes ? crypto.createHash("sha256").update(rawBytes).digest("hex") : null,
        caseFoldPath: relativePath.toLocaleLowerCase("en-US"),
      }));
    }
  }

  walk(root);
  files.sort((left, right) => Buffer.from(left.relativePath).compare(Buffer.from(right.relativePath)));
  const caseFoldCollisions = new Map();
  for (const file of files) {
    const group = caseFoldCollisions.get(file.caseFoldPath) || [];
    group.push(file.relativePath);
    caseFoldCollisions.set(file.caseFoldPath, group);
  }
  for (const [key, group] of [...caseFoldCollisions]) if (group.length < 2) caseFoldCollisions.delete(key);
  directories.sort((left, right) => Buffer.from(left.relativePath).compare(Buffer.from(right.relativePath)));
  return Object.freeze({ root, canonicalRoot, files: Object.freeze(files), directories: Object.freeze(directories), caseFoldCollisions });
}

module.exports = { inventoryVault, parseFrontmatter };
