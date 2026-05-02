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
  return file === ".obsidian" || file.startsWith(".obsidian/") || file.includes("/.obsidian/");
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
  return file.replace(/\.(md|base)$/u, "");
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

function parseTopLevelScalars(yamlText) {
  const values = {};
  for (const line of yamlText.split(/\r?\n/u)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*?)\s*$/u);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
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

function validate(vaultPath) {
  process.chdir(vaultPath);

  const errors = [];
  const markdownFrontmatter = new Map();
  const files = walk(".");
    const markdownFiles = files.filter((file) => file.endsWith(".md")).sort();
  const baseFiles = files.filter((file) => file.endsWith(".base")).sort();
  const allTargets = [...markdownFiles, ...baseFiles];

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
      markdownFrontmatter.set(file, parseTopLevelScalars(frontmatter));
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

      const basenameMatches = basenameTargets.get(target) || [];
      if (!target.includes("/") && basenameMatches.length > 1) {
        const key = `${file}\0${target}`;
        if (!ambiguousSeen.has(key)) {
          ambiguousSeen.add(key);
          ambiguousWikilinkWarnings.push(`${file} -> [[${target}]] resolves to multiple targets: ${basenameMatches.slice().sort().join(", ")}`);
        }
      }

      const matches = targets.get(target) || [];
      if (matches.length === 0) {
        broken.push(`${file} -> [[${target}]]`);
      } else {
        for (const match of matches) incoming.set(match, (incoming.get(match) || 0) + 1);
      }
    }

    for (const target of markdownLinkTargets(text)) {
      const matches = targets.get(target) || [];
      if (matches.length === 0) continue;
      outgoing.set(file, (outgoing.get(file) || 0) + 1);
      for (const match of matches) incoming.set(match, (incoming.get(match) || 0) + 1);
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
  ];

  for (const [name, values] of counters) {
    console.log(`${name}: ${values.length}`);
    values.slice().sort().forEach((line) => console.log(line));
  }
}

const vault = process.argv[2] || process.cwd();
try {
  const result = validate(vault);
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
