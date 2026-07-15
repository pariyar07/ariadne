#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const GLOBAL_POLICY_FINGERPRINTS = [
  "Keep notes as plain Markdown",
  "Use YAML frontmatter",
  "Do not read the whole vault",
];

function toPosix(file) {
  return file.split(path.sep).join("/");
}

function excludedPath(file) {
  return file === ".obsidian" || file.startsWith(".obsidian/") || file.includes("/.obsidian/") ||
    file === ".git" || file.startsWith(".git/") || file.includes("/.git/");
}

function walk(dir, root = dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    const relative = toPosix(path.relative(root, absolute));
    if (excludedPath(relative)) continue;
    if (entry.isDirectory()) {
      walk(absolute, root, results);
    } else {
      results.push(relative);
    }
  }
  return results;
}

function withoutKnownExtension(file) {
  return file.replace(/\.(md|base|canvas)$/u, "");
}

function normalizeLinkTarget(target) {
  let normalized = String(target || "").trim();
  if (normalized.startsWith("<") && normalized.endsWith(">")) {
    normalized = normalized.slice(1, -1);
  }
  normalized = normalized.split("#", 1)[0] || "";
  normalized = normalized.split("?", 1)[0] || "";
  try {
    normalized = decodeURIComponent(normalized);
  } catch (_error) {
    // Keep the raw target when it is not valid percent-encoded text.
  }
  return normalized.replace(/^\.\//u, "").trim();
}

function wikilinkTargets(text) {
  return Array.from(text.matchAll(/!??\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]*)?\]\]/gu))
    .map((match) => normalizeLinkTarget(match[1]))
    .filter(Boolean);
}

function markdownLinkTargets(text) {
  return Array.from(text.matchAll(/\[[^\]]*\]\(([^)]+)\)/gu))
    .map((match) => normalizeLinkTarget(match[1]))
    .filter(Boolean)
    .filter((target) => !/^[a-z][a-z0-9+.-]*:/iu.test(target));
}

function textWithoutCode(text) {
  return text.replace(/```[\s\S]*?```/gu, "").replace(/`[^`\n]*`/gu, "");
}

function relativePath(fromFile, toFile) {
  return toPosix(path.posix.relative(path.posix.dirname(fromFile), toFile));
}

function linkAliasesFor(sourceFile, targetFile) {
  const relative = relativePath(sourceFile, targetFile);
  return Array.from(
    new Set(
      [
        targetFile,
        withoutKnownExtension(targetFile),
        relative,
        withoutKnownExtension(relative),
        path.posix.basename(targetFile),
        withoutKnownExtension(path.posix.basename(targetFile)),
      ]
        .map(normalizeLinkTarget)
        .filter(Boolean),
    ),
  );
}

function readText(file) {
  return fs.readFileSync(file, "utf8");
}

function fileLinksTo(sourceFile, targetFile) {
  if (!fs.existsSync(sourceFile)) return false;
  const text = textWithoutCode(readText(sourceFile));
  const links = [...wikilinkTargets(text), ...markdownLinkTargets(text)];
  const aliases = new Set(linkAliasesFor(sourceFile, targetFile));
  return links.some((link) => aliases.has(link));
}

function fileLinksToQualified(sourceFile, targetFile) {
  if (!fs.existsSync(sourceFile)) return false;
  const links = [
    ...wikilinkTargets(textWithoutCode(readText(sourceFile))),
    ...markdownLinkTargets(textWithoutCode(readText(sourceFile))),
  ];
  const qualified = new Set([targetFile, withoutKnownExtension(targetFile)].map(normalizeLinkTarget));
  return links.some((link) => qualified.has(link));
}

function basesScopeFile(file) {
  return path.posix.basename(path.posix.dirname(file)) === "Bases";
}

function rootBaseFile(file) {
  return path.posix.dirname(file) === "Bases";
}

function containsScopeFilter(text, scopePath) {
  const escaped = scopePath.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`file\\.inFolder\\(\\s*["']${escaped}["']\\s*\\)`, "u").test(text);
}

function hubFile(file) {
  const basename = path.posix.basename(file);
  if (basename === "00 Bases Index.md" && path.posix.basename(path.posix.dirname(file)) === "Bases") {
    return false;
  }
  return basename === "00 Index.md" || /^00 .*Index\.md$/u.test(basename);
}

function nearestParentHub(dir, hubsByDir) {
  let current = path.posix.dirname(dir);
  while (true) {
    if (hubsByDir.has(current)) return hubsByDir.get(current);
    if (current === ".") return null;
    const parent = path.posix.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function validateYamlSyntax(text, file) {
  const stack = [];
  let quote = null;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (quote === "\"" && char === "\\" && !escaped) {
        escaped = true;
        continue;
      }
      if (char === quote && !escaped) quote = null;
      escaped = false;
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
    } else if (char === "[" || char === "{") {
      stack.push(char);
    } else if (char === "]" || char === "}") {
      const opener = stack.pop();
      if ((char === "]" && opener !== "[") || (char === "}" && opener !== "{")) {
        throw new Error(`${file}: YAML syntax: unmatched ${char}`);
      }
    }
  }

  if (quote) throw new Error(`${file}: YAML syntax: unterminated quote`);
  if (stack.length > 0) throw new Error(`${file}: YAML syntax: unterminated ${stack[stack.length - 1]}`);

  for (const [lineIndex, line] of text.split(/\r?\n/u).entries()) {
    if (/^\t+/u.test(line)) {
      throw new Error(`${file}: YAML syntax: tab indentation on line ${lineIndex + 1}`);
    }
  }
}

function parseScalar(value) {
  let parsed = String(value).trim();
  if ((parsed.startsWith("\"") && parsed.endsWith("\"")) || (parsed.startsWith("'") && parsed.endsWith("'"))) {
    parsed = parsed.slice(1, -1);
  }
  return parsed;
}

function parseTopLevelScalars(yamlText) {
  const values = {};
  const nestedFields = new Set();
  const lines = yamlText.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*?)\s*$/u);
    if (!match) continue;
    let value = match[2];
    if (value === "[]") {
      values[match[1]] = [];
      continue;
    }
    if (value.startsWith("{") && value.endsWith("}")) {
      nestedFields.add(match[1]);
      continue;
    }
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      const entries = inner === "" ? [] : inner.split(",").map(parseScalar);
      if (entries.some((entry) => entry.startsWith("{") || entry.startsWith("[") && !entry.startsWith("[["))) {
        nestedFields.add(match[1]);
      } else {
        values[match[1]] = entries;
      }
      continue;
    }
    if (value !== "") {
      values[match[1]] = parseScalar(value);
      continue;
    }

    const children = [];
    let cursor = index + 1;
    while (cursor < lines.length && !/^[A-Za-z0-9_-]+:\s*/u.test(lines[cursor])) {
      if (lines[cursor].trim() !== "") children.push(lines[cursor]);
      cursor += 1;
    }
    if (children.length === 0) {
      values[match[1]] = "";
    } else if (children.every((child) => /^\s{2}-\s+\S/u.test(child) && !/^\s{4,}/u.test(child))) {
      const entries = children.map((child) => parseScalar(child.replace(/^\s{2}-\s+/u, "")));
      if (entries.some((entry) => entry.startsWith("{") || entry.startsWith("[") && !entry.startsWith("[["))) nestedFields.add(match[1]);
      else values[match[1]] = entries;
    } else {
      nestedFields.add(match[1]);
    }
    index = cursor - 1;
  }
  return { values, nestedFields };
}

function frontmatterFor(text) {
  if (!text.startsWith("---\n")) return null;
  const end = text.indexOf("\n---", 4);
  if (end === -1) throw new Error("Markdown frontmatter: missing closing ---");
  return text.slice(4, end);
}

function scopeHub(hub, markdownFrontmatter) {
  if (!hubFile(hub)) return false;
  const frontmatter = markdownFrontmatter.get(hub) || {};
  if (String(frontmatter.type || "") === "scope-index") return true;

  const dir = path.posix.dirname(hub);
  return fs.existsSync(path.join(dir, "AGENTS.md")) ||
    fs.existsSync(path.join(dir, "Bases")) &&
      fs.readdirSync(path.join(dir, "Bases")).some((file) => file.endsWith(".base"));
}

function mentionsParentInheritance(text) {
  return /inherit\w*.*(?:parent|root)|(?:parent|root).*inherit\w*/ims.test(text) ||
    /local\s+delta.*(?:parent|root|master[- ]vault)|(?:parent|root|master[- ]vault).*local\s+delta/ims.test(text);
}

function addTarget(targets, key, file) {
  const normalized = normalizeLinkTarget(key);
  if (!normalized) return;
  if (!targets.has(normalized)) targets.set(normalized, []);
  const entries = targets.get(normalized);
  if (!entries.includes(file)) entries.push(file);
}

function lineCount(file) {
  return readText(file).split(/\r?\n/u).length;
}

function wikilinkCount(file) {
  return wikilinkTargets(textWithoutCode(readText(file))).length;
}

function commonPrefixDepth(first, second) {
  const firstParts = first.split("/");
  const secondParts = second.split("/");
  let depth = 0;
  while (depth < firstParts.length && depth < secondParts.length && firstParts[depth] === secondParts[depth]) depth += 1;
  return depth;
}

function navigationFile(file) {
  return hubFile(file) || path.posix.basename(file) === "Task Routing Matrix.md";
}

function resolveLink(sourceFile, target, allTargets, basenameTargets) {
  const normalized = normalizeLinkTarget(target);
  if (!normalized) return { file: null, candidates: [] };
  if (normalized.includes("/")) {
    const relativeCandidate = path.posix.normalize(path.posix.join(path.posix.dirname(sourceFile), normalized));
    const candidates = Array.from(new Set([
      ...(allTargets.get(normalized) || []),
      ...(allTargets.get(relativeCandidate) || []),
    ])).sort();
    return { file: candidates.length === 1 ? candidates[0] : null, candidates };
  }

  const candidates = (basenameTargets.get(normalized) || []).slice().sort();
  if (candidates.length <= 1) return { file: candidates[0] || null, candidates };
  const sameFolder = candidates.filter((candidate) => path.posix.dirname(candidate) === path.posix.dirname(sourceFile));
  if (sameFolder.length === 1) return { file: sameFolder[0], candidates };
  const scored = candidates.map((candidate) => ({
    candidate,
    depth: commonPrefixDepth(path.posix.dirname(sourceFile), path.posix.dirname(candidate)),
  }));
  const maxDepth = Math.max(...scored.map((entry) => entry.depth));
  const nearest = scored.filter((entry) => entry.depth === maxDepth).map((entry) => entry.candidate);
  return { file: nearest.length === 1 ? nearest[0] : null, candidates };
}

function scalarLinkTarget(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]*)?\]\]$/u);
  return match ? normalizeLinkTarget(match[1]) : null;
}

function valuesAsList(value) {
  return Array.isArray(value) ? value : [];
}

function validate(vaultPath, options = {}) {
  process.chdir(vaultPath);

  const errors = [];
  const markdownFrontmatter = new Map();
  const nestedFrontmatter = new Map();
  const files = walk(".");
  const markdownFiles = files.filter((file) => file.endsWith(".md")).sort();
  const baseFiles = files.filter((file) => file.endsWith(".base")).sort();
  const allTargets = files.filter((file) => !file.startsWith(".")).sort();

  const baseText = new Map();
  for (const file of baseFiles) {
    const text = readText(file);
    baseText.set(file, text);
    try {
      validateYamlSyntax(text, file);
    } catch (error) {
      errors.push(error.message);
    }
  }

  for (const file of markdownFiles) {
    const text = readText(file);
    let frontmatter = null;
    try {
      frontmatter = frontmatterFor(text);
      if (frontmatter === null) continue;
      validateYamlSyntax(frontmatter, file);
      const parsed = parseTopLevelScalars(frontmatter);
      markdownFrontmatter.set(file, parsed.values);
      nestedFrontmatter.set(file, parsed.nestedFields);
    } catch (error) {
      errors.push(`${file}: ${error.message}`);
    }
  }

  const targets = new Map();
  const basenameTargets = new Map();
  for (const file of allTargets) {
    const noExt = withoutKnownExtension(file);
    [file, noExt, path.posix.basename(file), path.posix.basename(noExt)].forEach((alias) => addTarget(targets, alias, file));
    [path.posix.basename(file), path.posix.basename(noExt)].forEach((alias) => addTarget(basenameTargets, alias, file));
  }

  const incoming = new Map();
  const outgoing = new Map();
  const broken = [];
  const ambiguousWikilinkWarnings = [];
  const ambiguousSeen = new Set();

  for (const file of markdownFiles) {
    const text = textWithoutCode(readText(file));
    for (const target of wikilinkTargets(text)) {
      outgoing.set(file, (outgoing.get(file) || 0) + 1);

      const resolution = resolveLink(file, target, targets, basenameTargets);
      if (!target.includes("/") && resolution.candidates.length > 1 && (!resolution.file || navigationFile(file))) {
        const key = `${file}\0${target}`;
        if (!ambiguousSeen.has(key)) {
          ambiguousSeen.add(key);
          ambiguousWikilinkWarnings.push(`${file} -> [[${target}]] resolves to multiple targets: ${resolution.candidates.join(", ")}`);
        }
      }

      if (resolution.candidates.length === 0) {
        broken.push(`${file} -> [[${target}]]`);
      } else if (resolution.file) {
        incoming.set(resolution.file, (incoming.get(resolution.file) || 0) + 1);
      }
    }

    for (const target of markdownLinkTargets(text)) {
      const resolution = resolveLink(file, target, targets, basenameTargets);
      if (!resolution.file) continue;
      outgoing.set(file, (outgoing.get(file) || 0) + 1);
      incoming.set(resolution.file, (incoming.get(resolution.file) || 0) + 1);
    }
  }

  const trueOrphans = markdownFiles.filter((file) => (incoming.get(file) || 0) === 0 && (outgoing.get(file) || 0) === 0);

  const unlinkedBases = [];
  for (const file of baseFiles.filter(basesScopeFile)) {
    const indexFile = path.posix.join(path.posix.dirname(file), "00 Bases Index.md");
    if (!fs.existsSync(indexFile)) {
      unlinkedBases.push(`${file}: missing sibling ${indexFile}`);
    } else if (!fileLinksTo(indexFile, file)) {
      unlinkedBases.push(`${file}: not linked from ${indexFile} by relative Markdown link or wikilink`);
    }
  }

  const localBaseScopeWarnings = [];
  for (const file of baseFiles.filter((candidate) => basesScopeFile(candidate) && !rootBaseFile(candidate))) {
    const scopePath = path.posix.dirname(path.posix.dirname(file));
    if (!containsScopeFilter(baseText.get(file) || "", scopePath)) {
      localBaseScopeWarnings.push(`${file} must include file.inFolder("${scopePath}")`);
    }
  }

  const localAgentsInheritanceWarnings = [];
  for (const file of markdownFiles.filter((candidate) => path.posix.basename(candidate) === "AGENTS.md" && path.posix.dirname(candidate) !== ".")) {
    const text = readText(file);
    if (!mentionsParentInheritance(text)) {
      localAgentsInheritanceWarnings.push(`${file} should mention parent/root inheritance`);
    }
    for (const fingerprint of GLOBAL_POLICY_FINGERPRINTS) {
      if (text.includes(fingerprint)) {
        localAgentsInheritanceWarnings.push(`${file} repeats global policy fingerprint: ${fingerprint}`);
      }
    }
  }

  const scopeNavigationWarnings = [];
  const hubsByDir = new Map();
  for (const hub of markdownFiles.filter(hubFile).sort()) {
    const dir = path.posix.dirname(hub);
    if (!hubsByDir.has(dir)) hubsByDir.set(dir, hub);
  }

  for (const [dir, childHub] of hubsByDir.entries()) {
    if (dir === ".") continue;
    if (!scopeHub(childHub, markdownFrontmatter)) continue;
    const parentHub = nearestParentHub(dir, hubsByDir);
    if (!parentHub) continue;

    if (!fileLinksTo(parentHub, childHub)) {
      scopeNavigationWarnings.push(`${parentHub} does not link child hub ${childHub}`);
    }
    if (!fileLinksTo(childHub, parentHub)) {
      scopeNavigationWarnings.push(`${childHub} does not link parent hub ${parentHub}`);
    }
  }

  const routingMatrixWarnings = [];
  const routingMatrix = markdownFiles.find((file) => path.posix.basename(file) === "Task Routing Matrix.md" && path.posix.dirname(file) === "Agent");
  if (routingMatrix) {
    for (const [dir, childHub] of hubsByDir.entries()) {
      if (dir === ".") continue;
      if (!scopeHub(childHub, markdownFrontmatter)) continue;
      if (!fileLinksTo(routingMatrix, childHub)) {
        routingMatrixWarnings.push(`Agent/Task Routing Matrix.md does not link scope hub ${childHub}`);
      }
    }
  }

  const baseScopeFormulaWarnings = [];
  const rootBases = baseFiles.filter(rootBaseFile);
  if (rootBases.length > 0) {
    for (const [dir, childHub] of hubsByDir.entries()) {
      if (dir === ".") continue;
      if (!scopeHub(childHub, markdownFrontmatter)) continue;
      for (const rootBase of rootBases) {
        const text = baseText.get(rootBase) || "";
        if (!text.includes("file.inFolder")) continue;
        if (!containsScopeFilter(text, dir)) {
          baseScopeFormulaWarnings.push(`${rootBase}: scope formula missing branch for ${dir}`);
        }
      }
    }
  }

  const bloatWarnings = [];
  if (fs.existsSync("00 Index.md")) {
    const lines = lineCount("00 Index.md");
    const links = wikilinkCount("00 Index.md");
    if (lines > 250 || links > 150) {
      bloatWarnings.push(`00 Index.md may be too large for a strategic map: ${lines} lines, ${links} wikilinks`);
    }
  }

  const agentNav = "Agent/00 Agent Navigation.md";
  if (fs.existsSync(agentNav)) {
    const lines = lineCount(agentNav);
    const links = wikilinkCount(agentNav);
    if (lines > 200 || links > 100) {
      bloatWarnings.push(`${agentNav} may be too detailed for a routing map: ${lines} lines, ${links} wikilinks`);
    }
  }

  const directories = Array.from(new Set(markdownFiles.map((file) => path.posix.dirname(file)))).filter((dir) => dir !== ".");
  for (const dir of directories) {
    const directNotes = markdownFiles.filter((file) => path.posix.dirname(file) === dir);
    const hasHub = directNotes.some((file) => /^00 .*Index\.md$/u.test(path.posix.basename(file)) || path.posix.basename(file) === "00 Index.md");
    if (directNotes.length > 20 && !hasHub) {
      bloatWarnings.push(`${dir}/ has ${directNotes.length} Markdown notes and no 00 ... Index.md hub`);
    }

    const localAgents = path.posix.join(dir, "AGENTS.md");
    if (fs.existsSync(localAgents)) continue;

    const nonIndexNotes = directNotes.filter((file) => !/^00 .*Index\.md$/u.test(path.posix.basename(file)));
    if (nonIndexNotes.length > 30 && !["Raw", "Raw/Sources", "Templates", "Archive", "Outputs", "Bases"].includes(dir)) {
      bloatWarnings.push(`${dir}/ has ${nonIndexNotes.length} non-index notes and may need a local AGENTS.md if workflow rules are specialized`);
    }
  }

  for (const hub of markdownFiles.filter((file) => /^00 .*Index\.md$/u.test(path.posix.basename(file)) || file === "00 Index.md")) {
    const lines = lineCount(hub);
    const links = wikilinkCount(hub);
    if (lines > 300 || links > 175) {
      bloatWarnings.push(`${hub} may need sub-hubs or a Base: ${lines} lines, ${links} wikilinks`);
    }
  }

  const researchBoundaryWarnings = [];
  const researchProvenanceWarnings = [];
  const provenanceCycleWarnings = [];
  const uncompiledRawSourceWarnings = [];
  const researchHubWarnings = [];
  const researchTypes = new Set(["raw-source", "research", "research-inquiry", "research-synthesis"]);
  const evidenceRoles = new Set(["external-evidence", "first-party-evidence", "context", "hypothesis", "generated-analysis", "derivative-copy"]);
  const compilationStates = new Set(["pending", "compiled", "source-only", "needs-review"]);
  const descriptors = markdownFiles.filter((file) => {
    const data = markdownFrontmatter.get(file) || {};
    return data.type === "research-boundary" && String(data.research_schema) === "1";
  });
  const descriptorSet = new Set(descriptors);

  function resolvedScalarLink(source, value) {
    const link = scalarLinkTarget(value);
    return link ? resolveLink(source, link, targets, basenameTargets).file : null;
  }

  const artifactsByDescriptor = new Map(descriptors.map((descriptor) => [descriptor, []]));
  for (const file of markdownFiles) {
    const data = markdownFrontmatter.get(file) || {};
    if (!researchTypes.has(data.type)) continue;
    const descriptor = resolvedScalarLink(file, data.research_boundary);
    if (descriptorSet.has(descriptor)) artifactsByDescriptor.get(descriptor).push(file);
  }

  const graph = new Map();
  for (const descriptor of descriptors) {
    const data = markdownFrontmatter.get(descriptor) || {};
    const nested = nestedFrontmatter.get(descriptor) || new Set();
    for (const field of nested) {
      researchBoundaryWarnings.push(`${descriptor}: nested schema value is not supported for ${field}`);
    }
    for (const field of ["boundary_id", "scope_path", "raw_hub", "compiled_hub", "inquiry_hub", "synthesis_hub", "view_mode", "rollup_boundaries"]) {
      if (!(field in data) && !nested.has(field)) researchBoundaryWarnings.push(`${descriptor}: missing required ${field}`);
    }
    if (data.view_mode && !["exact", "rollup"].includes(data.view_mode)) {
      researchBoundaryWarnings.push(`${descriptor}: view_mode must be exact or rollup`);
    }
    if (data.rollup_boundaries !== undefined && !Array.isArray(data.rollup_boundaries)) {
      researchBoundaryWarnings.push(`${descriptor}: rollup_boundaries must be a flat scalar list`);
    }
    if (typeof data.scope_path === "string") {
      const normalizedScope = path.posix.normalize(data.scope_path);
      if (path.posix.isAbsolute(data.scope_path) || normalizedScope === ".." || normalizedScope.startsWith("../")) {
        researchBoundaryWarnings.push(`${descriptor}: scope_path must be vault-relative and contained`);
      } else if (!fs.existsSync(normalizedScope) || !fs.statSync(normalizedScope).isDirectory()) {
        researchBoundaryWarnings.push(`${descriptor}: scope_path does not name an existing directory: ${data.scope_path}`);
      }
    }

    const memberDescriptors = new Set([descriptor]);
    if (data.view_mode === "rollup") {
      for (const value of valuesAsList(data.rollup_boundaries)) {
        const child = resolvedScalarLink(descriptor, value);
        const childData = markdownFrontmatter.get(child) || {};
        const parentScope = String(data.scope_path || "");
        const childScope = String(childData.scope_path || "");
        if (!descriptorSet.has(child) || !childScope.startsWith(`${parentScope}/`)) {
          researchBoundaryWarnings.push(`${descriptor}: rollup boundary ${value} is not a declared descendant descriptor`);
        } else {
          memberDescriptors.add(child);
        }
      }
    }

    const members = Array.from(memberDescriptors).flatMap((member) => artifactsByDescriptor.get(member) || []);
    const hubFields = [
      ["raw_hub", new Set(["raw-source"])],
      ["compiled_hub", new Set(["research"])],
      ["inquiry_hub", new Set(["research-inquiry"])],
      ["synthesis_hub", new Set(["research-synthesis"])],
    ];
    for (const [field, typesForHub] of hubFields) {
      const targetText = scalarLinkTarget(data[field]);
      const hub = resolvedScalarLink(descriptor, data[field]);
      if (!targetText || !targetText.includes("/") || !hub) {
        researchHubWarnings.push(`${descriptor}: ${field} must be a path-qualified link to an existing hub`);
        continue;
      }
      if (!fileLinksToQualified(hub, descriptor)) {
        researchHubWarnings.push(`${hub} does not link its boundary descriptor ${descriptor}`);
      }
      const missing = members.filter((member) => typesForHub.has((markdownFrontmatter.get(member) || {}).type))
        .filter((member) => !fileLinksToQualified(hub, member));
      if (missing.length > 0) {
        researchHubWarnings.push(`${hub} does not link member(s) declared by ${descriptor}: ${missing.sort().join(", ")}`);
      }
      const expected = new Set(members.filter((member) => typesForHub.has((markdownFrontmatter.get(member) || {}).type)));
      const linkedResearch = [...wikilinkTargets(textWithoutCode(readText(hub))), ...markdownLinkTargets(textWithoutCode(readText(hub)))]
        .map((link) => resolveLink(hub, link, targets, basenameTargets).file)
        .filter((linked) => linked && researchTypes.has((markdownFrontmatter.get(linked) || {}).type));
      const extra = Array.from(new Set(linkedResearch.filter((linked) => typesForHub.has((markdownFrontmatter.get(linked) || {}).type) && !expected.has(linked))));
      if (extra.length > 0) {
        researchHubWarnings.push(`${hub} links member(s) outside the exact or declared rollup boundary: ${extra.sort().join(", ")}`);
      }
    }

    for (const file of artifactsByDescriptor.get(descriptor) || []) {
      const artifact = markdownFrontmatter.get(file) || {};
      for (const field of nestedFrontmatter.get(file) || []) {
        researchProvenanceWarnings.push(`${file}: nested schema value is not supported for ${field}`);
      }
      const upstream = [];
      if (artifact.derived_from !== undefined && !Array.isArray(artifact.derived_from)) {
        researchProvenanceWarnings.push(`${file}: derived_from must be a flat scalar list`);
      }
      for (const value of valuesAsList(artifact.derived_from)) {
        const target = resolvedScalarLink(file, value);
        if (!target) {
          researchProvenanceWarnings.push(`${file}: derived_from link does not resolve: ${value}`);
        } else {
          upstream.push(target);
        }
      }
      graph.set(file, upstream);
      if (artifact.type === "raw-source" && artifact.evidence_role && !evidenceRoles.has(artifact.evidence_role)) {
        researchProvenanceWarnings.push(`${file}: unsupported evidence_role: ${artifact.evidence_role}`);
      }
      if (artifact.type === "raw-source" && artifact.compilation_status && !compilationStates.has(artifact.compilation_status)) {
        researchProvenanceWarnings.push(`${file}: unsupported compilation_status: ${artifact.compilation_status}`);
      }
      if (["generated-analysis", "derivative-copy"].includes(artifact.evidence_role) && upstream.length === 0) {
        researchProvenanceWarnings.push(`${file}: ${artifact.evidence_role} requires upstream derived_from links`);
      }
    }
  }

  function rootFamilies(file, visiting = new Set()) {
    if (visiting.has(file)) return new Set();
    const upstream = graph.get(file) || [];
    if (upstream.length === 0) return new Set([file]);
    const roots = new Set();
    const next = new Set(visiting).add(file);
    for (const parent of upstream) {
      for (const root of rootFamilies(parent, next)) roots.add(root);
    }
    return roots;
  }

  function reaches(start, current, visiting = new Set()) {
    if (visiting.has(current)) return false;
    const next = new Set(visiting).add(current);
    for (const parent of graph.get(current) || []) {
      if (parent === start || reaches(start, parent, next)) return true;
    }
    return false;
  }

  for (const [file, upstream] of graph.entries()) {
    const artifact = markdownFrontmatter.get(file) || {};
    if (["generated-analysis", "derivative-copy"].includes(artifact.evidence_role) && upstream.length > 0) {
      const families = rootFamilies(file);
      if (families.size !== 1) {
        researchProvenanceWarnings.push(`${file}: ${artifact.evidence_role} must resolve to one root evidence family (found ${families.size})`);
      }
    }
    if (reaches(file, file)) provenanceCycleWarnings.push(`${file}: provenance cycle includes this artifact`);
  }

  const downstreamTargets = new Set(Array.from(graph.values()).flat());
  for (const descriptor of descriptors) {
    for (const file of artifactsByDescriptor.get(descriptor) || []) {
      const artifact = markdownFrontmatter.get(file) || {};
      if (artifact.type !== "raw-source") continue;
      if (["pending", "needs-review"].includes(artifact.compilation_status)) {
        uncompiledRawSourceWarnings.push(`${file}: compilation_status: ${artifact.compilation_status}`);
      } else if (artifact.compilation_status === "compiled" && !downstreamTargets.has(file)) {
        uncompiledRawSourceWarnings.push(`${file}: compilation_status: compiled but no downstream derived_from link exists`);
      }
    }
  }

  return {
    errors,
    broken,
    trueOrphans,
    unlinkedBases,
    bloatWarnings,
    localBaseScopeWarnings,
    localAgentsInheritanceWarnings,
    ambiguousWikilinkWarnings,
    scopeNavigationWarnings,
    routingMatrixWarnings,
    baseScopeFormulaWarnings,
    researchBoundaryWarnings,
    researchProvenanceWarnings,
    provenanceCycleWarnings,
    uncompiledRawSourceWarnings,
    researchHubWarnings,
  };
}

function printResults(result) {
  if (result.errors.length === 0) {
    console.log("yaml-ok");
  } else {
    console.log(`yaml-errors: ${result.errors.length}`);
    result.errors.slice().sort().forEach((line) => console.log(line));
  }

  const counters = [
    ["broken-wikilinks", result.broken],
    ["true-orphans-md", result.trueOrphans],
    ["unlinked-base-files", result.unlinkedBases],
    ["bloat-warnings", result.bloatWarnings],
    ["local-base-scope-warnings", result.localBaseScopeWarnings],
    ["local-agents-inheritance-warnings", result.localAgentsInheritanceWarnings],
    ["ambiguous-wikilink-warnings", result.ambiguousWikilinkWarnings],
    ["scope-navigation-warnings", result.scopeNavigationWarnings],
    ["routing-matrix-warnings", result.routingMatrixWarnings],
    ["base-scope-formula-warnings", result.baseScopeFormulaWarnings],
    ["research-boundary-warnings", result.researchBoundaryWarnings],
    ["research-provenance-warnings", result.researchProvenanceWarnings],
    ["provenance-cycle-warnings", result.provenanceCycleWarnings],
    ["uncompiled-raw-source-warnings", result.uncompiledRawSourceWarnings],
    ["research-hub-warnings", result.researchHubWarnings],
  ];

  for (const [name, values] of counters) {
    console.log(`${name}: ${values.length}`);
    values.slice().sort().forEach((line) => console.log(line));
  }
}

function parseArguments(argv) {
  let vault = process.cwd();
  let scope = null;
  let profile = null;
  let index = 0;
  if (argv[0] && !argv[0].startsWith("--")) {
    vault = argv[0];
    index = 1;
  }
  while (index < argv.length) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!["--scope", "--profile"].includes(flag) || value === undefined || value.startsWith("--")) {
      throw new Error(`invalid arguments near ${flag}`);
    }
    if (flag === "--scope") scope = value;
    if (flag === "--profile") profile = value;
    index += 2;
  }
  if (profile && profile !== "research") throw new Error(`unsupported profile: ${profile}`);
  if (profile && !scope) throw new Error("--profile requires --scope");
  if (scope) {
    if (path.isAbsolute(scope) || /^[A-Za-z]:[\\/]/u.test(scope)) throw new Error("--scope must be vault-relative");
    if (scope.split(/[\\/]/u).includes("..")) throw new Error("--scope must not contain traversal");
    const normalized = toPosix(path.posix.normalize(scope));
    if (normalized === ".." || normalized.startsWith("../") || normalized === "." || normalized === "") {
      throw new Error("--scope must name a contained vault directory");
    }
    const vaultRoot = path.resolve(vault);
    const absoluteScope = path.resolve(vaultRoot, normalized);
    const relative = toPosix(path.relative(vaultRoot, absoluteScope));
    if (relative === ".." || relative.startsWith("../")) throw new Error("--scope escapes the vault");
    if (!fs.existsSync(absoluteScope)) throw new Error(`--scope does not exist: ${normalized}`);
    if (!fs.statSync(absoluteScope).isDirectory()) throw new Error(`--scope is not a directory: ${normalized}`);
    const realVault = fs.realpathSync(vaultRoot);
    const realScope = fs.realpathSync(absoluteScope);
    const realRelative = toPosix(path.relative(realVault, realScope));
    if (realRelative === ".." || realRelative.startsWith("../")) throw new Error("--scope resolves outside the vault");
    scope = normalized;
  }
  return { vault, scope, profile };
}

function findingTouchesScope(finding, scope) {
  const value = String(finding);
  return value === scope || value.startsWith(`${scope}/`) || value.includes(` ${scope}/`) || value.includes(`: ${scope}/`);
}

function findingOriginInScope(finding, scope) {
  const value = String(finding);
  return value === scope || value.startsWith(`${scope}/`);
}

function filterResults(result, options) {
  if (!options.scope) return result;
  const filtered = {};
  const obligationKeys = new Set([
    "researchBoundaryWarnings",
    "researchProvenanceWarnings",
    "provenanceCycleWarnings",
    "uncompiledRawSourceWarnings",
    "researchHubWarnings",
  ]);
  for (const [key, values] of Object.entries(result)) {
    const predicate = obligationKeys.has(key) ? findingTouchesScope : findingOriginInScope;
    filtered[key] = values.filter((value) => predicate(value, options.scope));
  }
  if (options.profile === "research") {
    const kept = new Set([
      "errors",
      "localBaseScopeWarnings",
      "ambiguousWikilinkWarnings",
      "researchBoundaryWarnings",
      "researchProvenanceWarnings",
      "provenanceCycleWarnings",
      "uncompiledRawSourceWarnings",
      "researchHubWarnings",
    ]);
    for (const key of Object.keys(filtered)) {
      if (!kept.has(key)) filtered[key] = [];
    }
  }
  return filtered;
}

try {
  const options = parseArguments(process.argv.slice(2));
  const result = filterResults(validate(options.vault, options), options);
  printResults(result);
  const ok = result.errors.length === 0 &&
    result.broken.length === 0 &&
    result.trueOrphans.length === 0 &&
    result.unlinkedBases.length === 0;
  process.exit(ok ? 0 : 1);
} catch (error) {
  console.error(`validator-error: ${error.message}`);
  process.exit(1);
}
