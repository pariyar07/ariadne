#!/usr/bin/env node
"use strict";

const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const VALIDATOR = path.resolve(__dirname, "../scripts/validate_vault.sh");
const FIXTURES = path.resolve(__dirname, "fixtures/recursive_scopes");

function runValidatorPath(vaultPath) {
  const result = childProcess.spawnSync(VALIDATOR, [vaultPath], {
    encoding: "utf8",
  });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  };
}

function runValidator(fixtureName) {
  return runValidatorPath(path.join(FIXTURES, fixtureName));
}

function assertSuccess(result) {
  assert.strictEqual(result.status, 0, result.stdout + result.stderr);
}

function assertFailure(result) {
  assert.notStrictEqual(result.status, 0, result.stdout + result.stderr);
}

function assertCounter(output, name, count) {
  assert.match(output, new RegExp(`^${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}: ${count}$`, "m"));
}

const COUNTERS = [
  "broken-wikilinks",
  "true-orphans-md",
  "unlinked-base-files",
  "bloat-warnings",
  "local-base-scope-warnings",
  "local-agents-inheritance-warnings",
  "ambiguous-wikilink-warnings",
  "scope-navigation-warnings",
  "routing-matrix-warnings",
  "base-scope-formula-warnings",
];

function assertCounters(output, expected = {}) {
  assert.match(output, /^yaml-ok$/m);
  for (const name of COUNTERS) {
    assertCounter(output, name, expected[name] || 0);
  }
}

function copyDir(source, target) {
  fs.cpSync(source, target, { recursive: true });
}

const tests = [
  function rootOnlyLegacyVaultStillPasses() {
    const result = runValidator("root_only_legacy_pass");

    assertSuccess(result);
    assertCounters(result.stdout);
  },

  function arbitraryDepthChildScopePasses() {
    const result = runValidator("arbitrary_depth_child_scope_pass");

    assertSuccess(result);
    assertCounters(result.stdout);
  },

  function nestedBaseYamlIsParsed() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "nested_base_yaml_parsing"), vault);
      fs.writeFileSync(path.join(vault, "Projects/Beta/Bases/Broken.base"), "views:\n  - name: [unterminated\n");

      const result = runValidatorPath(vault);

      assertFailure(result);
      assert.match(result.stdout, /^yaml-errors: 1$/m);
      assert.match(result.stdout, /Projects\/Beta\/Bases\/Broken\.base/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function localBaseWithoutScopeFilterWarnsWithoutFailing() {
    const result = runValidator("local_base_without_scope_filter_warning");

    assertSuccess(result);
    assertCounters(result.stdout, { "local-base-scope-warnings": 1 });
    assert.match(result.stdout, /Projects\/Gamma\/Bases\/MissingScope\.base must include file\.inFolder\("Projects\/Gamma"\)/);
  },

  function localAgentsPolicyRepetitionWarns() {
    const result = runValidator("local_agents_policy_repetition_warning");

    assertSuccess(result);
    assertCounters(result.stdout, { "local-agents-inheritance-warnings": 3 });
    assert.match(result.stdout, /Keep notes as plain Markdown/);
    assert.match(result.stdout, /Use YAML frontmatter/);
    assert.match(result.stdout, /Do not read the whole vault/);
  },

  function duplicateBasenameWikilinkAmbiguityWarns() {
    const result = runValidator("duplicate_basename_wikilink_ambiguity_warning");

    assertSuccess(result);
    assertCounters(result.stdout, { "ambiguous-wikilink-warnings": 1 });
    assert.match(result.stdout, /Topic\.md -> \[\[Shared\]\] resolves to multiple targets/);
  },

  function canvasWikilinkTargetPasses() {
    const result = runValidator("canvas_wikilink_target_pass");

    assertSuccess(result);
    assertCounters(result.stdout);
  },

  function parentHubMissingChildLinkWarns() {
    const result = runValidator("parent_hub_missing_child_link_warning");

    assertSuccess(result);
    assertCounters(result.stdout, { "scope-navigation-warnings": 1 });
    assert.match(result.stdout, /Projects\/00 Projects Index\.md does not link child hub Projects\/Child\/00 Child Index\.md/);
  },

  function childHubMissingParentLinkWarns() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "parent_hub_missing_child_link_warning"), vault);
      fs.writeFileSync(
        path.join(vault, "Projects/00 Projects Index.md"),
        "# Projects Index\n\n- [[00 Index]]\n- [[Projects/Child/00 Child Index]]\n",
      );
      fs.writeFileSync(
        path.join(vault, "Projects/Child/00 Child Index.md"),
        "---\ntitle: Child\ntype: scope-index\nstatus: active\ncreated: 2026-05-03\ntags:\n  - scope\n---\n\n# Child Index\n\n- [[00 Index]]\n",
      );

      const result = runValidatorPath(vault);

      assertSuccess(result);
      assertCounters(result.stdout, { "scope-navigation-warnings": 1 });
      assert.match(result.stdout, /Projects\/Child\/00 Child Index\.md does not link parent hub Projects\/00 Projects Index\.md/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function bidirectionalScopeNavigationBreakWarnsTwice() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "parent_hub_missing_child_link_warning"), vault);
      fs.writeFileSync(
        path.join(vault, "Projects/Child/00 Child Index.md"),
        "---\ntitle: Child\ntype: scope-index\nstatus: active\ncreated: 2026-05-03\ntags:\n  - scope\n---\n\n# Child Index\n\n- [[00 Index]]\n",
      );

      const result = runValidatorPath(vault);

      assertSuccess(result);
      assertCounters(result.stdout, { "scope-navigation-warnings": 2 });
      assert.match(result.stdout, /Projects\/00 Projects Index\.md does not link child hub Projects\/Child\/00 Child Index\.md/);
      assert.match(result.stdout, /Projects\/Child\/00 Child Index\.md does not link parent hub Projects\/00 Projects Index\.md/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function routingMatrixMissingScopeWarns() {
    const result = runValidator("routing_matrix_missing_scope_warning");

    assertSuccess(result);
    assertCounters(result.stdout, { "routing-matrix-warnings": 1 });
    assert.match(result.stdout, /Agent\/Task Routing Matrix\.md does not link scope hub Projects\/Alpha\/00 Alpha Index\.md/);
  },

  function baseScopeFormulaMissingBranchWarns() {
    const result = runValidator("base_scope_formula_missing_branch_warning");

    assertSuccess(result);
    assertCounters(result.stdout, { "base-scope-formula-warnings": 1 });
    assert.match(result.stdout, /Bases\/Master Notes\.base: scope formula missing branch for Domains\/Alpha/);
  },

  function nestedBaseMissingSiblingIndexFails() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "arbitrary_depth_child_scope_pass"), vault);
      fs.rmSync(path.join(vault, "Projects/Alpha/Deep/Bases/00 Bases Index.md"));

      const result = runValidatorPath(vault);

      assertFailure(result);
      assertCounters(result.stdout, { "unlinked-base-files": 1 });
      assert.match(result.stdout, /Projects\/Alpha\/Deep\/Bases\/Deep Notes\.base: missing sibling Projects\/Alpha\/Deep\/Bases\/00 Bases Index\.md/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function nestedBaseUnlinkedFromSiblingIndexFails() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "arbitrary_depth_child_scope_pass"), vault);
      fs.writeFileSync(path.join(vault, "Projects/Alpha/Deep/Bases/00 Bases Index.md"), "# Deep Bases\n\n- [[Projects/Alpha/Deep/00 Deep Index]]\n");

      const result = runValidatorPath(vault);

      assertFailure(result);
      assertCounters(result.stdout, { "unlinked-base-files": 1 });
      assert.match(result.stdout, /Projects\/Alpha\/Deep\/Bases\/Deep Notes\.base: not linked from Projects\/Alpha\/Deep\/Bases\/00 Bases Index\.md/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} tests passed`);
