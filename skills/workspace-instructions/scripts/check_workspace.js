#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT_INSTRUCTION_FILES = new Set(["AGENTS.md", "CLAUDE.md", "GEMINI.md"]);
const LOCAL_ONLY_FILES = new Set(["AGENTS.override.md", "CLAUDE.local.md", "GEMINI.local.md"]);
const TEXT_EXTENSIONS = new Set([".md", ".txt", ".json", ".yaml", ".yml"]);
const CURRENT_MARKER_START = "<!-- ariadne:workspace-vault-link:start -->";
const CURRENT_MARKER_END = "<!-- ariadne:workspace-vault-link:end -->";
const GLOBAL_DISCOVERY_START = "<!-- ariadne:vault-discovery:start -->";
const GLOBAL_DISCOVERY_END = "<!-- ariadne:vault-discovery:end -->";
const LARGE_INSTRUCTION_LINE_THRESHOLD = 180;

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

function sharedInstructionFiles(files) {
  return allInstructionFiles(files).filter((file) => !LOCAL_ONLY_FILES.has(path.posix.basename(file)));
}

function rootSharedInstructionFiles(files) {
  return rootInstructionFiles(files).concat(files.includes(".github/copilot-instructions.md") ? [".github/copilot-instructions.md"] : []);
}

function localInstructionFiles(files) {
  return files.filter((file) => LOCAL_ONLY_FILES.has(path.posix.basename(file))).sort();
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

function detectContentSignals(root, files, git) {
  const privatePathLeakFiles = [];
  const largeInstructionFiles = [];
  const vaultNavigationCopyFiles = [];
  const multipleScopeLinkFiles = [];
  const instructionLineCounts = {};

  for (const file of rootSharedInstructionFiles(files).filter(isTextFile)) {
    const text = read(root, file);
    const lineCount = text.split(/\r?\n/u).length;
    const isTracked = git.insideWorkTree ? git.tracked.has(file) : true;
    instructionLineCounts[file] = lineCount;
    if (isTracked && detectPrivatePath(text)) privatePathLeakFiles.push(file);
    if (lineCount > LARGE_INSTRUCTION_LINE_THRESHOLD) largeInstructionFiles.push(file);
    if (/Cold-start entry order:|Agent\/Task Routing Matrix|scope catalogs|destination maps/iu.test(text)) {
      vaultNavigationCopyFiles.push(file);
    }
    if ((text.match(/Related Ariadne scope:/gu) || []).length > 1) {
      multipleScopeLinkFiles.push(file);
    }
  }

  return {
    privatePathLeakFiles: privatePathLeakFiles.sort(),
    instructionLineCounts,
    largeInstructionFiles: largeInstructionFiles.sort(),
    vaultNavigationCopyFiles: vaultNavigationCopyFiles.sort(),
    multipleScopeLinkFiles: multipleScopeLinkFiles.sort(),
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

function checkWorkspace(root) {
  const workspaceRoot = path.resolve(root);
  const files = listFiles(workspaceRoot);
  const git = inspectGit(workspaceRoot, files);
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
    ...detectContentSignals(workspaceRoot, files, git),
    ...detectMarkers(workspaceRoot, files),
    ...detectAdapters(workspaceRoot, files),
    ...detectNestedInstructions(workspaceRoot, files),
  };
}

function printHuman(report) {
  console.log(`workspace: ${report.workspaceRoot}`);
  console.log(`git: ${report.git.insideWorkTree ? "yes" : "no"}`);
  console.log(`linked-worktree: ${report.git.isLinkedWorktree ? "yes" : "no"}`);
  for (const key of Object.keys(report).filter((name) => Array.isArray(report[name]))) {
    console.log(`${key}: ${report[key].length ? report[key].join(", ") : "0"}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const target = args.find((arg) => !arg.startsWith("-"));
  if (!target) {
    console.error("usage: node skills/workspace-instructions/scripts/check_workspace.js /path/to/workspace [--json]");
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
