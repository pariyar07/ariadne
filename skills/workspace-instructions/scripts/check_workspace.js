#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT_INSTRUCTION_FILES = new Set(["AGENTS.md", "CLAUDE.md", "GEMINI.md", ".hermes.md", "HERMES.md"]);
const LOCAL_ONLY_FILES = new Set(["AGENTS.override.md", "CLAUDE.local.md", "GEMINI.local.md"]);
const TEXT_EXTENSIONS = new Set([".md", ".txt", ".json", ".yaml", ".yml"]);
const WORKSPACE_FILE = "WORKSPACE.md";
const CURRENT_MARKER_START = "<!-- ariadne:workspace-vault-link:start -->";
const CURRENT_MARKER_END = "<!-- ariadne:workspace-vault-link:end -->";
const GLOBAL_DISCOVERY_START = "<!-- ariadne:vault-discovery:start -->";
const GLOBAL_DISCOVERY_END = "<!-- ariadne:vault-discovery:end -->";
const LARGE_INSTRUCTION_LINE_THRESHOLD = 180;
const STANDARD_LINE_THRESHOLD = 150;
const COMMAND_SECTION_PATTERN = /^#{1,6}\s+.*\b(commands?|build|test(?:ing)?|setup|install|run|lint|scripts?|usage|develop(?:ment)?|deploy(?:ment)?)\b/imu;
const CHILD_DIRECTORY_SCAN_DEPTH = 2;
const RETIRED_RESEARCH_SKILL_REPLACEMENTS = new Map([
  ["ariadne:research-intake", "ariadne:research-ingest"],
  ["ariadne:synthesis", "ariadne:research-synthesis"],
]);
const RETIRED_RESEARCH_SKILL_REPAIR_GUIDANCE =
  "Replace retired research skill names only inside Ariadne-managed marker blocks; preserve all text outside those blocks.";

function toPosix(file) {
  return file.split(path.sep).join("/");
}

function relative(root, file) {
  return toPosix(path.relative(root, file));
}

function runGit(cwd, args) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function listFiles(root) {
  const results = [];

  function walk(dir) {
    if (dir !== root && fs.existsSync(path.join(dir, ".git"))) return;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        results.push(relative(root, fullPath));
      }
    }
  }

  walk(root);
  return results.sort();
}

function read(root, file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function countOccurrences(text, needle) {
  return text.split(needle).length - 1;
}

function markerManagedText(text) {
  const blocks = [];
  for (const [startMarker, endMarker] of [
    [CURRENT_MARKER_START, CURRENT_MARKER_END],
    [GLOBAL_DISCOVERY_START, GLOBAL_DISCOVERY_END],
  ]) {
    let offset = 0;
    while (offset < text.length) {
      const start = text.indexOf(startMarker, offset);
      if (start === -1) break;
      const contentStart = start + startMarker.length;
      const end = text.indexOf(endMarker, contentStart);
      if (end === -1) break;
      blocks.push(text.slice(contentStart, end));
      offset = end + endMarker.length;
    }
  }
  return blocks.join("\n");
}

function isTextFile(file) {
  return TEXT_EXTENSIONS.has(path.extname(file));
}

function inspectGit(root, files) {
  const inside = runGit(root, ["rev-parse", "--is-inside-work-tree"]) === "true";
  if (!inside) {
    return {
      insideWorkTree: false,
      root: null,
      isLinkedWorktree: false,
      tracked: new Set(),
    };
  }

  const gitRoot = runGit(root, ["rev-parse", "--show-toplevel"]);
  const normalGitDir = gitRoot ? path.join(gitRoot, ".git") : null;
  const tracked = new Set(
    (runGit(root, ["ls-files", "-z"]) || "")
      .split("\0")
      .filter(Boolean)
      .map(toPosix)
  );

  return {
    insideWorkTree: true,
    root: gitRoot,
    isLinkedWorktree: Boolean(normalGitDir && fs.existsSync(normalGitDir) && fs.statSync(normalGitDir).isFile()),
    tracked,
  };
}

function isIgnored(root, git, file) {
  if (!git.insideWorkTree) return false;
  try {
    execFileSync("git", ["check-ignore", "-q", "--", file], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

function rootInstructionFiles(files) {
  return files.filter((file) => ROOT_INSTRUCTION_FILES.has(file));
}

function allInstructionFiles(files) {
  return files.filter((file) => {
    const basename = path.posix.basename(file);
    return ROOT_INSTRUCTION_FILES.has(basename) || LOCAL_ONLY_FILES.has(basename) || file === ".github/copilot-instructions.md";
  });
}

function workspaceContractFiles(files) {
  return files.includes(WORKSPACE_FILE) ? [WORKSPACE_FILE] : [];
}

function sharedInstructionFiles(files) {
  return allInstructionFiles(files).filter((file) => !LOCAL_ONLY_FILES.has(path.posix.basename(file)));
}

function rootSharedInstructionFiles(files) {
  return rootInstructionFiles(files).concat(files.includes(".github/copilot-instructions.md") ? [".github/copilot-instructions.md"] : []);
}

function localInstructionFiles(files) {
  return files.filter((file) => LOCAL_ONLY_FILES.has(path.posix.basename(file))).sort();
}

function childDirectories(root, maxDepth = CHILD_DIRECTORY_SCAN_DEPTH) {
  const directories = [];

  function walk(dir, depth) {
    if (depth > maxDepth) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      if (!entry.isDirectory()) continue;
      const rel = relative(root, fullPath);
      directories.push(rel);
      if (!fs.existsSync(path.join(fullPath, ".git"))) {
        walk(fullPath, depth + 1);
      }
    }
  }

  walk(root, 1);
  return directories.sort();
}

function childGitRepos(root, directories) {
  return directories.filter((dir) => fs.existsSync(path.join(root, dir, ".git"))).sort();
}

function detectPrivatePath(text) {
  const macosUsersPattern = "\\/" + "Users" + "\\/[A-Za-z0-9._-]+\\/[^\\s)`]+";
  const pattern = new RegExp(
    "(?:^|[\\s(:])(?:" +
      "\\/home\\/[A-Za-z0-9._-]+\\/[^\\s)`]+|" +
      macosUsersPattern +
      "|~\\/[^\\s)`]+|" +
      "[A-Za-z]:\\\\Users\\\\[^\\s)`]+" +
      ")",
    "u"
  );
  return pattern.test(text);
}

function mentionsName(text, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(`(^|[^A-Za-z0-9._/-])${escaped}([^A-Za-z0-9._/-]|$)`, "u");
  return pattern.test(text);
}

function isInventoryLine(line) {
  return /^\s*(?:[-*]|\|)/u.test(line) && /\b(?:repo|repository|folder|project|service|package|client|app|workspace|api)\b/iu.test(line);
}

function detectWorkspaceContract(root, files, directories) {
  const workspaceFileExists = files.includes(WORKSPACE_FILE);
  const agentsText = files.includes("AGENTS.md") ? read(root, "AGENTS.md") : "";
  const agentsReferencesWorkspace = /\bWORKSPACE\.md\b/u.test(agentsText);
  const workspaceReferenceMissingFiles = agentsReferencesWorkspace && !workspaceFileExists ? [WORKSPACE_FILE] : [];
  const childNamesMentionedByFile = {};
  const missingChildNamesMentionedByFile = {};
  const existingNames = new Set(directories.flatMap((dir) => [dir, path.posix.basename(dir)]));
  const filesToInspect = rootSharedInstructionFiles(files).concat(workspaceContractFiles(files));

  for (const file of filesToInspect.filter(isTextFile)) {
    const text = read(root, file);
    const mentioned = directories
      .filter((dir) => mentionsName(text, dir) || mentionsName(text, path.posix.basename(dir)))
      .sort();
    childNamesMentionedByFile[file] = mentioned;

    const missing = [];
    for (const line of text.split(/\r?\n/u).filter(isInventoryLine)) {
      const tokenPattern = /`([A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*)`/gu;
      for (const match of line.matchAll(tokenPattern)) {
        const token = match[1];
        if (token === WORKSPACE_FILE || token.includes(".")) continue;
        if (!existingNames.has(token)) missing.push(token);
      }
    }
    missingChildNamesMentionedByFile[file] = [...new Set(missing)].sort();
  }

  return {
    workspaceFileExists,
    agentsReferencesWorkspace,
    workspaceReferenceMissingFiles,
    childNamesMentionedByFile,
    missingChildNamesMentionedByFile,
  };
}

function detectMarkers(root, files) {
  const duplicateCurrentMarkerFiles = [];
  const malformedMarkerFiles = [];
  const legacyMarkerFiles = [];
  const copiedGlobalDiscoveryFiles = [];
  const foreignMarkerFiles = [];

  for (const file of rootSharedInstructionFiles(files).filter(isTextFile)) {
    const text = read(root, file);
    const currentStarts = countOccurrences(text, CURRENT_MARKER_START);
    const currentEnds = countOccurrences(text, CURRENT_MARKER_END);
    const globalStarts = countOccurrences(text, GLOBAL_DISCOVERY_START);
    const globalEnds = countOccurrences(text, GLOBAL_DISCOVERY_END);
    const legacy = text.match(/<!--\s*ariadne:([a-z0-9-]+)-vault-link:start\s*-->/giu) || [];
    const foreign = text.match(/<!--\s*(?!ariadne:)[a-z0-9._-]+:[a-z0-9._-]+\s*-->/giu) || [];

    if (currentStarts > 1 || currentEnds > 1) duplicateCurrentMarkerFiles.push(file);
    if (currentStarts !== currentEnds || globalStarts !== globalEnds) malformedMarkerFiles.push(file);
    if (legacy.some((marker) => !marker.includes("workspace-vault-link"))) legacyMarkerFiles.push(file);
    if (globalStarts > 0 || globalEnds > 0) copiedGlobalDiscoveryFiles.push(file);
    if (foreign.length > 0) foreignMarkerFiles.push(file);
  }

  return {
    duplicateCurrentMarkerFiles: duplicateCurrentMarkerFiles.sort(),
    malformedMarkerFiles: malformedMarkerFiles.sort(),
    legacyMarkerFiles: legacyMarkerFiles.sort(),
    copiedGlobalDiscoveryFiles: copiedGlobalDiscoveryFiles.sort(),
    foreignMarkerFiles: foreignMarkerFiles.sort(),
  };
}

function detectRetiredResearchSkillNames(root, files) {
  const retiredResearchSkillNamesByFile = {};

  for (const file of allInstructionFiles(files).filter(isTextFile)) {
    const managedText = markerManagedText(read(root, file));
    retiredResearchSkillNamesByFile[file] = [...RETIRED_RESEARCH_SKILL_REPLACEMENTS.keys()]
      .filter((name) => managedText.includes(name))
      .sort();
  }

  const retiredResearchSkillNameFiles = Object.entries(retiredResearchSkillNamesByFile)
    .filter(([, names]) => names.length > 0)
    .map(([file]) => file)
    .sort();

  return {
    retiredResearchSkillNameFiles,
    retiredResearchSkillNamesByFile,
    retiredResearchSkillNameReplacements: Object.fromEntries(RETIRED_RESEARCH_SKILL_REPLACEMENTS),
    retiredResearchSkillRepairGuidance:
      retiredResearchSkillNameFiles.length > 0 ? RETIRED_RESEARCH_SKILL_REPAIR_GUIDANCE : null,
  };
}

function detectAdapters(root, files) {
  const adapterDuplicateFiles = [];
  const adapterLocalImports = [];
  const rootAgents = files.includes("AGENTS.md") ? read(root, "AGENTS.md").trim() : "";

  for (const file of ["CLAUDE.md", "GEMINI.md"]) {
    if (!files.includes(file)) continue;
    const text = read(root, file).trim();
    if (text.includes("@CLAUDE.local.md") || text.includes("@GEMINI.local.md")) {
      adapterLocalImports.push(file);
    }
    if (rootAgents && text === rootAgents) {
      adapterDuplicateFiles.push(file);
    }
  }

  return {
    adapterDuplicateFiles: adapterDuplicateFiles.sort(),
    adapterLocalImports: adapterLocalImports.sort(),
  };
}

function detectHermes(root, files) {
  const hermesContextFiles = [".hermes.md", "HERMES.md"].filter((file) => files.includes(file));
  const hermesShadowsAgentsFiles = files.includes("AGENTS.md") ? hermesContextFiles.slice() : [];
  const hermesUnsupportedImportFiles = [];

  for (const file of hermesContextFiles) {
    const text = read(root, file);
    if (/^[ \t]*@AGENTS\.md[ \t]*(?:\r?\n|$)/mu.test(text)) {
      hermesUnsupportedImportFiles.push(file);
    }
  }

  return {
    hermesContextFiles: hermesContextFiles.sort(),
    hermesShadowsAgentsFiles: hermesShadowsAgentsFiles.sort(),
    hermesUnsupportedImportFiles: hermesUnsupportedImportFiles.sort(),
  };
}

function detectContentSignals(root, files, git) {
  const privatePathLeakFiles = [];
  const largeInstructionFiles = [];
  const oversizedForStandardFiles = [];
  const vaultNavigationCopyFiles = [];
  const multipleScopeLinkFiles = [];
  const agentsMissingCommandGuidance = [];
  const instructionLineCounts = {};

  for (const file of rootSharedInstructionFiles(files).filter(isTextFile)) {
    const text = read(root, file);
    const lineCount = text.split(/\r?\n/u).length;
    const isTracked = git.insideWorkTree ? git.tracked.has(file) : true;
    instructionLineCounts[file] = lineCount;
    if (isTracked && detectPrivatePath(text)) privatePathLeakFiles.push(file);
    if (lineCount > LARGE_INSTRUCTION_LINE_THRESHOLD) largeInstructionFiles.push(file);
    if (lineCount > STANDARD_LINE_THRESHOLD) oversizedForStandardFiles.push(file);
    if (/Cold-start entry order:|Agent\/Task Routing Matrix|scope catalogs|destination maps/iu.test(text)) {
      vaultNavigationCopyFiles.push(file);
    }
    if ((text.match(/Related Ariadne scope:/gu) || []).length > 1) {
      multipleScopeLinkFiles.push(file);
    }
    // Command-first is an open-standard rule for the canonical AGENTS.md only.
    // Thin adapters (CLAUDE.md, GEMINI.md) legitimately point at AGENTS.md and carry no commands.
    if (file === "AGENTS.md" && !(COMMAND_SECTION_PATTERN.test(text) || text.includes("```"))) {
      agentsMissingCommandGuidance.push(file);
    }
  }

  return {
    privatePathLeakFiles: privatePathLeakFiles.sort(),
    instructionLineCounts,
    largeInstructionFiles: largeInstructionFiles.sort(),
    oversizedForStandardFiles: oversizedForStandardFiles.sort(),
    vaultNavigationCopyFiles: vaultNavigationCopyFiles.sort(),
    multipleScopeLinkFiles: multipleScopeLinkFiles.sort(),
    agentsMissingCommandGuidance: agentsMissingCommandGuidance.sort(),
  };
}

function detectNestedInstructions(root, files) {
  const nestedInstructionFiles = files
    .filter((file) => file.endsWith("/AGENTS.md"))
    .sort();
  const nestedInstructionDuplicateFiles = [];
  const rootAgents = files.includes("AGENTS.md") ? read(root, "AGENTS.md").trim() : "";

  for (const file of nestedInstructionFiles) {
    if (rootAgents && read(root, file).trim() === rootAgents) {
      nestedInstructionDuplicateFiles.push(file);
    }
  }

  return {
    nestedInstructionFiles,
    nestedInstructionDuplicateFiles: nestedInstructionDuplicateFiles.sort(),
  };
}

function detectCodexOverride(root, files) {
  const codexOverrideOutOfSyncFiles = [];

  if (files.includes("AGENTS.md") && files.includes("AGENTS.override.md")) {
    const agentsBody = read(root, "AGENTS.md").trim();
    let overrideText = read(root, "AGENTS.override.md");
    const startIdx = overrideText.indexOf(CURRENT_MARKER_START);
    const endIdx = overrideText.indexOf(CURRENT_MARKER_END);
    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
      overrideText = overrideText.slice(0, startIdx) + overrideText.slice(endIdx + CURRENT_MARKER_END.length);
    }
    if (agentsBody && !overrideText.trim().includes(agentsBody)) {
      codexOverrideOutOfSyncFiles.push("AGENTS.override.md");
    }
  }

  return { codexOverrideOutOfSyncFiles };
}

function checkWorkspace(root) {
  const workspaceRoot = path.resolve(root);
  const files = listFiles(workspaceRoot);
  const git = inspectGit(workspaceRoot, files);
  const childDirs = childDirectories(workspaceRoot);
  const childRepos = childGitRepos(workspaceRoot, childDirs);
  const localFiles = localInstructionFiles(files);
  const trackedInstructionFiles = rootInstructionFiles(files)
    .filter((file) => git.insideWorkTree && git.tracked.has(file))
    .sort();
  const trackedLocalOnlyFiles = localFiles
    .filter((file) => git.insideWorkTree && git.tracked.has(file))
    .sort();
  const localFilesMissingGitignore = localFiles
    .filter((file) => git.insideWorkTree && !isIgnored(workspaceRoot, git, file))
    .sort();

  return {
    workspaceRoot,
    git: {
      insideWorkTree: git.insideWorkTree,
      root: git.root,
      isLinkedWorktree: git.isLinkedWorktree,
    },
    instructionFiles: allInstructionFiles(files).sort(),
    trackedInstructionFiles,
    localInstructionFiles: localFiles,
    trackedLocalOnlyFiles,
    localFilesMissingGitignore,
    childDirectories: childDirs,
    childGitRepos: childRepos,
    rootGitPresentWithChildGitRepos: fs.existsSync(path.join(workspaceRoot, ".git")) && childRepos.length > 0,
    ...detectWorkspaceContract(workspaceRoot, files, childDirs),
    ...detectContentSignals(workspaceRoot, files, git),
    ...detectMarkers(workspaceRoot, files),
    ...detectRetiredResearchSkillNames(workspaceRoot, files),
    ...detectAdapters(workspaceRoot, files),
    ...detectHermes(workspaceRoot, files),
    ...detectNestedInstructions(workspaceRoot, files),
    ...detectCodexOverride(workspaceRoot, files),
  };
}

function printHuman(report) {
  console.log(`workspace: ${report.workspaceRoot}`);
  console.log(`git: ${report.git.insideWorkTree ? "yes" : "no"}`);
  console.log(`linked-worktree: ${report.git.isLinkedWorktree ? "yes" : "no"}`);
  for (const key of Object.keys(report).filter((name) => Array.isArray(report[name]))) {
    console.log(`${key}: ${report[key].length ? report[key].join(", ") : "0"}`);
  }
  if (report.retiredResearchSkillRepairGuidance) {
    console.log(`retiredResearchSkillRepairGuidance: ${report.retiredResearchSkillRepairGuidance}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const target = args.find((arg) => !arg.startsWith("-"));
  if (!target) {
    console.error("usage: node scripts/check_workspace.js /path/to/workspace [--json]");
    process.exit(2);
  }

  const report = checkWorkspace(target);
  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printHuman(report);
  }
}

if (require.main === module) main();

module.exports = {
  checkWorkspace,
};
