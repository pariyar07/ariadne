#!/usr/bin/env node
"use strict";

const fs = require("fs");
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
  if (fs.existsSync(path.join(ROOT, skillWorkflow)) && !read(skillWorkflow).includes("node scripts/validate_repo.js --skills-only")) {
    fail(errors, `${skillWorkflow} must run scripts/validate_repo.js --skills-only`);
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
  }

  if (errors.length > 0) {
    console.error(`Repo validation failed with ${errors.length} issue(s):`);
    for (const error of errors.sort()) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(skillsOnly ? "skill-repo-ok" : "repo-ok");
}

main();
