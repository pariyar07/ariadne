#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit"]);
const WRITE_ACTION_RE = /\b(add|append|capture|create|draft|edit|file|insert|log|modify|record|track|update|write)\b/iu;
const CONFIRM_RE = /\b(yes|yeah|yep|confirm|confirmed|proceed|go ahead|do it|that's right|that is right)\b/iu;
const ROOT_MARKERS = new Set(["Domains", "Projects", "Customers", "Clients", "Workstreams", "Areas"]);
const COMMON_TARGET_WORDS = new Set([
  "00",
  "agent",
  "agents",
  "archive",
  "bases",
  "dashboard",
  "dashboards",
  "evaluation",
  "features",
  "implementation",
  "index",
  "kanban",
  "notes",
  "outputs",
  "raw",
  "reports",
  "sources",
  "testing",
]);

function readStdin() {
  return fs.readFileSync(0, "utf8");
}

function parseInput(text) {
  if (!text.trim()) return {};
  return JSON.parse(text);
}

function jsonOut(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function stateDir() {
  return process.env.ARIADNE_WRITE_GUARD_STATE_DIR || path.join(os.tmpdir(), "ariadne-write-guard");
}

function sessionKey(input) {
  return String(input.session_id || "default").replace(/[^a-zA-Z0-9_.-]/gu, "_");
}

function stateFile(input) {
  return path.join(stateDir(), `${sessionKey(input)}.json`);
}

function loadState(input) {
  const file = stateFile(input);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function saveState(input, state) {
  fs.mkdirSync(stateDir(), { recursive: true });
  fs.writeFileSync(stateFile(input), `${JSON.stringify(state, null, 2)}\n`);
}

function allow(message) {
  return {
    continue: true,
    suppressOutput: true,
    hookSpecificOutput: {
      permissionDecision: "allow",
    },
    systemMessage: message || "Ariadne vault write guard allowed the operation.",
  };
}

function deny(message) {
  return {
    continue: true,
    suppressOutput: false,
    hookSpecificOutput: {
      permissionDecision: "deny",
    },
    systemMessage: message,
  };
}

function normalizeForMatch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/['’]/gu, "")
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isInside(child, parent) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function loadRegisteredVaultRoots(homeDir) {
  const registry = path.join(homeDir || os.homedir(), ".ariadne", "vaults.json");
  if (!fs.existsSync(registry)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(registry, "utf8"));
    return (parsed.vaults || []).map((vault) => vault.path).filter(Boolean);
  } catch {
    return [];
  }
}

function configuredProtectedRoots() {
  return String(process.env.ARIADNE_PROTECTED_WRITE_ROOTS || "")
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function protectedRoots(input) {
  return unique([...loadRegisteredVaultRoots(process.env.HOME), ...configuredProtectedRoots()]).map((root) => path.resolve(root));
}

function isProtectedMarkdown(filePath, roots) {
  if (path.extname(filePath).toLowerCase() !== ".md") return false;
  if (filePath.split(path.sep).includes("ariadne-kanban-staging")) return true;
  return roots.some((root) => isInside(filePath, root));
}

function collectFilePaths(value, cwd, paths = []) {
  if (!value || typeof value !== "object") return paths;
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === "string" && /(^|_)(file_?path|path|target|filename)$/iu.test(key)) {
      const resolved = path.isAbsolute(child) ? child : path.resolve(cwd || process.cwd(), child);
      paths.push(path.normalize(resolved));
    } else if (Array.isArray(child)) {
      child.forEach((item) => collectFilePaths(item, cwd, paths));
    } else if (child && typeof child === "object") {
      collectFilePaths(child, cwd, paths);
    }
  }
  return paths;
}

function splitWords(value) {
  return String(value || "")
    .replace(/\.[^.]+$/u, "")
    .split(/[^A-Za-z0-9]+/u)
    .filter((word) => word.length >= 3);
}

function targetCandidates(filePath) {
  const segments = filePath.split(path.sep).filter(Boolean);
  const candidates = [];

  for (let index = 0; index < segments.length - 1; index += 1) {
    if (ROOT_MARKERS.has(segments[index])) {
      candidates.push(segments[index + 1]);
    }
  }

  for (const segment of segments) {
    const normalized = normalizeForMatch(segment);
    if (normalized.includes("ariadne")) candidates.push("Ariadne");
    if (normalized.includes("scoutflo")) candidates.push("Scoutflo");
    if (normalized.includes("tritorc")) candidates.push("Tritorc");
  }

  for (const word of splitWords(path.basename(filePath))) {
    const normalized = normalizeForMatch(word);
    if (!COMMON_TARGET_WORDS.has(normalized)) candidates.push(word);
  }

  return unique(
    candidates
      .map((candidate) => candidate.replace(/\.[^.]+$/u, "").trim())
      .filter((candidate) => normalizeForMatch(candidate).length >= 3)
      .filter((candidate) => !COMMON_TARGET_WORDS.has(normalizeForMatch(candidate))),
  );
}

function promptMentionsTarget(prompt, candidates) {
  const normalizedPrompt = normalizeForMatch(prompt);
  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeForMatch(candidate);
    return normalizedCandidate && normalizedPrompt.split(" ").includes(normalizedCandidate);
  });
}

function confirmedTargetApplies(state, candidates) {
  const confirmed = Array.isArray(state.confirmedTargets) ? state.confirmedTargets : [];
  return confirmed.some((target) => promptMentionsTarget(target, candidates));
}

function currentPromptFromState(state) {
  return String(state.currentPrompt || "");
}

function handleUserPromptSubmit(input) {
  const prompt = String(input.user_prompt || input.prompt || "");
  const previous = loadState(input);
  const state = {
    ...previous,
    currentPrompt: prompt,
    currentPromptHasWriteIntent: WRITE_ACTION_RE.test(prompt),
    updatedAt: new Date().toISOString(),
  };

  if (CONFIRM_RE.test(prompt) && Array.isArray(previous.pendingTargets) && previous.pendingTargets.length > 0) {
    state.confirmedTargets = previous.pendingTargets;
    state.pendingTargets = [];
  } else {
    state.confirmedTargets = [];
  }

  saveState(input, state);
  return allow("Ariadne vault write guard recorded the current user prompt.");
}

function handlePreToolUse(input) {
  if (!WRITE_TOOLS.has(input.tool_name)) {
    return allow("Ariadne vault write guard skipped non-write tool.");
  }

  const cwd = input.cwd || process.cwd();
  const roots = protectedRoots(input);
  const filePaths = collectFilePaths(input.tool_input || {}, cwd);
  const protectedFiles = filePaths.filter((filePath) => isProtectedMarkdown(filePath, roots));
  if (protectedFiles.length === 0) {
    return allow("Ariadne vault write guard skipped non-vault Markdown write.");
  }

  const state = loadState(input);
  const prompt = currentPromptFromState(state);
  const candidates = unique(protectedFiles.flatMap((filePath) => targetCandidates(filePath)));
  const hasCurrentPrompt = prompt.trim().length > 0;
  const explicitlyNamed = hasCurrentPrompt && promptMentionsTarget(prompt, candidates);
  const confirmed = confirmedTargetApplies(state, candidates);

  if (explicitlyNamed || confirmed) {
    return allow("Ariadne vault write guard found a current-turn explicit or confirmed target.");
  }

  const nextState = {
    ...state,
    pendingTargets: candidates,
    blockedAt: new Date().toISOString(),
    blockedFiles: protectedFiles,
  };
  saveState(input, nextState);

  const likelyTarget = candidates.length > 0 ? candidates.join(", ") : "the target scope";
  return deny(
    [
      "Ariadne vault write guard blocked this Markdown write.",
      `Likely target: ${likelyTarget}.`,
      "Before editing, ask the user to confirm the target scope/domain/customer/project/workstream in the current turn.",
      "Search hits, a single likely match, existing matching cards, prior conversation, current working directory, and active skills are not confirmation.",
    ].join(" "),
  );
}

function handle(input) {
  if (input.hook_event_name === "UserPromptSubmit") return handleUserPromptSubmit(input);
  if (input.hook_event_name === "PreToolUse") return handlePreToolUse(input);
  return allow("Ariadne vault write guard skipped unsupported hook event.");
}

function main() {
  try {
    jsonOut(handle(parseInput(readStdin())));
  } catch (error) {
    jsonOut({
      continue: true,
      suppressOutput: false,
      hookSpecificOutput: {
        permissionDecision: "deny",
      },
      systemMessage: `Ariadne vault write guard failed closed: ${error.message}`,
    });
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  handle,
  targetCandidates,
  promptMentionsTarget,
  isProtectedMarkdown,
};
