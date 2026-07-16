"use strict";

const path = require("path");
const { parseScopeDescriptor } = require("./schema");

function directoryOf(file) {
  return path.posix.dirname(file) === "." ? "." : path.posix.dirname(file);
}

function isPhysicalAncestor(ancestor, descendant) {
  return ancestor === "." || descendant.startsWith(`${ancestor}/`);
}

function compareDescriptors(left, right) {
  const leftOrder = left.scopeOrder === null ? Number.MAX_SAFE_INTEGER : left.scopeOrder;
  const rightOrder = right.scopeOrder === null ? Number.MAX_SAFE_INTEGER : right.scopeOrder;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  const titleOrder = Buffer.from(left.title.normalize("NFC")).compare(Buffer.from(right.title.normalize("NFC")));
  if (titleOrder !== 0) return titleOrder;
  return Buffer.from(left.scopeId).compare(Buffer.from(right.scopeId));
}

function buildTopology(inventory) {
  const recognized = [];
  const candidates = [];
  for (const file of inventory.files) {
    if (path.posix.basename(file.relativePath) !== "00 Index.md") continue;
    if (!file.lstat.isFile() || !file.canonicalContained || !file.frontmatter) continue;
    let descriptor = null;
    try {
      descriptor = parseScopeDescriptor(file.relativePath, file.frontmatter);
    } catch (error) {
      recognized.push(Object.freeze({ file, error, invalid: true, directory: directoryOf(file.relativePath) }));
      continue;
    }
    if (descriptor) {
      recognized.push(Object.freeze({ ...descriptor, fileRecord: file, directory: directoryOf(file.relativePath) }));
    } else if (String(file.frontmatter.ariadne_scope_adoption || "") !== "dismissed") {
      candidates.push(file);
    }
  }

  const root = recognized.find((item) => !item.invalid && item.directory === "." && item.scopeId === "root");
  const active = Boolean(root && root.supported && root.scopePath === ".");
  const unsupportedRoot = Boolean(root && !root.supported);
  const supported = recognized.filter((item) => !item.invalid && item.supported);
  const pendingDescriptors = active ? [] : Object.freeze(recognized.filter((item) => !item.invalid));
  const adopted = active ? supported : [];

  // Root's own directory "." must always sort first. Counting "." as a one-segment path (via
  // a plain split("/").length) ties it with any real top-level folder, and that tie was broken
  // by alphabetical file-scan order -- normally harmless, because "00 Index.md" (root, no
  // folder prefix) sorts before nearly every letter-prefixed folder path, but a folder name
  // starting with a character earlier than "0" in the file-scan sort order (e.g. "#Plan") could
  // reorder ahead of root, so the not-yet-registered root couldn't be found as any child's
  // ancestor and the entire subtree was silently dropped from the topology.
  const depthOf = (directory) => directory === "." ? 0 : directory.split("/").length;
  const byPath = [...adopted].sort((left, right) => depthOf(left.directory) - depthOf(right.directory));
  const descriptorsById = new Map();
  for (let descriptor of byPath) {
    const actualPath = descriptor.directory;
    if (descriptor.scopePath !== actualPath) continue;
    if (descriptorsById.has(descriptor.scopeId)) continue;
    if (descriptor.scopeId !== "root") {
      const ancestors = [...descriptorsById.values()].filter((candidate) => isPhysicalAncestor(candidate.directory, actualPath));
      ancestors.sort((left, right) => right.directory.length - left.directory.length);
      const nearest = ancestors[0];
      if (!nearest || descriptor.parentScopeId !== nearest.scopeId) continue;
      const relative = path.posix.relative(nearest.directory === "." ? "" : nearest.directory, actualPath);
      descriptor = Object.freeze({ ...descriptor, transparentPath: relative });
    } else {
      descriptor = Object.freeze({ ...descriptor, transparentPath: "." });
    }
    descriptorsById.set(descriptor.scopeId, descriptor);
  }

  const { descriptors, descriptorsById: orderedDescriptorsById, childrenById } = orderDescriptors(descriptorsById);
  const invalidDescriptors = Object.freeze(recognized.filter((item) => item.invalid));

  return Object.freeze({
    active,
    descriptors,
    descriptorsById: orderedDescriptorsById,
    childrenById,
    candidates: Object.freeze(candidates),
    pendingDescriptors,
    invalidDescriptors,
    unsupportedRoot,
  });
}

// Shared sibling-ordering and preorder traversal for a scopeId -> descriptor map. Both
// buildTopology (post-write, from disk) and virtualModel (write-time planning, in-memory)
// must use this so a value like a Scope Map or Canvas never drifts between what a write
// produces and what a later validation/check run considers canonical.
function orderDescriptors(descriptorsById) {
  const childrenById = new Map([...descriptorsById.keys()].map((id) => [id, []]));
  for (const descriptor of descriptorsById.values()) {
    if (descriptor.parentScopeId && childrenById.has(descriptor.parentScopeId)) {
      childrenById.get(descriptor.parentScopeId).push(descriptor);
    }
  }
  for (const children of childrenById.values()) children.sort(compareDescriptors);

  const orderedDescriptorsById = new Map();
  function visit(descriptor) {
    if (!descriptor || orderedDescriptorsById.has(descriptor.scopeId)) return;
    orderedDescriptorsById.set(descriptor.scopeId, descriptor);
    for (const child of childrenById.get(descriptor.scopeId) || []) visit(child);
  }
  visit(descriptorsById.get("root"));
  for (const descriptor of [...descriptorsById.values()].sort(compareDescriptors)) visit(descriptor);
  const descriptors = new Set(orderedDescriptorsById.values());
  return { descriptors, descriptorsById: orderedDescriptorsById, childrenById };
}

module.exports = { buildTopology, compareDescriptors, orderDescriptors };
