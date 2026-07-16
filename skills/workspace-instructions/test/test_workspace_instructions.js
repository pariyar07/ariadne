#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const SKILL_ROOT = path.resolve(__dirname, "..");
const CHECKER = path.join(SKILL_ROOT, "scripts/check_workspace.js");
const FIXTURES = path.join(__dirname, "fixtures");
const REPO_ROOT = path.resolve(SKILL_ROOT, "../..");
const REPO_VALIDATOR = path.join(REPO_ROOT, "scripts/validate_repo.js");

function run(cmd, args, cwd) {
  execFileSync(cmd, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function writeFile(root, file, text) {
  const fullPath = path.join(root, file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text, "utf8");
}

function expandFixtureContent(text) {
  const macosPrivatePath = "/" + "Users" + "/example/private-vault";
  return text.replaceAll("{{MACOS_PRIVATE_PATH}}", macosPrivatePath);
}

function materializeFixture(scenario) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-workspace-instructions-"));
  const workspace = path.join(tmpRoot, "workspace");

  if (scenario.git && scenario.git.worktree) {
    const source = path.join(tmpRoot, "source");
    fs.mkdirSync(source, { recursive: true });
    run("git", ["init"], source);
    run("git", ["config", "user.email", "fixture@example.test"], source);
    run("git", ["config", "user.name", "Fixture"], source);
    writeFile(source, "README.md", "# Fixture\n");
    run("git", ["add", "README.md"], source);
    run("git", ["commit", "-m", "initial"], source);
    run("git", ["worktree", "add", "-b", "fixture-worktree", workspace], source);
  } else {
    fs.mkdirSync(workspace, { recursive: true });
    if (scenario.git && scenario.git.init) {
      run("git", ["init"], workspace);
      run("git", ["config", "user.email", "fixture@example.test"], workspace);
      run("git", ["config", "user.name", "Fixture"], workspace);
    }
  }

  for (const file of scenario.files || []) {
    writeFile(workspace, file.path, expandFixtureContent(file.content));
  }

  if (scenario.git && scenario.git.init) {
    for (const file of scenario.git.track || []) {
      run("git", ["add", file], workspace);
    }
  }

  return { tmpRoot, workspace };
}

function readScenario(file) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, file, "scenario.json"), "utf8"));
}

function runChecker(workspace) {
  return JSON.parse(execFileSync(process.execPath, [CHECKER, workspace, "--json"], {
    cwd: SKILL_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }));
}

function snapshotFiles(root) {
  const snapshot = {};
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".git") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile()) snapshot[path.relative(root, fullPath)] = fs.readFileSync(fullPath, "utf8");
    }
  }
  walk(root);
  return snapshot;
}

function runRepoValidator() {
  try {
    return execFileSync(process.execPath, [REPO_VALIDATOR, "--skills-only"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    return `${error.stdout || ""}${error.stderr || ""}`;
  }
}

function assertArrayEqual(actual, expected, label) {
  assert.deepStrictEqual([...(actual || [])].sort(), [...expected].sort(), label);
}

function assertForbiddenSignals(report, forbidden, scenarioName) {
  for (const [key, expectedEmpty] of Object.entries(forbidden || {})) {
    if (expectedEmpty === "empty") {
      assert.deepStrictEqual(report[key], [], `${scenarioName}: expected ${key} to be empty`);
    }
  }
}

function assertObjectContains(actual, expected, label) {
  for (const [key, value] of Object.entries(expected)) {
    assert.deepStrictEqual((actual || {})[key], value, `${label}: ${key}`);
  }
}

function assertValues(actual, expected, label) {
  for (const [key, value] of Object.entries(expected || {})) {
    assert.deepStrictEqual(actual[key], value, `${label}: ${key}`);
  }
}

function assertScenario(scenario, report) {
  assert.strictEqual(report.git.insideWorkTree, scenario.expected.git.insideWorkTree, `${scenario.name}: git mode`);
  assert.strictEqual(report.git.isLinkedWorktree, scenario.expected.git.isLinkedWorktree, `${scenario.name}: worktree mode`);

  for (const [key, expected] of Object.entries(scenario.expected.arrays || {})) {
    assertArrayEqual(report[key], expected, `${scenario.name}: ${key}`);
  }

  for (const [key, expected] of Object.entries(scenario.expected.objects || {})) {
    assertObjectContains(report[key], expected, `${scenario.name}: ${key}`);
  }

  assertValues(report, scenario.expected.values, scenario.name);
  assertForbiddenSignals(report, scenario.expected.forbidden, scenario.name);
}

function main() {
  const fixtureNames = fs
    .readdirSync(FIXTURES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.ok(fixtureNames.length >= 12, "expected broad workspace-instructions fixture coverage");

  for (const fixtureName of fixtureNames) {
    const scenario = readScenario(fixtureName);
    const { tmpRoot, workspace } = materializeFixture(scenario);
    try {
      const before = snapshotFiles(workspace);
      const first = runChecker(workspace);
      const second = runChecker(workspace);
      assert.deepStrictEqual(first, second, `${scenario.name}: checker output must be idempotent`);
      assert.deepStrictEqual(snapshotFiles(workspace), before, `${scenario.name}: checker must preserve workspace files`);
      assertScenario(scenario, first);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  }

  const repoValidation = runRepoValidator();
  assert.ok(
    !repoValidation.includes("removed skill reference found in skills/workspace-instructions/test/fixtures/current_research_skill_names/scenario.json"),
    "active successor research skill names must not be rejected by the repository guardrail"
  );

  console.log(`${fixtureNames.length} workspace instruction scenarios passed`);
}

main();
