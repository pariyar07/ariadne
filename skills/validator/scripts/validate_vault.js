#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  buildTopology,
  filterFindingsByScope,
  findingCounter,
  inventoryVault,
  normalizeScopePath,
  scopeFindings,
} = require("./scope-topology");

const GLOBAL_POLICY_FINGERPRINTS = [
  "Keep notes as plain Markdown",
  "Use YAML frontmatter",
  "Do not read the whole vault",
];

let validationSnapshot = null;
let fallbackReadCount = 0;
let liveObservationCount = 0;
const liveObservationMethods = ["existsSync", "statSync", "lstatSync", "realpathSync", "readdirSync", "readFileSync"];
const originalFsMethods = new Map(liveObservationMethods.map((name) => [name, fs[name].bind(fs)]));

function activateLiveObservationGuard() {
  if (process.env.ARIADNE_TEST_INVENTORY_TRACE !== "1") return;
  for (const name of liveObservationMethods) {
    fs[name] = (...args) => {
      liveObservationCount += 1;
      return originalFsMethods.get(name)(...args);
    };
  }
}

function snapshotRelative(file) {
  if (!validationSnapshot) return null;
  const absolute = path.isAbsolute(file) ? file : path.resolve(file);
  const relative = toPosix(path.relative(validationSnapshot.root, absolute));
  return relative === "" ? "." : relative;
}

function vaultExists(file) {
  if (!validationSnapshot) return originalFsMethods.get("existsSync")(file);
  const relative = snapshotRelative(file);
  return validationSnapshot.files.has(relative) || validationSnapshot.directories.has(relative);
}

function vaultIsDirectory(file) {
  if (!validationSnapshot) return originalFsMethods.get("statSync")(file).isDirectory();
  return validationSnapshot.directories.has(snapshotRelative(file));
}

function vaultRealpath(file) {
  if (!validationSnapshot) return originalFsMethods.get("realpathSync")(file);
  const relative = snapshotRelative(file);
  const record = validationSnapshot.directories.get(relative) || validationSnapshot.files.get(relative);
  if (!record || !record.canonicalPath) throw new Error(`snapshot path has no canonical target: ${relative}`);
  return record.canonicalPath;
}

function vaultDirectoryEntries(directory) {
  if (!validationSnapshot) return originalFsMethods.get("readdirSync")(directory);
  const relative = snapshotRelative(directory);
  const prefix = relative === "." ? "" : `${relative}/`;
  const names = new Set();
  for (const key of [...validationSnapshot.files.keys(), ...validationSnapshot.directories.keys()]) {
    if (key === relative || !key.startsWith(prefix)) continue;
    const remainder = key.slice(prefix.length);
    if (remainder && !remainder.includes("/")) names.add(remainder);
  }
  return [...names].sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
}

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
  const normalized = toPosix(file).replace(/^\.\//u, "");
  if (validationSnapshot && validationSnapshot.files.has(normalized)) {
    const record = validationSnapshot.files.get(normalized);
    return record.rawBytes ? record.rawBytes.toString("utf8") : "";
  }
  fallbackReadCount += 1;
  return fs.readFileSync(file, "utf8");
}

function fileLinksTo(sourceFile, targetFile) {
  if (!vaultExists(sourceFile)) return false;
  const text = textWithoutCode(readText(sourceFile));
  const links = [...wikilinkTargets(text), ...markdownLinkTargets(text)];
  const aliases = new Set(linkAliasesFor(sourceFile, targetFile));
  return links.some((link) => aliases.has(link));
}

function fileLinksToQualified(sourceFile, targetFile) {
  if (!vaultExists(sourceFile)) return false;
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

function splitInlineList(text) {
  const entries = [];
  let current = "";
  let quote = null;
  let escaped = false;
  let squareDepth = 0;
  let braceDepth = 0;
  for (const char of text) {
    if (quote) {
      current += char;
      if (quote === "\"" && char === "\\" && !escaped) {
        escaped = true;
      } else {
        if (char === quote && !escaped) quote = null;
        escaped = false;
      }
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
      current += char;
    } else if (char === "[") {
      squareDepth += 1;
      current += char;
    } else if (char === "]") {
      squareDepth -= 1;
      current += char;
    } else if (char === "{") {
      braceDepth += 1;
      current += char;
    } else if (char === "}") {
      braceDepth -= 1;
      current += char;
    } else if (char === "," && squareDepth === 0 && braceDepth === 0) {
      entries.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  entries.push(current.trim());
  return entries;
}

function nestedCollectionToken(value) {
  const token = String(value).trim();
  if (token.startsWith("\"") || token.startsWith("'")) return false;
  return token.startsWith("{") || token.startsWith("[") && !token.startsWith("[[");
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
      const rawEntries = inner === "" ? [] : splitInlineList(inner);
      if (rawEntries.some(nestedCollectionToken)) {
        nestedFields.add(match[1]);
      } else {
        values[match[1]] = rawEntries.map(parseScalar);
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
      const rawEntries = children.map((child) => child.replace(/^\s{2}-\s+/u, ""));
      if (rawEntries.some(nestedCollectionToken)) nestedFields.add(match[1]);
      else values[match[1]] = rawEntries.map(parseScalar);
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
  return vaultExists(path.join(dir, "AGENTS.md")) ||
    vaultExists(path.join(dir, "Bases")) &&
      vaultDirectoryEntries(path.join(dir, "Bases")).some((file) => file.endsWith(".base"));
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

function navigationFile(file) {
  return hubFile(file) || path.posix.basename(file) === "AGENTS.md" ||
    file.startsWith("Agent/") || file.includes("/Agent/");
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
  let ancestor = path.posix.dirname(sourceFile);
  while (true) {
    const matches = candidates.filter((candidate) => path.posix.dirname(candidate) === ancestor);
    if (matches.length === 1) return { file: matches[0], candidates };
    if (matches.length > 1 || ancestor === ".") break;
    ancestor = path.posix.dirname(ancestor);
  }
  return { file: null, candidates };
}

function scalarLinkTarget(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]*)?\]\]$/u);
  return match ? normalizeLinkTarget(match[1]) : null;
}

function valuesAsList(value) {
  return Array.isArray(value) ? value : [];
}

function findingText(finding) {
  if (typeof finding === "string") return finding;
  return finding.finding_id ? `[${finding.code} ${finding.finding_id}] ${finding.message}` : finding.message;
}

function structuredFinding(message, origin, obligations = []) {
  return { message, origin, obligations };
}

function validate(vaultPath, options = {}, inventory = null) {
  process.chdir(vaultPath);
  validationSnapshot = inventory ? {
    root: inventory.root,
    files: new Map(inventory.files.map((file) => [file.relativePath, file])),
    directories: new Map(inventory.directories.map((directory) => [directory.relativePath, directory])),
  } : null;
  fallbackReadCount = 0;

  const errors = [];
  const markdownFrontmatter = new Map();
  const nestedFrontmatter = new Map();
  const files = inventory ? inventory.files.map((file) => file.relativePath) : walk(".");
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
    if (!vaultExists(indexFile)) {
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

    if (!fileLinksToQualified(parentHub, childHub)) {
      scopeNavigationWarnings.push(`${parentHub} does not link child hub ${childHub}`);
    }
    if (!fileLinksToQualified(childHub, parentHub)) {
      scopeNavigationWarnings.push(`${childHub} does not link parent hub ${parentHub}`);
    }
  }

  const routingMatrixWarnings = [];
  const routingMatrices = new Map();
  for (const file of markdownFiles.filter((candidate) => path.posix.basename(candidate) === "Task Routing Matrix.md" && path.posix.basename(path.posix.dirname(candidate)) === "Agent")) {
    routingMatrices.set(path.posix.dirname(path.posix.dirname(file)), file);
  }
  for (const [dir, childHub] of hubsByDir.entries()) {
    if (dir === "." || !scopeHub(childHub, markdownFrontmatter)) continue;
    let inheritedScope = dir;
    let routingMatrix = null;
    while (true) {
      if (routingMatrices.has(inheritedScope)) {
        routingMatrix = routingMatrices.get(inheritedScope);
        break;
      }
      if (inheritedScope === ".") break;
      inheritedScope = path.posix.dirname(inheritedScope);
    }
    if (routingMatrix && !fileLinksToQualified(routingMatrix, childHub)) {
      routingMatrixWarnings.push(structuredFinding(`${routingMatrix} does not link scope hub ${childHub}`, routingMatrix, [childHub]));
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
  if (vaultExists("00 Index.md")) {
    const lines = lineCount("00 Index.md");
    const links = wikilinkCount("00 Index.md");
    if (lines > 250 || links > 150) {
      bloatWarnings.push(`00 Index.md may be too large for a strategic map: ${lines} lines, ${links} wikilinks`);
    }
  }

  const agentNav = "Agent/00 Agent Navigation.md";
  if (vaultExists(agentNav)) {
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
    if (vaultExists(localAgents)) continue;

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
    return data.type === "research-boundary" && typeof data.research_schema === "string" && data.research_schema === "1";
  });
  const descriptorSet = new Set(descriptors);
  const vaultRootReal = vaultRealpath(".");

  function canonicalDescriptorScope(value) {
    if (typeof value !== "string" || value === "" || path.posix.isAbsolute(value) || /^[A-Za-z]:[\\/]/u.test(value)) return null;
    const normalized = path.posix.normalize(value);
    const absolute = path.resolve(vaultRootReal, normalized);
    if (!vaultExists(absolute) || !vaultIsDirectory(absolute)) return null;
    const realScope = vaultRealpath(absolute);
    const relative = toPosix(path.relative(vaultRootReal, realScope));
    if (relative === ".." || relative.startsWith("../")) return null;
    return relative === "" ? "." : relative;
  }

  const canonicalScopeByDescriptor = new Map(descriptors.map((descriptor) => [
    descriptor,
    canonicalDescriptorScope((markdownFrontmatter.get(descriptor) || {}).scope_path),
  ]));
  for (const file of markdownFiles) {
    const data = markdownFrontmatter.get(file) || {};
    if (data.type === "research-boundary" && Array.isArray(data.research_schema)) {
      researchBoundaryWarnings.push(`${file}: research_schema must be a top-level scalar`);
    }
    if (Array.isArray(data.type) && data.type.includes("research-boundary") && data.research_schema === "1") {
      researchBoundaryWarnings.push(`${file}: type must be a top-level scalar`);
    }
  }

  for (const [field, label] of [["boundary_id", "boundary_id"], ["scope_path", "canonical scope_path"]]) {
    const groups = new Map();
    for (const descriptor of descriptors) {
      const value = field === "scope_path" ? canonicalScopeByDescriptor.get(descriptor) : (markdownFrontmatter.get(descriptor) || {})[field];
      if (typeof value !== "string" || value === "") continue;
      if (!groups.has(value)) groups.set(value, []);
      groups.get(value).push(descriptor);
    }
    for (const [value, filesForValue] of groups.entries()) {
      if (filesForValue.length < 2) continue;
      const sorted = filesForValue.slice().sort();
      for (const descriptor of sorted) {
        const others = sorted.filter((file) => file !== descriptor);
        const scopePath = canonicalScopeByDescriptor.get(descriptor) || "";
        researchBoundaryWarnings.push(structuredFinding(
          `${descriptor}: duplicate ${label} ${value} also declared by ${others.join(", ")}`,
          descriptor,
          field === "scope_path" && scopePath ? [scopePath] : [],
        ));
      }
    }
  }

  function resolvedScalarLink(source, value) {
    const link = scalarLinkTarget(value);
    return link ? resolveLink(source, link, targets, basenameTargets).file : null;
  }

  const descriptorScopes = descriptors.map((descriptor) => ({
    descriptor,
    scope: canonicalScopeByDescriptor.get(descriptor),
  })).filter((entry) => entry.scope)
    .sort((first, second) => second.scope.length - first.scope.length || first.descriptor.localeCompare(second.descriptor));

  function supportedScopeDescriptor(file) {
    const match = descriptorScopes.find((entry) => file === entry.scope || file.startsWith(`${entry.scope}/`));
    return match ? match.descriptor : null;
  }

  function validateLinkList(file, data, field, required = true) {
    const nested = nestedFrontmatter.get(file) || new Set();
    if (!(field in data)) {
      if (required && !nested.has(field)) researchProvenanceWarnings.push(`${file}: missing required ${field}`);
      return;
    }
    if (!Array.isArray(data[field]) || data[field].some((value) => !scalarLinkTarget(value))) {
      researchProvenanceWarnings.push(`${file}: ${field} must be a flat scalar link list`);
    }
  }

  function validateRequiredScalar(file, data, field) {
    const nested = nestedFrontmatter.get(file) || new Set();
    if (!(field in data)) {
      if (!nested.has(field)) researchProvenanceWarnings.push(`${file}: missing required ${field}`);
    } else if (typeof data[field] !== "string" || data[field] === "") {
      researchProvenanceWarnings.push(`${file}: ${field} must be a top-level scalar`);
    }
  }

  function validateArtifactContract(file, data) {
    const nested = nestedFrontmatter.get(file) || new Set();
    for (const field of nested) researchProvenanceWarnings.push(`${file}: nested schema value is not supported for ${field}`);
    if (data.type === "raw-source") {
      for (const field of ["source_type", "evidence_role", "origin", "locator", "captured", "compilation_status"]) validateRequiredScalar(file, data, field);
      validateLinkList(file, data, "derived_from");
      if (data.evidence_role && !evidenceRoles.has(data.evidence_role)) researchProvenanceWarnings.push(`${file}: unsupported evidence_role: ${data.evidence_role}`);
      if (data.compilation_status && !compilationStates.has(data.compilation_status)) researchProvenanceWarnings.push(`${file}: unsupported compilation_status: ${data.compilation_status}`);
    } else if (data.type === "research") {
      validateLinkList(file, data, "derived_from");
      validateLinkList(file, data, "inquiries");
    } else if (data.type === "research-synthesis") {
      validateLinkList(file, data, "derived_from");
      validateLinkList(file, data, "inquiries");
    } else if (data.type === "research-inquiry") {
      validateRequiredScalar(file, data, "inquiry_id");
      validateRequiredScalar(file, data, "status");
      if (typeof data.status === "string" && data.status && !new Set(["active", "paused", "answered", "superseded", "closed"]).has(data.status)) {
        researchProvenanceWarnings.push(`${file}: unsupported inquiry status: ${data.status}`);
      }
      validateLinkList(file, data, "derived_from");
      const text = readText(file);
      for (const section of ["Question Or Purpose", "Inclusion Criteria", "Exclusion Criteria", "Supporting Evidence", "Contradicting Evidence", "Current Synthesis", "Open Questions", "Disposition History"]) {
        const escaped = section.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
        if (!new RegExp(`^## ${escaped}\\s*$`, "mu").test(text)) researchProvenanceWarnings.push(`${file}: missing required section ${section}`);
      }
      if (!/^\| Date \| Sources \| Disposition \| Note \|\s*$/mu.test(text)) {
        researchProvenanceWarnings.push(`${file}: missing required disposition history table`);
      }
    }
  }

  const artifactsByDescriptor = new Map(descriptors.map((descriptor) => [descriptor, []]));
  const descriptorByArtifact = new Map();
  for (const file of markdownFiles) {
    const data = markdownFrontmatter.get(file) || {};
    if (!researchTypes.has(data.type)) continue;
    const link = scalarLinkTarget(data.research_boundary);
    const descriptor = link && link.includes("/") ? resolvedScalarLink(file, data.research_boundary) : null;
    const scopeDescriptor = supportedScopeDescriptor(file);
    if (descriptorSet.has(descriptor)) {
      artifactsByDescriptor.get(descriptor).push(file);
      descriptorByArtifact.set(file, descriptor);
      validateArtifactContract(file, data);
    } else if (scopeDescriptor) {
      researchProvenanceWarnings.push(`${file}: research_boundary must be a path-qualified scalar link resolving to a supported descriptor`);
      validateArtifactContract(file, data);
    }
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
    for (const field of ["type", "research_schema", "boundary_id", "scope_path", "raw_hub", "compiled_hub", "inquiry_hub", "synthesis_hub", "thread_hub", "view_mode"]) {
      if (field in data && typeof data[field] !== "string") researchBoundaryWarnings.push(`${descriptor}: ${field} must be a top-level scalar`);
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
      } else if (!canonicalScopeByDescriptor.get(descriptor)) {
        researchBoundaryWarnings.push(`${descriptor}: scope_path does not name an existing directory: ${data.scope_path}`);
      }
    }

    const memberDescriptors = new Set([descriptor]);
    if (data.view_mode === "rollup") {
      for (const value of valuesAsList(data.rollup_boundaries)) {
        const child = resolvedScalarLink(descriptor, value);
        const parentScope = canonicalScopeByDescriptor.get(descriptor) || "";
        const childScope = canonicalScopeByDescriptor.get(child) || "";
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
        researchHubWarnings.push(structuredFinding(`${descriptor}: ${field} must be a path-qualified link to an existing hub`, descriptor, [canonicalScopeByDescriptor.get(descriptor) || ""]));
        continue;
      }
      if (!fileLinksToQualified(hub, descriptor)) {
        researchHubWarnings.push(structuredFinding(`${hub} does not link its boundary descriptor ${descriptor}`, hub, [canonicalScopeByDescriptor.get(descriptor) || "", descriptor]));
      }
      const missing = members.filter((member) => typesForHub.has((markdownFrontmatter.get(member) || {}).type))
        .filter((member) => !fileLinksToQualified(hub, member));
      if (missing.length > 0) {
        researchHubWarnings.push(structuredFinding(`${hub} does not link member(s) declared by ${descriptor}: ${missing.sort().join(", ")}`, hub, [canonicalScopeByDescriptor.get(descriptor) || "", descriptor, ...missing]));
      }
      const expected = new Set(members.filter((member) => typesForHub.has((markdownFrontmatter.get(member) || {}).type)));
      const linkedResearch = [...wikilinkTargets(textWithoutCode(readText(hub))), ...markdownLinkTargets(textWithoutCode(readText(hub)))]
        .map((link) => resolveLink(hub, link, targets, basenameTargets).file)
        .filter((linked) => linked && researchTypes.has((markdownFrontmatter.get(linked) || {}).type));
      const extra = Array.from(new Set(linkedResearch.filter((linked) => typesForHub.has((markdownFrontmatter.get(linked) || {}).type) && !expected.has(linked))));
      if (extra.length > 0) {
        researchHubWarnings.push(structuredFinding(`${hub} links member(s) outside the exact or declared rollup boundary: ${extra.sort().join(", ")}`, hub, [canonicalScopeByDescriptor.get(descriptor) || "", ...extra]));
      }
    }

    for (const file of artifactsByDescriptor.get(descriptor) || []) {
      const artifact = markdownFrontmatter.get(file) || {};
      const upstream = [];
      for (const value of valuesAsList(artifact.derived_from)) {
        const target = resolvedScalarLink(file, value);
        if (!target) {
          researchProvenanceWarnings.push(`${file}: derived_from link does not resolve: ${value}`);
        } else if (!descriptorByArtifact.has(target)) {
          researchProvenanceWarnings.push(`${file}: derived_from target is not a canonical research artifact: ${target}`);
        } else if (!memberDescriptors.has(descriptorByArtifact.get(target))) {
          researchProvenanceWarnings.push(`${file}: derived_from target belongs outside the allowed boundary set: ${target}`);
        } else {
          upstream.push(target);
        }
      }
      graph.set(file, upstream);
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

  function originForMessage(message) {
    const match = message.match(/^(.+?\.(?:md|base|canvas))(?::| does| links| must| should| repeats| ->)/u);
    return match ? match[1] : "";
  }

  function records(values, obligationsFor = () => []) {
    return values.map((value) => {
      if (typeof value !== "string") return value;
      const origin = originForMessage(value);
      return structuredFinding(value, origin, obligationsFor(value, origin));
    });
  }

  const descriptorScopesByFile = new Map(descriptors.map((descriptor) => [descriptor, canonicalScopeByDescriptor.get(descriptor) || ""]));
  const hubScopesByFile = new Map();
  for (const descriptor of descriptors) {
    const data = markdownFrontmatter.get(descriptor) || {};
    for (const field of ["raw_hub", "compiled_hub", "inquiry_hub", "synthesis_hub", "thread_hub"]) {
      const hub = resolvedScalarLink(descriptor, data[field]);
      if (hub) hubScopesByFile.set(hub, canonicalScopeByDescriptor.get(descriptor) || "");
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
    routingMatrixWarnings: records(routingMatrixWarnings, (message) => {
      const marker = " does not link scope hub ";
      return message.includes(marker) ? [message.split(marker)[1]] : [];
    }),
    baseScopeFormulaWarnings,
    researchBoundaryWarnings: records(researchBoundaryWarnings, (_message, origin) => descriptorScopesByFile.has(origin) ? [descriptorScopesByFile.get(origin)] : []),
    researchProvenanceWarnings: records(researchProvenanceWarnings),
    provenanceCycleWarnings: records(provenanceCycleWarnings),
    uncompiledRawSourceWarnings: records(uncompiledRawSourceWarnings),
    researchHubWarnings: records(researchHubWarnings, (_message, origin) => hubScopesByFile.has(origin) ? [hubScopesByFile.get(origin)] : descriptorScopesByFile.has(origin) ? [descriptorScopesByFile.get(origin)] : []),
  };
}

function printResults(result) {
  if (result.errors.length === 0) {
    console.log("yaml-ok");
  } else {
    console.log(`yaml-errors: ${result.errors.length}`);
    result.errors.slice().map(findingText).sort().forEach((line) => console.log(line));
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

  if (result.scopeAdoptionWarnings) counters.push(["scope-adoption-warnings", result.scopeAdoptionWarnings]);
  if (result.scopeContractWarnings) counters.push(["scope-contract-warnings", result.scopeContractWarnings]);
  if (result.scopeMapWarnings) counters.push(["scope-map-warnings", result.scopeMapWarnings]);

  for (const [name, values] of counters) {
    console.log(`${name}: ${values.length}`);
    values.slice().map(findingText).sort().forEach((line) => console.log(line));
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
  if (profile && !["research", "scope"].includes(profile)) throw new Error(`unsupported profile: ${profile}`);
  if (profile === "research" && !scope) throw new Error("--profile requires --scope");
  if (scope) {
    if (path.isAbsolute(scope) || /^[A-Za-z]:[\\/]/u.test(scope)) throw new Error("--scope must be vault-relative");
    if (scope.split(/[\\/]/u).includes("..")) throw new Error("--scope must not contain traversal");
    const normalized = profile === "scope" ? normalizeScopePath(scope) : toPosix(path.posix.normalize(scope));
    if (normalized === ".." || normalized.startsWith("../") || normalized === "" || normalized === "." && profile !== "scope") {
      throw new Error("--scope must name a contained vault directory");
    }
    if (profile === "scope") {
      scope = normalized;
      return { vault, scope, profile };
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

function findingOriginInScope(finding, scope) {
  const value = typeof finding === "string" ? finding : finding.origin;
  return value === scope || value.startsWith(`${scope}/`);
}

function structuredFindingAppliesToScope(finding, scope) {
  if (typeof finding === "string") return findingOriginInScope(finding, scope);
  return findingOriginInScope(finding, scope) || finding.obligations.some((obligation) => obligation === scope || obligation.startsWith(`${scope}/`));
}

function filterResults(result, options) {
  if (!options.scope) return result;
  const filtered = {};
  for (const [key, values] of Object.entries(result)) {
    filtered[key] = values.filter((value) => structuredFindingAppliesToScope(value, options.scope));
  }
  if (options.profile === "research") {
    const kept = new Set([
      "errors",
      "broken",
      "trueOrphans",
      "unlinkedBases",
      "localBaseScopeWarnings",
      "ambiguousWikilinkWarnings",
      "routingMatrixWarnings",
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
  let targetScopeId = null;
  let topologyFindings = null;
  let inventory = null;
  if (options.profile === "scope") {
    inventory = inventoryVault(options.vault);
    liveObservationCount = 0;
    activateLiveObservationGuard();
    const topology = buildTopology(inventory);
    topologyFindings = scopeFindings(topology, inventory);
    if (options.scope) {
      const matches = [...topology.descriptorsById.values()].filter((descriptor) => descriptor.scopePath === options.scope);
      if (matches.length !== 1) throw new Error(`--scope must resolve to one canonical adopted scope: ${options.scope}`);
      targetScopeId = matches[0].scopeId;
      topologyFindings = filterFindingsByScope(topologyFindings, targetScopeId, topology);
    }
  }
  const result = filterResults(validate(options.vault, options, inventory), options);
  if (topologyFindings) {
    result.scopeAdoptionWarnings = [];
    result.scopeContractWarnings = [];
    result.scopeMapWarnings = [];
    for (const item of topologyFindings) result[findingCounter(item)].push(item);
  }
  printResults(result);
  if (process.env.ARIADNE_TEST_INVENTORY_TRACE === "1") {
    console.error(`inventory-snapshots: ${inventory ? 1 : 0}; fallback-reads: ${fallbackReadCount}; live-observations: ${liveObservationCount}`);
  }
  const ok = result.errors.length === 0 &&
    result.broken.length === 0 &&
    result.trueOrphans.length === 0 &&
    result.unlinkedBases.length === 0;
  process.exit(ok ? 0 : 1);
} catch (error) {
  console.error(`validator-error: ${error.message}`);
  process.exit(1);
}
