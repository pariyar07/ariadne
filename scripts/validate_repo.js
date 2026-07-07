#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_REPO_FILES = [
  "SECURITY.md",
  "PUBLIC_BOUNDARY.md",
  ".github/CODEOWNERS",
  ".github/dependabot.yml",
  ".github/pull_request_template.md",
  ".github/ISSUE_TEMPLATE/bug_report.md",
  ".github/ISSUE_TEMPLATE/skill_improvement.md",
  ".github/ISSUE_TEMPLATE/security.md",
  ".github/workflows/validate-repo.yml",
  ".github/workflows/validate-skills.yml",
  ".github/workflows/scorecard.yml",
];

const OS_METADATA = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);
const LOCAL_ONLY_FILES = new Set(["CLAUDE.local.md", "GEMINI.local.md", "AGENTS.override.md"]);
const TEXT_EXTENSIONS = new Set([".js", ".json", ".md", ".sh", ".txt", ".yaml", ".yml"]);
const PLACEHOLDER_PATTERNS = [
  new RegExp("\\bTODO " + "placeholder\\b", "iu"),
  /\bTBD\b/iu,
  /\bcoming soon\b/iu,
  new RegExp("\\bplaceholder " + "skill\\b", "iu"),
];
const PRIVATE_TEXT_PATTERNS = [
  /\/Users\/[A-Za-z0-9._-]+/u,
  /\/private\/tmp\/ariadne-eval-lab/u,
  new RegExp("Satyam" + "'s Vault", "u"),
  new RegExp("satyams" + "-vault", "u"),
];
const REMOVED_SKILL_PATTERNS = [
  new RegExp("obsidian-" + "feature-" + "workstream", "u"),
  new RegExp("feature-" + "workstream", "u"),
  new RegExp("ariadne:" + "project-agents", "u"),
  new RegExp("ariadne:" + "discovery", "u"),
  new RegExp("ariadne:" + "ingest", "u"),
  new RegExp("ariadne:" + "research-ingest", "u"),
  new RegExp("ariadne:" + "workstream-board", "u"),
  new RegExp("ariadne:" + "maintainer", "u"),
];

function toPosix(file) {
  return file.split(path.sep).join("/");
}

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    const relative = toPosix(path.relative(ROOT, absolute));
    if (relative === ".git" || relative.startsWith(".git/")) continue;
    if (relative === "node_modules" || relative.startsWith("node_modules/")) continue;

    results.push(relative);
    if (entry.isDirectory()) walk(absolute, results);
  }
  return results;
}

function listRepoFiles() {
  try {
    const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output
      .split("\0")
      .filter(Boolean)
      .filter((file) => fs.existsSync(path.join(ROOT, file)) && fs.statSync(path.join(ROOT, file)).isFile())
      .sort();
  } catch {
    return walk(ROOT)
      .filter((file) => fs.statSync(path.join(ROOT, file)).isFile())
      .sort();
  }
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function isTextFile(file) {
  return TEXT_EXTENSIONS.has(path.extname(file));
}

function fail(errors, message) {
  errors.push(message);
}

function validateRepoFiles(errors) {
  for (const file of REQUIRED_REPO_FILES) {
    if (!fs.existsSync(path.join(ROOT, file))) {
      fail(errors, `required file missing: ${file}`);
    }
  }
}

function validateSkillFolders(errors) {
  const skillsDir = path.join(ROOT, "skills");
  const skillDirs = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `skills/${entry.name}`)
    .sort();

  for (const dir of skillDirs) {
    const skillFile = `${dir}/SKILL.md`;
    const openaiFile = `${dir}/agents/openai.yaml`;
    if (!fs.existsSync(path.join(ROOT, skillFile))) {
      fail(errors, `skill folder missing SKILL.md: ${dir}`);
      continue;
    }
    if (!fs.existsSync(path.join(ROOT, openaiFile))) {
      fail(errors, `skill folder missing agents/openai.yaml: ${dir}`);
    }

    const skillText = read(skillFile);
    if (!/^---\n[\s\S]*?\n---\n/u.test(skillText)) {
      fail(errors, `skill missing YAML frontmatter: ${skillFile}`);
    }
    if (!/^name:\s*(?:[A-Za-z0-9_-]+:)?[A-Za-z0-9_-]+$/mu.test(skillText)) {
      fail(errors, `skill frontmatter missing name: ${skillFile}`);
    }
    if (!/^description:\s*.+$/mu.test(skillText)) {
      fail(errors, `skill frontmatter missing description: ${skillFile}`);
    }
  }
}

function validateTextSafety(errors, files) {
  for (const file of files.filter(isTextFile)) {
    const text = read(file);
    for (const pattern of PRIVATE_TEXT_PATTERNS) {
      if (pattern.test(text)) fail(errors, `private or maintainer-local text found in ${file}: ${pattern}`);
    }
    for (const pattern of REMOVED_SKILL_PATTERNS) {
      if (pattern.test(text)) fail(errors, `removed skill reference found in ${file}: ${pattern}`);
    }
    if (file.startsWith("skills/") && file.endsWith("/SKILL.md")) {
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(text)) fail(errors, `placeholder skill text found in ${file}: ${pattern}`);
      }
    }
  }
}

function validatePathSafety(errors, files) {
  for (const file of files) {
    const basename = path.posix.basename(file);
    if (OS_METADATA.has(basename)) fail(errors, `OS metadata file must not be committed: ${file}`);
    if (LOCAL_ONLY_FILES.has(basename)) fail(errors, `local-only agent file must not be committed: ${file}`);
  }
}

function validateWorkflows(errors) {
  const repoWorkflow = ".github/workflows/validate-repo.yml";
  const skillWorkflow = ".github/workflows/validate-skills.yml";
  if (fs.existsSync(path.join(ROOT, repoWorkflow)) && !read(repoWorkflow).includes("node scripts/validate_repo.js")) {
    fail(errors, `${repoWorkflow} must run scripts/validate_repo.js`);
  }
  if (
    fs.existsSync(path.join(ROOT, repoWorkflow)) &&
    !read(repoWorkflow).includes("node skills/workspace-instructions/test/test_workspace_instructions.js")
  ) {
    fail(errors, `${repoWorkflow} must run workspace-instructions behavior tests`);
  }
  if (fs.existsSync(path.join(ROOT, skillWorkflow)) && !read(skillWorkflow).includes("node scripts/validate_repo.js --skills-only")) {
    fail(errors, `${skillWorkflow} must run scripts/validate_repo.js --skills-only`);
  }
}

function validateRuntimeAdapters(errors) {
  const sharedGuidance = "Use AGENTS.md as the shared project guidance for this repository.";
  const adapterChecks = [
    ["CLAUDE.md", "@CLAUDE.local.md"],
    ["GEMINI.md", "@GEMINI.local.md"],
  ];

  for (const [file, localImport] of adapterChecks) {
    if (!fs.existsSync(path.join(ROOT, file))) continue;
    const text = read(file);
    if (!text.includes(sharedGuidance)) {
      fail(errors, `${file} must explain that AGENTS.md is the shared project guidance`);
    }
    if (!/^@AGENTS\.md$/mu.test(text)) {
      fail(errors, `${file} must import AGENTS.md`);
    }
    if (text.includes(localImport)) {
      fail(errors, `${file} must not import ignored local files by default: ${localImport}`);
    }
  }

  const workspaceInstructionReference = "skills/workspace-instructions/references/workspace-instruction-files.md";
  if (fs.existsSync(path.join(ROOT, workspaceInstructionReference))) {
    const text = read(workspaceInstructionReference);
    if (!text.includes("Do not import local ignored files from tracked adapter files by default.")) {
      fail(errors, `${workspaceInstructionReference} must document the tracked-adapter local import guard`);
    }
    if (!text.includes("AGENTS.override.md` replaces `AGENTS.md` for Codex at the same directory level")) {
      fail(errors, `${workspaceInstructionReference} must document Codex AGENTS.override.md replacement semantics`);
    }
    for (const required of [
      "## Sharing Modes",
      "Do not create `AGENTS.local.md` as a generic convention.",
      "Claude note: `CLAUDE.local.md` is appropriate for local project-specific notes and should be gitignored.",
      "`GEMINI.local.md` is not a guaranteed default",
      "Copilot note: repository custom instructions are shared repo guidance",
      ".github/copilot-instructions.md",
      "## Proactive Cleanup Signals",
      "## Scenario Coverage",
      "Migrate older Ariadne vault-link marker blocks in place",
      "Git local-only mode avoids tracked instruction changes and ensures local files are ignored",
      "duplicate or malformed Ariadne markers stop the update and ask for confirmation",
    ]) {
      if (!text.includes(required)) {
        fail(errors, `${workspaceInstructionReference} must document workspace instruction guidance: ${required}`);
      }
    }
    if (/```md\n@AGENTS\.md\n@(?:CLAUDE|GEMINI)\.local\.md\n```/u.test(text)) {
      fail(errors, `${workspaceInstructionReference} must not show default tracked adapters importing ignored local files`);
    }
  }
}

function validateWorkspaceInstructions(errors) {
  const requiredFiles = [
    "skills/workspace-instructions/scripts/check_workspace.js",
    "skills/workspace-instructions/test/test_workspace_instructions.js",
    "skills/workspace-instructions/references/workspace-instruction-scenarios.md",
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(ROOT, file))) {
      fail(errors, `workspace-instructions coverage file missing: ${file}`);
    }
  }

  const skillFile = "skills/workspace-instructions/SKILL.md";
  if (fs.existsSync(path.join(ROOT, skillFile))) {
    const text = read(skillFile);
    for (const required of [
      "node scripts/check_workspace.js",
      "Resolve `scripts/check_workspace.js` relative to this `SKILL.md`",
    ]) {
      if (!text.includes(required)) {
        fail(errors, `${skillFile} must document install-aware checker usage: ${required}`);
      }
    }
  }

  const scenarioReference = "skills/workspace-instructions/references/workspace-instruction-scenarios.md";
  if (fs.existsSync(path.join(ROOT, scenarioReference))) {
    const text = read(scenarioReference);
    for (const required of [
      "Expected actions",
      "Expected questions",
      "Forbidden actions",
      "Checker-owned",
      "Skill-owned",
      "node skills/workspace-instructions/test/test_workspace_instructions.js",
      "node test/test_workspace_instructions.js",
    ]) {
      if (!text.includes(required)) {
        fail(errors, `${scenarioReference} must document workspace scenario coverage: ${required}`);
      }
    }
  }

  const sourceSkillDir = path.join(ROOT, "skills/workspace-instructions");
  if (requiredFiles.every((file) => fs.existsSync(path.join(ROOT, file)))) {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-workspace-skill-copy-"));
    const copiedSkillDir = path.join(tmpRoot, "ariadne-workspace-instructions");
    try {
      fs.cpSync(sourceSkillDir, copiedSkillDir, { recursive: true });
      execFileSync(process.execPath, ["test/test_workspace_instructions.js"], {
        cwd: copiedSkillDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      const detail = String(error.stderr || error.message).split("\n").find(Boolean) || "unknown failure";
      fail(errors, `copied workspace-instructions harness must run from installed skill layout: ${detail}`);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  }
}

function main() {
  const skillsOnly = process.argv.includes("--skills-only");
  const errors = [];
  const files = listRepoFiles();

  validatePathSafety(errors, files);
  validateSkillFolders(errors);
  validateTextSafety(errors, files);
  if (!skillsOnly) {
    validateRepoFiles(errors);
    validateWorkflows(errors);
    validateRuntimeAdapters(errors);
    validateWorkspaceInstructions(errors);
  }

  if (errors.length > 0) {
    console.error(`Repo validation failed with ${errors.length} issue(s):`);
    for (const error of errors.sort()) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(skillsOnly ? "skill-repo-ok" : "repo-ok");
}

main();
