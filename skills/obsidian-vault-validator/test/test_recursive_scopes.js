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

function copyDir(source, target) {
  fs.cpSync(source, target, { recursive: true });
}

const tests = [
  function rootOnlyLegacyVaultStillPasses() {
    const result = runValidator("root_only_legacy_pass");

    assertSuccess(result);
    assertCounter(result.stdout, "broken-wikilinks", 0);
    assertCounter(result.stdout, "true-orphans-md", 0);
    assertCounter(result.stdout, "unlinked-base-files", 0);
    assertCounter(result.stdout, "local-base-scope-warnings", 0);
    assertCounter(result.stdout, "local-agents-inheritance-warnings", 0);
    assertCounter(result.stdout, "ambiguous-wikilink-warnings", 0);
    assertCounter(result.stdout, "scope-navigation-warnings", 0);
  },

  function arbitraryDepthChildScopePasses() {
    const result = runValidator("arbitrary_depth_child_scope_pass");

    assertSuccess(result);
    assertCounter(result.stdout, "broken-wikilinks", 0);
    assertCounter(result.stdout, "unlinked-base-files", 0);
    assertCounter(result.stdout, "local-base-scope-warnings", 0);
    assertCounter(result.stdout, "scope-navigation-warnings", 0);
  },

  function nestedBaseYamlIsParsed() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    copyDir(path.join(FIXTURES, "nested_base_yaml_parsing"), vault);
    fs.writeFileSync(path.join(vault, "Projects/Beta/Bases/Broken.base"), "views:\n  - name: [unterminated\n");

    const result = runValidatorPath(vault);

    assertFailure(result);
    assert.match(result.stdout, /^yaml-errors: 1$/m);
    assert.match(result.stdout, /Projects\/Beta\/Bases\/Broken\.base/);
  },

  function localBaseWithoutScopeFilterWarnsWithoutFailing() {
    const result = runValidator("local_base_without_scope_filter_warning");

    assertSuccess(result);
    assertCounter(result.stdout, "local-base-scope-warnings", 1);
    assert.match(result.stdout, /Projects\/Gamma\/Bases\/MissingScope\.base must include file\.inFolder\("Projects\/Gamma"\)/);
  },

  function localAgentsPolicyRepetitionWarns() {
    const result = runValidator("local_agents_policy_repetition_warning");

    assertSuccess(result);
    assertCounter(result.stdout, "local-agents-inheritance-warnings", 3);
    assert.match(result.stdout, /Keep notes as plain Markdown/);
    assert.match(result.stdout, /Use YAML frontmatter/);
    assert.match(result.stdout, /Do not read the whole vault/);
  },

  function duplicateBasenameWikilinkAmbiguityWarns() {
    const result = runValidator("duplicate_basename_wikilink_ambiguity_warning");

    assertSuccess(result);
    assertCounter(result.stdout, "ambiguous-wikilink-warnings", 1);
    assert.match(result.stdout, /Topic\.md -> \[\[Shared\]\] resolves to multiple targets/);
  },

  function canvasWikilinkTargetPasses() {
    const result = runValidator("canvas_wikilink_target_pass");

    assertSuccess(result);
    assertCounter(result.stdout, "broken-wikilinks", 0);
    assertCounter(result.stdout, "true-orphans-md", 0);
  },

  function parentHubMissingChildLinkWarns() {
    const result = runValidator("parent_hub_missing_child_link_warning");

    assertSuccess(result);
    assertCounter(result.stdout, "scope-navigation-warnings", 1);
    assert.match(result.stdout, /Projects\/00 Projects Index\.md does not link child hub Projects\/Child\/00 Child Index\.md/);
  },

  function routingMatrixMissingScopeWarns() {
    const result = runValidator("routing_matrix_missing_scope_warning");

    assertSuccess(result);
    assertCounter(result.stdout, "routing-matrix-warnings", 1);
    assert.match(result.stdout, /Agent\/Task Routing Matrix\.md does not link scope hub Projects\/Alpha\/00 Alpha Index\.md/);
  },

  function baseScopeFormulaMissingBranchWarns() {
    const result = runValidator("base_scope_formula_missing_branch_warning");

    assertSuccess(result);
    assertCounter(result.stdout, "base-scope-formula-warnings", 1);
    assert.match(result.stdout, /Bases\/Master Notes\.base: scope formula missing branch for Domains\/Alpha/);
  },
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} tests passed`);
