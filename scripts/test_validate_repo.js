#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");

function copyTrackedWorkingTree(destination) {
  const files = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);

  for (const file of files) {
    const source = path.join(ROOT, file);
    if (!fs.existsSync(source)) continue;
    const target = path.join(destination, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

function runValidator(root) {
  return spawnSync(process.execPath, ["scripts/validate_repo.js", "--skills-only"], {
    cwd: root,
    encoding: "utf8",
  });
}

function replace(root, file, from, to) {
  const target = path.join(root, file);
  const original = fs.readFileSync(target, "utf8");
  assert(original.includes(from), `test mutation source missing in ${file}: ${from}`);
  fs.writeFileSync(target, original.split(from).join(to));
  return () => fs.writeFileSync(target, original);
}

function assertRejected(result, message) {
  assert.notStrictEqual(result.status, 0, "mutation unexpectedly passed repository validation");
  assert.match(result.stderr, new RegExp(message.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-repo-guardrail-test-"));

try {
  copyTrackedWorkingTree(tempRoot);

  assert(!fs.existsSync(path.join(tempRoot, "skills/research-intake")), "v0.2.0 must remove the research-intake adapter");
  assert(!fs.existsSync(path.join(tempRoot, "skills/synthesis")), "v0.2.0 must remove the synthesis adapter");

  const migrationText = fs.readFileSync(path.join(tempRoot, "docs/guides/research-lifecycle-migration.md"), "utf8");
  assert(migrationText.includes("v0.2.0"), "migration guide must name the breaking v0.2.0 release");
  assert(!migrationText.includes("one compatibility release"), "v0.2.0 must not promise a compatibility release");

  const readmeText = fs.readFileSync(path.join(tempRoot, "README.md"), "utf8");
  assert(!readmeText.includes("11 structural checks"), "README must not preserve the pre-v0.2.0 validator count");
  assert(!readmeText.includes("11 checks"), "README skill table must not preserve the pre-v0.2.0 validator count");
  assert(readmeText.includes("Markdown knowledge vaults"), "README must lead with frontend-neutral Markdown knowledge vault positioning");
  assert(readmeText.includes("Obsidian is not required"), "README must explain that Obsidian is an optional frontend");
  assert(!readmeText.includes("- Obsidian installed, with filesystem access to the target vault."), "README must not require the Obsidian app for core workflows");

  const quickstartText = fs.readFileSync(path.join(tempRoot, "docs/guides/quickstart.md"), "utf8");
  assert(!quickstartText.includes("11 counters"), "quickstart must not preserve the pre-v0.2.0 validator count");
  assert(!quickstartText.includes("all 11 counters"), "quickstart target must defer to the canonical validator output");
  assert(quickstartText.includes("Obsidian is not required"), "quickstart must distinguish the core filesystem workflow from the optional Obsidian frontend");

  const publicBoundaryText = fs.readFileSync(path.join(tempRoot, "PUBLIC_BOUNDARY.md"), "utf8");
  assert(publicBoundaryText.includes("Markdown knowledge vaults"), "public boundary must define Ariadne around Markdown knowledge vaults");

  const agentsText = fs.readFileSync(path.join(tempRoot, "AGENTS.md"), "utf8");
  assert(agentsText.includes("Markdown knowledge vaults"), "repository instructions must use frontend-neutral product positioning");

  const socialPreviewPath = path.join(tempRoot, ".github/ariadne-social-preview.png");
  assert(fs.existsSync(socialPreviewPath), "repository must retain the canonical GitHub social preview asset");
  const socialPreview = fs.readFileSync(socialPreviewPath);
  assert.strictEqual(socialPreview.readUInt32BE(16), 1280, "social preview must be 1280 pixels wide");
  assert.strictEqual(socialPreview.readUInt32BE(20), 640, "social preview must be 640 pixels high");

  const scopeText = fs.readFileSync(path.join(tempRoot, "skills/scope/SKILL.md"), "utf8");
  assert(scopeText.includes("most-specific child branch before its parent branch"), "scope skill must require child-before-parent Base formula ordering");
  assert(scopeText.includes("Run scoped validation first, then whole-vault validation"), "scope skill must require scoped-then-whole validation");
  assert(scopeText.includes("explicit inheritance from both the nearest parent scope and the vault root"), "scope skill must require explicit root and parent inheritance");
  assert(scopeText.includes("Preserve unrelated modified and untracked files"), "scope skill must preserve unrelated dirty work");

  const contributingText = fs.readFileSync(path.join(tempRoot, "CONTRIBUTING.md"), "utf8");
  assert(contributingText.includes("closeout/"), "contributor structure must include the closeout skill");
  assert(contributingText.includes("`agents/openai.yaml` is required"), "contributor guidance must require skill display metadata");

  const releaseText = fs.readFileSync(path.join(tempRoot, "docs/releases/v0.2.0.md"), "utf8");
  assert(releaseText.includes("https://github.com/pariyar07/ariadne/releases/tag/v0.2.0"), "release note must link the published GitHub Release");
  assert(releaseText.includes("Published 2026-07-15"), "release note must record its published state");
  assert(!releaseText.includes("ariadne-eval-lab"), "public release note must not link private eval-lab evidence");

  const implementationPlan = fs.readFileSync(path.join(tempRoot, "docs/superpowers/plans/2026-07-15-research-lifecycle-upgrade.md"), "utf8");
  assert(implementationPlan.includes("partially superseded by the direct-breaking v0.2.0 release decision"), "implementation plan must identify the direct-breaking supersession");
  assert(!implementationPlan.includes("Compatibility adapters remain for one migration release"), "implementation plan must not direct workers to restore compatibility adapters");

  assert(
    fs.readFileSync(path.join(tempRoot, "docs/guides/quickstart.md"), "utf8").includes(
      "If no target is named or confirmed, make zero writes and ask which research boundary should receive the material."
    ),
    "quickstart must require zero writes until a research target is named or confirmed"
  );

  const baseline = runValidator(tempRoot);
  assert.strictEqual(baseline.status, 0, baseline.stderr || baseline.stdout);

  let restore = replace(
    tempRoot,
    "docs/superpowers/plans/2026-07-15-research-lifecycle-upgrade.md",
    "partially superseded by the direct-breaking v0.2.0 release decision",
    "implementation remains active"
  );
  assertRejected(runValidator(tempRoot), "docs/superpowers/plans/2026-07-15-research-lifecycle-upgrade.md must preserve the direct-breaking v0.2.0 supersession notice");
  restore();

  restore = replace(
    tempRoot,
    "docs/guides/quickstart.md",
    "If no target is named or confirmed, make zero writes and ask which research boundary should receive the material.",
    "If no target is named, use the root queue."
  );
  assertRejected(runValidator(tempRoot), "docs/guides/quickstart.md must preserve the no-target zero-write gate");
  restore();

  restore = replace(
    tempRoot,
    "skills/validator/SKILL.md",
    "ariadne:research-ingest",
    "ariadne:mutated-ingest"
  );
  assertRejected(
    runValidator(tempRoot),
    "skills/validator/SKILL.md must reference the active research lifecycle surface: ariadne:research-ingest"
  );
  restore();

  restore = replace(
    tempRoot,
    "skills/vault/assets/templates/Vault Health Check Procedure.md",
    "ariadne:research-stewardship",
    "ariadne:mutated-stewardship"
  );
  assertRejected(
    runValidator(tempRoot),
    "skills/vault/assets/templates/Vault Health Check Procedure.md must reference the active research lifecycle surface: ariadne:research-stewardship"
  );
  restore();

  const activeRetiredPath = path.join(tempRoot, "docs", "active-retired-path.md");
  fs.writeFileSync(activeRetiredPath, "Use `skills/research-intake/SKILL.md` and `skills/synthesis/SKILL.md`.\n");
  let rejected = runValidator(tempRoot);
  assertRejected(rejected, "retired research skill path found outside migration allowlist in docs/active-retired-path.md: skills/research-intake");
  assertRejected(rejected, "retired research skill path found outside migration allowlist in docs/active-retired-path.md: skills/synthesis");
  fs.rmSync(activeRetiredPath);

  const retiredFolder = path.join(tempRoot, "skills", "research-intake");
  fs.mkdirSync(path.join(retiredFolder, "agents"), { recursive: true });
  fs.writeFileSync(path.join(retiredFolder, "SKILL.md"), "---\nname: ariadne:legacy-research\ndescription: Legacy fixture.\n---\n");
  fs.writeFileSync(path.join(retiredFolder, "agents/openai.yaml"), "display_name: Legacy fixture\n");
  assertRejected(runValidator(tempRoot), "retired skill folder must not exist: skills/research-intake");
  fs.rmSync(retiredFolder, { recursive: true, force: true });

  const migrationGuide = path.join(tempRoot, "docs/guides/research-lifecycle-migration.md");
  fs.appendFileSync(migrationGuide, "\nCompatibility paths: `skills/research-intake/` and `skills/synthesis/`.\n");
  const allowed = runValidator(tempRoot);
  assert.strictEqual(allowed.status, 0, allowed.stderr || allowed.stdout);

  console.log("repository guardrail mutation tests passed");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
