#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_REPO_FILES = [
  ".github/ariadne-social-preview.png",
  "CHANGELOG.md",
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
  ".github/workflows/release-evidence-gate.yml",
  "EVIDENCE_GATED_RELEASE.md",
  "scripts/release_evidence_gate.js",
  "scripts/test_release_evidence_gate.js",
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
  new RegExp("ariadne:" + "workstream-board", "u"),
  new RegExp("ariadne:" + "maintainer", "u"),
];
const RETIRED_RESEARCH_SKILL_PATTERNS = [
  new RegExp("ariadne:" + "research-intake", "u"),
  new RegExp("ariadne:" + "synthesis", "u"),
];
const RETIRED_RESEARCH_SKILL_PATHS = [
  "skills/" + "research-intake",
  "skills/" + "synthesis",
];
const RETIRED_RESEARCH_SKILL_ALLOWED_PREFIXES = [
  "docs/migration/",
  "docs/migrations/",
  "docs/release/",
  "docs/releases/",
  "docs/decision/",
  "docs/decisions/",
  "skills/workspace-instructions/test/fixtures/current_research_skill_names/",
  "skills/workspace-instructions/test/fixtures/retired_research_skill_names/",
];
const RETIRED_RESEARCH_SKILL_ALLOWED_FILES = new Set([
  "scripts/validate_repo.js",
  "scripts/test_validate_repo.js",
  "skills/workspace-instructions/scripts/check_workspace.js",
]);
const ACTIVE_RESEARCH_SKILL_REFERENCES = new Map([
  ["README.md", ["ariadne:research-ingest", "ariadne:research-synthesis", "ariadne:research-stewardship"]],
  ["CONTRIBUTING.md", ["research-ingest/", "research-synthesis/", "research-stewardship/"]],
  ["AGENTS.md", ["skills/research-ingest/SKILL.md", "skills/research-synthesis/SKILL.md", "skills/research-stewardship/SKILL.md"]],
  ["docs/guides/quickstart.md", ["ariadne:research-ingest", "ariadne:research-synthesis", "ariadne:research-stewardship"]],
  ["docs/guides/weekly-maintenance-automation.md", ["ariadne:research-ingest", "ariadne:research-synthesis", "ariadne:research-stewardship"]],
  ["skills/validator/SKILL.md", ["ariadne:research-ingest"]],
  ["skills/vault/assets/templates/AGENTS.md", ["ariadne:research-ingest", "ariadne:research-synthesis", "ariadne:research-stewardship"]],
  ["skills/vault/assets/templates/Vault Health Check Procedure.md", ["ariadne:research-stewardship"]],
]);
const WEEKLY_MAINTENANCE_PROMPT_VERSION_MARKER = "ARIADNE_WEEKLY_MAINTENANCE_PROMPT_VERSION: 1";
const RESEARCH_INGEST_ZERO_WRITE_GUIDANCE =
  "If no target is named or confirmed, make zero writes and ask which research boundary should receive the material.";
const TOPOLOGY_SYNCHRONIZER = "sync_scope_topology.js";
const SCOPE_TOPOLOGY_COUNTERS = ["scope-adoption-warnings", "scope-contract-warnings", "scope-map-warnings"];
const SCOPE_TOPOLOGY_COUNTER_PROPERTIES = new Map([
  ["scope-adoption-warnings", "scopeAdoptionWarnings"],
  ["scope-contract-warnings", "scopeContractWarnings"],
  ["scope-map-warnings", "scopeMapWarnings"],
]);
const SCOPE_TOPOLOGY_COUNTER_FIXTURE = "skills/validator/test/fixtures/scope_topology/expected/scope-profile-counters.json";
const SCOPE_TOPOLOGY_TEST = "skills/validator/test/test_scope_topology_adversarial.js";
const SCOPE_TOPOLOGY_MIGRATION = "docs/guides/scope-topology-migration.md";
const SCOPE_TOPOLOGY_MIGRATION_CONTRACTS = [
  "whole-vault", "ancestor-chain", "root activation last", "ariadne_scope_adoption: dismissed",
  "--resume", "--abort", "installed skills", "rollback", "reconciliation",
];
const SCOPE_TOPOLOGY_TEST_CONTRACTS = new Map([
  ["flexible-layout", "deep_transparent_ancestry"], ["transparent-folder", "deep_transparent_ancestry"],
  ["deep-ancestry", "deep_transparent_ancestry"], ["marker-preservation", "marker_preservation/input.json"],
  ["lifecycle", "contract_failures"], ["move", "operations/move.json"], ["redirect", "contract_failures/Redirect.md"],
  ["former-path", "contract_failures"], ["generated-only", "deep_transparent_ancestry"],
  ["unsupported-activation", "unsupported_root"], ["dismissal", "deep_transparent_ancestry/Dismissed/00 Index.md"],
  ["unicode-nfc-collision", "collision_descriptors"], ["case-fold-collision", "collision_descriptors"],
  ["reserved-path", "operations/move.json"], ["control-path", "operations/repair.json"],
  ["hardlink", "root_only"], ["symlink-swap", "root_only"], ["canvas-id-collision", "deep_transparent_ancestry"],
  ["base-formula-order", "base_ordering/Incorrect.base"], ["scoped-isolation", "scoped_sibling_isolation"],
]);
const TOPOLOGY_ORCHESTRATION_CONTRACTS = new Map([
  ["skills/scope/SKILL.md", [TOPOLOGY_SYNCHRONIZER, "scope-operation-request.md", "allowed_write_paths", "second check", "Never directly edit", "Non-registry root Base formulas are report-only", "explicit allowed_write_set"]],
  ["skills/navigation/SKILL.md", [TOPOLOGY_SYNCHRONIZER, "user extension areas", "generated blocks", "Never edit inside generated blocks", "Non-registry root Base formulas are report-only", "explicit allowed_write_set"]],
  ["skills/maintenance/SKILL.md", [TOPOLOGY_SYNCHRONIZER, "ariadne_scope_adoption: dismissed", "ancestor-chain", "whole-vault", "never directly edit"]],
  ["skills/validator/SKILL.md", [TOPOLOGY_SYNCHRONIZER, "--check", "--write --request", "--resume", "--abort", "Engine control paths"]],
  ["skills/vault/references/recursive-scopes.md", [TOPOLOGY_SYNCHRONIZER, "scope-operation-request.md"]],
  ["skills/scope/references/scope-operation-request.md", ["operation_schema", "allowed_write_paths", "content_write_paths", "Engine control paths"]],
]);
const TOPOLOGY_ORCHESTRATION_PATHS = [
  "skills/scope/",
  "skills/navigation/SKILL.md",
  "skills/maintenance/SKILL.md",
  "skills/validator/SKILL.md",
  "skills/vault/references/recursive-scopes.md",
];
const TOPOLOGY_EXECUTABLE_ALLOWLIST = new Map([
  ["sync_scope_topology.js", ["scripts/sync_scope_topology.js", "skills/validator/scripts/sync_scope_topology.js"]],
  ["validate_vault.js", ["scripts/validate_vault.js", "skills/validator/scripts/validate_vault.js"]],
  ["validate_vault.sh", ["scripts/validate_vault.sh", "skills/validator/scripts/validate_vault.sh"]],
  ["register_vault.js", ["scripts/register_vault.js", "skills/vault/scripts/register_vault.js"]],
]);
const TOPOLOGY_NON_EXECUTABLE_REFERENCES = new Set(["Node.js", "/path/to/request.js"]);
const PREPUBLIC_TERM_PATTERNS = [
  new RegExp("Memory " + "Map", "iu"),
  new RegExp("memory " + "lens(?:es)?", "iu"),
  new RegExp("memory " + "mode(?:s)?", "iu"),
  new RegExp("recall " + "packs?", "iu"),
  new RegExp("Agent/" + "Memory\\.md", "iu"),
  new RegExp("semantic " + "memory", "iu"),
  new RegExp("episodic " + "memory", "iu"),
  new RegExp("prospective " + "memory", "iu"),
  new RegExp("reflective " + "memory", "iu"),
  new RegExp("identity " + "and preference " + "memory", "iu"),
  new RegExp("(?:identity|preference) " + "memory", "iu"),
  new RegExp("memory " + "lifecycle", "iu"),
  new RegExp("Kusto" + "mize", "iu"),
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

function allowsRetiredResearchSkillNames(file) {
  if (RETIRED_RESEARCH_SKILL_ALLOWED_FILES.has(file)) return true;
  if (RETIRED_RESEARCH_SKILL_ALLOWED_PREFIXES.some((prefix) => file.startsWith(prefix))) return true;
  return /^(?:CHANGELOG|MIGRATION|MIGRATIONS|RELEASE|RELEASES)\.md$/u.test(file) ||
    /^docs\/(?:guides\/)?[^/]*(?:migration|release|decision)[^/]*\.md$/iu.test(file);
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
    if (["skills/research-intake", "skills/synthesis"].includes(dir)) {
      fail(errors, `retired skill folder must not exist: ${dir}`);
      continue;
    }
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
    if (!allowsRetiredResearchSkillNames(file)) {
      for (const pattern of RETIRED_RESEARCH_SKILL_PATTERNS) {
        if (pattern.test(text)) fail(errors, `retired research skill reference found outside migration allowlist in ${file}: ${pattern}`);
      }
      for (const retiredPath of RETIRED_RESEARCH_SKILL_PATHS) {
        if (text.includes(retiredPath)) {
          fail(errors, `retired research skill path found outside migration allowlist in ${file}: ${retiredPath}`);
        }
      }
    }
    for (const pattern of PREPUBLIC_TERM_PATTERNS) {
      if (pattern.test(text)) fail(errors, `pre-public memory architecture term found in ${file}: ${pattern}`);
    }
    if (file.startsWith("skills/") && file.endsWith("/SKILL.md")) {
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(text)) fail(errors, `placeholder skill text found in ${file}: ${pattern}`);
      }
    }
  }
}

function validateResearchLifecycleDocs(errors) {
  for (const [file, references] of ACTIVE_RESEARCH_SKILL_REFERENCES) {
    if (!fs.existsSync(path.join(ROOT, file))) {
      fail(errors, `research lifecycle documentation missing: ${file}`);
      continue;
    }
    const text = read(file);
    for (const reference of references) {
      if (!text.includes(reference)) {
        fail(errors, `${file} must reference the active research lifecycle surface: ${reference}`);
      }
    }
  }

  const weeklyGuide = "docs/guides/weekly-maintenance-automation.md";
  if (fs.existsSync(path.join(ROOT, weeklyGuide)) && !read(weeklyGuide).includes(WEEKLY_MAINTENANCE_PROMPT_VERSION_MARKER)) {
    fail(errors, `${weeklyGuide} must expose the stable prompt marker: ${WEEKLY_MAINTENANCE_PROMPT_VERSION_MARKER}`);
  }

  const quickstart = "docs/guides/quickstart.md";
  if (fs.existsSync(path.join(ROOT, quickstart)) && !read(quickstart).includes(RESEARCH_INGEST_ZERO_WRITE_GUIDANCE)) {
    fail(errors, `${quickstart} must preserve the no-target zero-write gate`);
  }

  const staleValidatorCounts = new Map([
    ["README.md", ["11 structural checks", "11 checks"]],
    [quickstart, ["11 counters", "all 11 counters"]],
  ]);
  for (const [file, phrases] of staleValidatorCounts) {
    if (!fs.existsSync(path.join(ROOT, file))) continue;
    const text = read(file);
    for (const phrase of phrases) {
      if (text.includes(phrase)) fail(errors, `${file} contains stale pre-v0.2.0 validator count: ${phrase}`);
    }
  }

  const requiredDocumentationContracts = new Map([
    ["README.md", ["Markdown knowledge vaults", "Obsidian is not required"]],
    ["docs/guides/quickstart.md", ["Obsidian is not required"]],
    ["PUBLIC_BOUNDARY.md", ["Markdown knowledge vaults"]],
    ["AGENTS.md", ["Markdown knowledge vaults"]],
    ["skills/scope/SKILL.md", ["most-specific child branch before its parent branch", "Non-registry root Base formulas are report-only", "explicit allowed_write_set", "Run scoped validation first, then whole-vault validation", "explicit inheritance from both the nearest parent scope and the vault root", "Preserve unrelated modified and untracked files"]],
    ["CONTRIBUTING.md", ["closeout/", "`agents/openai.yaml` is required"]],
    ["docs/releases/v0.2.0.md", ["Published 2026-07-15", "https://github.com/pariyar07/ariadne/releases/tag/v0.2.0"]],
  ]);
  for (const [file, phrases] of requiredDocumentationContracts) {
    if (!fs.existsSync(path.join(ROOT, file))) {
      fail(errors, `documentation contract missing: ${file}`);
      continue;
    }
    const text = read(file);
    for (const phrase of phrases) {
      if (!text.includes(phrase)) fail(errors, `${file} must preserve documentation contract: ${phrase}`);
    }
  }
  const releaseNote = "docs/releases/v0.2.0.md";
  if (fs.existsSync(path.join(ROOT, releaseNote)) && read(releaseNote).includes("ariadne-eval-lab")) {
    fail(errors, `${releaseNote} must not link private eval-lab evidence`);
  }

}

function validateTopologyAuthority(errors, files) {
  for (const [file, phrases] of TOPOLOGY_ORCHESTRATION_CONTRACTS) {
    if (!fs.existsSync(path.join(ROOT, file))) {
      fail(errors, `topology orchestration contract missing: ${file}`);
      continue;
    }
    const text = read(file);
    for (const phrase of phrases) {
      if (!text.includes(phrase)) fail(errors, `${file} must route topology changes through the synchronizer contract: ${phrase}`);
    }
  }

  const orchestrationFiles = files.filter((file) =>
    file.endsWith(".md") && TOPOLOGY_ORCHESTRATION_PATHS.some((entry) => entry.endsWith("/") ? file.startsWith(entry) : file === entry)
  );
  for (const file of orchestrationFiles) {
    for (const paragraph of read(file).split(/\n\s*\n/gu)) {
      for (const match of paragraph.matchAll(/[A-Za-z0-9_./-]+\.(?:js|sh)(?![A-Za-z0-9])/giu)) {
        const executable = match[0];
        const name = path.posix.basename(executable).toLowerCase();
        const context = paragraph.toLowerCase();
        if (TOPOLOGY_NON_EXECUTABLE_REFERENCES.has(executable)) continue;
        const canonicalForms = TOPOLOGY_EXECUTABLE_ALLOWLIST.get(name) || [];
        const canonicalRuntime = canonicalForms.length > 0 && (executable === name || canonicalForms.some((form) => executable === form || executable.endsWith(`/${form}`)));
        if (canonicalRuntime) continue;
        const segments = executable.toLowerCase().split("/");
        const testOnly = segments.includes("test") || name.startsWith("test_");
        const testContext = /(?:validat|fixture)/u.test(context);
        if (testOnly && testContext) continue;
        fail(errors, `unapproved executable reference found in topology-changing skill surface ${file}: ${executable}`);
      }
    }
  }
}

function validateScopeTopologyPublication(errors, files) {
  const validatorFile = "skills/validator/scripts/validate_vault.js";
  const validatorText = read(validatorFile);
  const counterArray = validatorText.match(/const counters = \[([\s\S]*?)\n  \];/u)?.[1] || "";
  for (const [counter, property] of SCOPE_TOPOLOGY_COUNTER_PROPERTIES) {
    const registration = new RegExp(`\\["${counter}", result\\.${property} \\|\\| \\[\\], Boolean\\(result\\.${property}\\)\\]`, "u");
    if (!registration.test(counterArray)) fail(errors, `${validatorFile} must register scope topology counter structurally: ${counter}`);
  }

  for (const file of ["skills/validator/SKILL.md", "docs/guides/validator.md", "README.md"]) {
    const text = read(file);
    const healthy = text.match(/A healthy vault[^\n]*\n\n```text\n([\s\S]*?)```/u)?.[1] || "";
    for (const counter of SCOPE_TOPOLOGY_COUNTERS) {
      if (!new RegExp(`^${counter}: 0$`, "mu").test(healthy)) fail(errors, `${file} healthy output must include scope topology counter: ${counter}`);
      if (file === "docs/guides/validator.md" && !text.includes(`| \`${counter}\` | No |`)) fail(errors, `${file} counter reference must include: ${counter}`);
    }
  }

  if (!fs.existsSync(path.join(ROOT, SCOPE_TOPOLOGY_COUNTER_FIXTURE))) {
    fail(errors, `scope topology expected-output fixture missing: ${SCOPE_TOPOLOGY_COUNTER_FIXTURE}`);
  } else {
    let expected = null;
    try { expected = JSON.parse(read(SCOPE_TOPOLOGY_COUNTER_FIXTURE)); } catch { /* reported below */ }
    if (JSON.stringify(expected) !== JSON.stringify(SCOPE_TOPOLOGY_COUNTERS)) fail(errors, `${SCOPE_TOPOLOGY_COUNTER_FIXTURE} must exactly declare the executable scope counter output contract`);
    const topologyTest = read("skills/validator/test/test_scope_topology.js");
    if (!topologyTest.includes("expected/scope-profile-counters.json") || !topologyTest.includes("for (const counter of expectedScopeCounters)")) fail(errors, "scope topology test must execute the expected counter output fixture");
  }

  if (!fs.existsSync(path.join(ROOT, SCOPE_TOPOLOGY_MIGRATION))) {
    fail(errors, `scope topology migration documentation missing: ${SCOPE_TOPOLOGY_MIGRATION}`);
  } else {
    const migration = read(SCOPE_TOPOLOGY_MIGRATION);
    for (const phrase of SCOPE_TOPOLOGY_MIGRATION_CONTRACTS) {
      if (!migration.includes(phrase)) fail(errors, `${SCOPE_TOPOLOGY_MIGRATION} must document migration contract: ${phrase}`);
    }
  }

  const adversarialTest = read(SCOPE_TOPOLOGY_TEST);
  for (const [name, fixture] of SCOPE_TOPOLOGY_TEST_CONTRACTS) {
    if (!adversarialTest.includes(`contract("${name}", "${fixture}", () =>`)) fail(errors, `${SCOPE_TOPOLOGY_TEST} missing executable contract: ${name}`);
    const fixturePath = `skills/validator/test/fixtures/scope_topology/${fixture}`;
    if (!fs.existsSync(path.join(ROOT, fixturePath))) fail(errors, `scope topology contract fixture missing for ${name}: ${fixturePath}`);
  }
  try {
    execFileSync(process.execPath, [SCOPE_TOPOLOGY_TEST], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    const detail = String(error.stderr || error.message).split("\n").find(Boolean) || "unknown failure";
    fail(errors, `scope topology executable contract suite failed: ${detail}`);
  }
}

function validatePathSafety(errors, files) {
  for (const file of files) {
    const basename = path.posix.basename(file);
    if (OS_METADATA.has(basename)) fail(errors, `OS metadata file must not be committed: ${file}`);
    if (LOCAL_ONLY_FILES.has(basename)) fail(errors, `local-only agent file must not be committed: ${file}`);
    if (file.startsWith("docs/superpowers/")) fail(errors, `internal superpowers artifact must not be committed: ${file}`);
  }
}

function validateWorkflows(errors) {
  const repoWorkflow = ".github/workflows/validate-repo.yml";
  const skillWorkflow = ".github/workflows/validate-skills.yml";
  const releaseWorkflow = ".github/workflows/release-evidence-gate.yml";
  if (fs.existsSync(path.join(ROOT, repoWorkflow)) && !read(repoWorkflow).includes("node scripts/validate_repo.js")) {
    fail(errors, `${repoWorkflow} must run scripts/validate_repo.js`);
  }
  if (
    fs.existsSync(path.join(ROOT, repoWorkflow)) &&
    !read(repoWorkflow).includes("node skills/workspace-instructions/test/test_workspace_instructions.js")
  ) {
    fail(errors, `${repoWorkflow} must run workspace-instructions behavior tests`);
  }
  if (fs.existsSync(path.join(ROOT, repoWorkflow)) && !read(repoWorkflow).includes("node scripts/test_validate_repo.js")) {
    fail(errors, `${repoWorkflow} must run repository guardrail mutation tests`);
  }
  if (fs.existsSync(path.join(ROOT, repoWorkflow))) {
    const workflow = read(repoWorkflow);
    for (const suite of [
      "skills/vault/test/test_scope_topology_templates.js",
      "skills/vault/test/test_research_templates.js",
      "skills/validator/test/test_scope_topology.js",
      "skills/validator/test/test_scope_topology_failures.js",
    ]) {
      if (!workflow.includes(`node ${suite}`)) fail(errors, `${repoWorkflow} must run ${suite}`);
    }
  }
  if (fs.existsSync(path.join(ROOT, skillWorkflow)) && !read(skillWorkflow).includes("node scripts/validate_repo.js --skills-only")) {
    fail(errors, `${skillWorkflow} must run scripts/validate_repo.js --skills-only`);
  }
  if (fs.existsSync(path.join(ROOT, releaseWorkflow)) && !read(releaseWorkflow).includes("node scripts/release_evidence_gate.js")) {
    fail(errors, `${releaseWorkflow} must run scripts/release_evidence_gate.js`);
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
      "Hermes note: Hermes can read `AGENTS.md` directly.",
      "Do not create `.hermes.md` or `HERMES.md` as thin adapters by default",
      "Do not rely on Claude-style `@AGENTS.md` imports in `.hermes.md` or `HERMES.md`",
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
  const sourceValidatorDir = path.join(ROOT, "skills/validator");
  if (requiredFiles.every((file) => fs.existsSync(path.join(ROOT, file)))) {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-workspace-skill-copy-"));
    const copiedSkillDir = path.join(tmpRoot, "ariadne-workspace-instructions");
    try {
      fs.cpSync(sourceSkillDir, copiedSkillDir, { recursive: true });
      fs.cpSync(sourceValidatorDir, path.join(tmpRoot, "ariadne-validator"), { recursive: true });
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
  validateResearchLifecycleDocs(errors);
  validateTopologyAuthority(errors, files);
  validateScopeTopologyPublication(errors, files);
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
