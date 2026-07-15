#!/usr/bin/env node
"use strict";

const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const VALIDATOR = path.resolve(__dirname, "../scripts/validate_vault.sh");
const FIXTURES = path.resolve(__dirname, "fixtures/recursive_scopes");

function runValidatorPath(vaultPath, args = []) {
  const result = childProcess.spawnSync(VALIDATOR, [vaultPath, ...args], {
    encoding: "utf8",
  });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  };
}

function runValidator(fixtureName, args = []) {
  return runValidatorPath(path.join(FIXTURES, fixtureName), args);
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
  "research-boundary-warnings",
  "research-provenance-warnings",
  "provenance-cycle-warnings",
  "uncompiled-raw-source-warnings",
  "research-hub-warnings",
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

function writeFile(root, relative, text) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function addChildResearchBoundary(vault) {
  writeFile(vault, "Domain/Child/Boundary.md", `---
type: research-boundary
research_schema: 1
boundary_id: child
scope_path: Domain/Child
raw_hub: "[[Domain/Child/Raw Hub]]"
compiled_hub: "[[Domain/Child/Compiled Hub]]"
inquiry_hub: "[[Domain/Child/Inquiry Hub]]"
synthesis_hub: "[[Domain/Child/Synthesis Hub]]"
view_mode: exact
rollup_boundaries: []
---

- [[00 Index]]
- [[Domain/Child/Raw Hub]]
- [[Domain/Child/Compiled Hub]]
- [[Domain/Child/Inquiry Hub]]
- [[Domain/Child/Synthesis Hub]]
`);
  writeFile(vault, "Domain/Child/Raw Hub.md", "- [[Domain/Child/Boundary]]\n- [[Domain/Child/Raw]]\n");
  for (const name of ["Compiled", "Inquiry", "Synthesis"]) {
    writeFile(vault, `Domain/Child/${name} Hub.md`, `- [[Domain/Child/Boundary]]\n`);
  }
  writeFile(vault, "Domain/Child/Raw.md", `---
type: raw-source
research_boundary: "[[Domain/Child/Boundary]]"
source_type: article
evidence_role: external-evidence
origin: Child source
locator: page 1
captured: 2026-07-15
compilation_status: source-only
derived_from: []
---

- [[00 Index]]
`);
  const index = path.join(vault, "00 Index.md");
  fs.appendFileSync(index, "\n- [[Domain/Child/Boundary]]\n");
}

function addEmptyResearchBoundary(vault, scope, fileName, boundaryId) {
  const descriptorPath = `${scope}/${fileName}`;
  writeFile(vault, `${descriptorPath}.md`, `---
type: research-boundary
research_schema: 1
boundary_id: ${boundaryId}
scope_path: ${scope}
raw_hub: "[[${scope}/Raw Hub]]"
compiled_hub: "[[${scope}/Compiled Hub]]"
inquiry_hub: "[[${scope}/Inquiry Hub]]"
synthesis_hub: "[[${scope}/Synthesis Hub]]"
view_mode: exact
rollup_boundaries: []
---

- [[00 Index]]
- [[${scope}/Raw Hub]]
- [[${scope}/Compiled Hub]]
- [[${scope}/Inquiry Hub]]
- [[${scope}/Synthesis Hub]]
`);
  for (const name of ["Raw", "Compiled", "Inquiry", "Synthesis"]) {
    writeFile(vault, `${scope}/${name} Hub.md`, `- [[${descriptorPath}]]\n`);
  }
  fs.appendFileSync(path.join(vault, "00 Index.md"), `\n- [[${descriptorPath}]]\n`);
  return descriptorPath;
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

  function researchSchemaValidPassesWithFlatLists() {
    const result = runValidator("research_schema_valid", ["--scope", "Domain", "--profile", "research"]);

    assertSuccess(result);
    assertCounters(result.stdout);
  },

  function researchWarningsAreRegisteredAndNonFatal() {
    const result = runValidator("research_schema_warnings", ["--scope", "Domain", "--profile", "research"]);

    assertSuccess(result);
    assertCounters(result.stdout, {
      "research-boundary-warnings": 2,
      "research-provenance-warnings": 2,
      "provenance-cycle-warnings": 2,
      "uncompiled-raw-source-warnings": 2,
      "research-hub-warnings": 1,
    });
    assert.match(result.stdout, /nested schema value/);
    assert.match(result.stdout, /generated-analysis.*derived_from/);
    assert.match(result.stdout, /provenance cycle/);
    assert.match(result.stdout, /compilation_status: pending/);
    assert.match(result.stdout, /does not link member/);
  },

  function legacyResearchWithoutSchemaIsGated() {
    const result = runValidator("research_legacy_gated", ["--scope", "Domain", "--profile", "research"]);

    assertSuccess(result);
    assertCounters(result.stdout);
  },

  function semanticStalenessDoesNotBecomeStructuralWarning() {
    const result = runValidator("research_semantically_stale_structurally_valid", ["--scope", "Domain", "--profile", "research"]);

    assertSuccess(result);
    assertCounters(result.stdout);
    assert.doesNotMatch(result.stdout, /stale|credib|contradict/iu);
  },

  function scopedResearchExcludesSiblingDefects() {
    const whole = runValidator("scoped_research_sibling_isolation");
    assertFailure(whole);
    assert.match(whole.stdout, /^yaml-errors: 1$/m);
    assertCounter(whole.stdout, "broken-wikilinks", 1);
    assertCounter(whole.stdout, "true-orphans-md", 1);
    assertCounter(whole.stdout, "unlinked-base-files", 1);

    const result = runValidator("scoped_research_sibling_isolation", ["--scope", "Domains/Healthy", "--profile", "research"]);

    assertSuccess(result);
    assertCounters(result.stdout);
    assert.doesNotMatch(result.stdout, /Domains\/Broken/);
  },

  function researchProfileKeepsAllInScopeFatalDefects() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "scoped_research_sibling_isolation"), vault);
      fs.appendFileSync(path.join(vault, "00 Index.md"), "\n- [[Domains/Healthy/Broken]]\n- [[Domains/Healthy/Bad YAML]]\n");
      writeFile(vault, "Domains/Healthy/Broken.md", "- [[Missing In Healthy]]\n");
      writeFile(vault, "Domains/Healthy/Orphan.md", "# Orphan\n");
      writeFile(vault, "Domains/Healthy/Bad YAML.md", "---\ntags: [unterminated\n---\n\n- [[00 Index]]\n");
      writeFile(vault, "Domains/Healthy/Bases/Unlinked.base", "views: []\n");

      const result = runValidatorPath(vault, ["--scope", "Domains/Healthy", "--profile", "research"]);
      assertFailure(result);
      assert.match(result.stdout, /^yaml-errors: 1$/m);
      assertCounter(result.stdout, "broken-wikilinks", 1);
      assertCounter(result.stdout, "true-orphans-md", 1);
      assertCounter(result.stdout, "unlinked-base-files", 1);
      assert.doesNotMatch(result.stdout, /Domains\/Broken/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function rawSourceRequiredFieldsAndEnumsAreValidated() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "research_schema_valid"), vault);
      writeFile(vault, "Domain/Shared.md", `---
type: raw-source
research_boundary: "[[Domain/Research Boundary]]"
evidence_role: invented-role
origin: [not, scalar]
compilation_status: invented-state
---

- [[00 Index]]
`);
      const result = runValidatorPath(vault, ["--scope", "Domain", "--profile", "research"]);
      assertSuccess(result);
      for (const field of ["source_type", "locator", "captured", "derived_from"]) {
        assert.match(result.stdout, new RegExp(`missing required ${field}`));
      }
      assert.match(result.stdout, /origin must be a top-level scalar/);
      assert.match(result.stdout, /unsupported evidence_role/);
      assert.match(result.stdout, /unsupported compilation_status/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function malformedSupportedScopeMembershipWarns() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "research_schema_valid"), vault);
      fs.appendFileSync(path.join(vault, "Domain/Compiled Hub.md"), "- [[Domain/Missing Membership]]\n- [[Domain/Bare Membership]]\n");
      writeFile(vault, "Domain/Missing Membership.md", "---\ntype: research\nderived_from: []\ninquiries: []\n---\n\n- [[00 Index]]\n");
      writeFile(vault, "Domain/Bare Membership.md", "---\ntype: research\nresearch_boundary: \"[[Research Boundary]]\"\nderived_from: []\ninquiries: []\n---\n\n- [[00 Index]]\n");
      const result = runValidatorPath(vault, ["--scope", "Domain", "--profile", "research"]);
      assertSuccess(result);
      assert.match(result.stdout, /Missing Membership\.md: research_boundary must be a path-qualified scalar link/);
      assert.match(result.stdout, /Bare Membership\.md: research_boundary must be a path-qualified scalar link/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function compiledSynthesisAndInquiryContractsAreValidated() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "research_schema_valid"), vault);
      fs.appendFileSync(path.join(vault, "Domain/Compiled Hub.md"), "- [[Domain/Bad Research]]\n");
      fs.appendFileSync(path.join(vault, "Domain/Synthesis Hub.md"), "- [[Domain/Bad Synthesis]]\n");
      fs.appendFileSync(path.join(vault, "Domain/Inquiry Hub.md"), "- [[Domain/Bad Inquiry]]\n");
      writeFile(vault, "Domain/Bad Research.md", "---\ntype: research\nresearch_boundary: \"[[Domain/Research Boundary]]\"\nderived_from: \"[[Domain/Shared]]\"\ninquiries: bad\n---\n\n- [[00 Index]]\n");
      writeFile(vault, "Domain/Bad Synthesis.md", "---\ntype: research-synthesis\nresearch_boundary: \"[[Domain/Research Boundary]]\"\nderived_from: []\n---\n\n- [[00 Index]]\n");
      writeFile(vault, "Domain/Bad Inquiry.md", "---\ntype: research-inquiry\nstatus: unknown\nresearch_boundary: \"[[Domain/Research Boundary]]\"\nderived_from: []\n---\n\n# Inquiry\n\n- [[00 Index]]\n");
      const result = runValidatorPath(vault, ["--scope", "Domain", "--profile", "research"]);
      assertSuccess(result);
      assert.match(result.stdout, /Bad Research\.md: derived_from must be a flat scalar link list/);
      assert.match(result.stdout, /Bad Research\.md: inquiries must be a flat scalar link list/);
      assert.match(result.stdout, /Bad Synthesis\.md: missing required inquiries/);
      assert.match(result.stdout, /Bad Inquiry\.md: missing required inquiry_id/);
      assert.match(result.stdout, /Bad Inquiry\.md: unsupported inquiry status: unknown/);
      assert.match(result.stdout, /Bad Inquiry\.md: missing required section Supporting Evidence/);
      assert.match(result.stdout, /Bad Inquiry\.md: missing required section Disposition History/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function forbiddenProvenanceDoesNotCompileRawSource() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "research_schema_valid"), vault);
      const note = path.join(vault, "Domain/Compiled Note.md");
      fs.writeFileSync(note, fs.readFileSync(note, "utf8").replace("[[Shared]]", "[[Domain/Raw Hub]]"));
      const result = runValidatorPath(vault, ["--scope", "Domain", "--profile", "research"]);
      assertSuccess(result);
      assert.match(result.stdout, /derived_from target is not a canonical research artifact/);
      assertCounter(result.stdout, "uncompiled-raw-source-warnings", 1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function exactRejectsButDeclaredRollupAcceptsChildProvenance() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "research_schema_valid"), vault);
      addChildResearchBoundary(vault);
      const note = path.join(vault, "Domain/Compiled Note.md");
      fs.writeFileSync(note, fs.readFileSync(note, "utf8").replace("[[Shared]]", "[[Domain/Child/Raw]]"));

      const exact = runValidatorPath(vault, ["--scope", "Domain", "--profile", "research"]);
      assertSuccess(exact);
      assert.match(exact.stdout, /derived_from target belongs outside the allowed boundary set/);

      const descriptor = path.join(vault, "Domain/Research Boundary.md");
      fs.writeFileSync(descriptor, fs.readFileSync(descriptor, "utf8")
        .replace("view_mode: exact", "view_mode: rollup")
        .replace("rollup_boundaries: []", "rollup_boundaries:\n  - \"[[Domain/Child/Boundary]]\""));
      fs.appendFileSync(path.join(vault, "Domain/Raw Hub.md"), "- [[Domain/Child/Raw]]\n");
      const rollup = runValidatorPath(vault, ["--scope", "Domain", "--profile", "research"]);
      assertSuccess(rollup);
      assert.doesNotMatch(rollup.stdout, /derived_from target belongs outside the allowed boundary set/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function scopedResearchExcludesSiblingOriginEvenWhenTargetIsInScope() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "research_schema_valid"), vault);
      const siblingBoundary = addEmptyResearchBoundary(vault, "Other", "Boundary", "other-research");
      fs.appendFileSync(path.join(vault, "Other/Compiled Hub.md"), "- [[Other/Cross Boundary Note]]\n");
      writeFile(vault, "Other/Cross Boundary Note.md", `---
type: research
research_boundary: "[[${siblingBoundary}]]"
derived_from:
  - "[[Domain/Shared]]"
inquiries: []
---

- [[00 Index]]
`);

      const whole = runValidatorPath(vault);
      assertSuccess(whole);
      assert.match(whole.stdout, /Other\/Cross Boundary Note\.md: derived_from target belongs outside the allowed boundary set: Domain\/Shared\.md/);

      const scoped = runValidatorPath(vault, ["--scope", "Domain", "--profile", "research"]);
      assertSuccess(scoped);
      assertCounter(scoped.stdout, "research-provenance-warnings", 0);
      assert.doesNotMatch(scoped.stdout, /Other\/Cross Boundary Note/);
      for (const name of COUNTERS) {
        const wholeMatch = whole.stdout.match(new RegExp(`^${name}: (\\d+)$`, "m"));
        const scopedMatch = scoped.stdout.match(new RegExp(`^${name}: (\\d+)$`, "m"));
        assert.ok(Number(scopedMatch[1]) <= Number(wholeMatch[1]), `${name} scoped count must be a whole-vault subset`);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function duplicateBoundaryIdentityAndScopeAreDeterministicAndScoped() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "research_schema_valid"), vault);
      const duplicateScope = path.join(vault, "Domain/Second Boundary.md");
      fs.writeFileSync(duplicateScope, fs.readFileSync(path.join(vault, "Domain/Research Boundary.md"), "utf8")
        .replace("boundary_id: domain-research", "boundary_id: second-domain-research"));
      fs.appendFileSync(path.join(vault, "00 Index.md"), "\n- [[Domain/Second Boundary]]\n");
      addEmptyResearchBoundary(vault, "Other", "Boundary", "domain-research");

      const whole = runValidatorPath(vault);
      assertSuccess(whole);
      assert.match(whole.stdout, /Domain\/Research Boundary\.md: duplicate boundary_id domain-research also declared by Other\/Boundary\.md/);
      assert.match(whole.stdout, /Other\/Boundary\.md: duplicate boundary_id domain-research also declared by Domain\/Research Boundary\.md/);
      assert.match(whole.stdout, /Domain\/Research Boundary\.md: duplicate canonical scope_path Domain also declared by Domain\/Second Boundary\.md/);
      assert.match(whole.stdout, /Domain\/Second Boundary\.md: duplicate canonical scope_path Domain also declared by Domain\/Research Boundary\.md/);

      const scoped = runValidatorPath(vault, ["--scope", "Domain", "--profile", "research"]);
      assertSuccess(scoped);
      assert.match(scoped.stdout, /Domain\/Research Boundary\.md: duplicate boundary_id domain-research also declared by Other\/Boundary\.md/);
      assert.doesNotMatch(scoped.stdout, /^Other\/Boundary\.md: duplicate boundary_id/m);
      assert.match(scoped.stdout, /Domain\/Research Boundary\.md: duplicate canonical scope_path Domain/);
      assert.match(scoped.stdout, /Domain\/Second Boundary\.md: duplicate canonical scope_path Domain/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function equivalentScopePathSpellingsShareOneCanonicalDescriptorKey() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "research_schema_valid"), vault);
      const original = fs.readFileSync(path.join(vault, "Domain/Research Boundary.md"), "utf8");
      writeFile(vault, "Elsewhere/Dot Boundary.md", original
        .replace("boundary_id: domain-research", "boundary_id: dot-domain")
        .replace("scope_path: Domain", "scope_path: ./Domain/."));
      writeFile(vault, "Elsewhere/Repeated Boundary.md", original
        .replace("boundary_id: domain-research", "boundary_id: repeated-domain")
        .replace("scope_path: Domain", "scope_path: Domain//"));
      fs.symlinkSync("Domain", path.join(vault, "AliasDomain"), "dir");
      writeFile(vault, "Elsewhere/Alias Boundary.md", original
        .replace("boundary_id: domain-research", "boundary_id: alias-domain")
        .replace("scope_path: Domain", "scope_path: AliasDomain"));
      fs.appendFileSync(path.join(vault, "00 Index.md"), "\n- [[Elsewhere/Alias Boundary]]\n- [[Elsewhere/Dot Boundary]]\n- [[Elsewhere/Repeated Boundary]]\n");

      const whole = runValidatorPath(vault);
      assertSuccess(whole);
      assert.match(whole.stdout, /Elsewhere\/Dot Boundary\.md: duplicate canonical scope_path Domain also declared by Domain\/Research Boundary\.md, Elsewhere\/Alias Boundary\.md, Elsewhere\/Repeated Boundary\.md/);
      assert.match(whole.stdout, /Elsewhere\/Repeated Boundary\.md: duplicate canonical scope_path Domain also declared by Domain\/Research Boundary\.md, Elsewhere\/Alias Boundary\.md, Elsewhere\/Dot Boundary\.md/);

      const scoped = runValidatorPath(vault, ["--scope", "Domain", "--profile", "research"]);
      assertSuccess(scoped);
      assert.match(scoped.stdout, /Elsewhere\/Alias Boundary\.md: duplicate canonical scope_path Domain/);
      assert.match(scoped.stdout, /Elsewhere\/Dot Boundary\.md: duplicate canonical scope_path Domain/);
      assert.match(scoped.stdout, /Elsewhere\/Repeated Boundary\.md: duplicate canonical scope_path Domain/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function nearestScopeBareLinksCreditOneTarget() {
    const result = runValidator("research_schema_valid", ["--scope", "Domain", "--profile", "research"]);

    assertSuccess(result);
    assertCounter(result.stdout, "ambiguous-wikilink-warnings", 0);
    assertCounter(result.stdout, "uncompiled-raw-source-warnings", 0);
  },

  function researchNavigationRequiresQualifiedMemberLinks() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "research_schema_valid"), vault);
      const hub = path.join(vault, "Domain/Compiled Hub.md");
      fs.writeFileSync(hub, fs.readFileSync(hub, "utf8").replace("[[Domain/Compiled Note]]", "[[Compiled Note]]"));

      const result = runValidatorPath(vault, ["--scope", "Domain", "--profile", "research"]);
      assertSuccess(result);
      assertCounter(result.stdout, "research-hub-warnings", 1);
      assert.match(result.stdout, /does not link member/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function invalidRollupMustNameDescendantDescriptor() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "research_schema_valid"), vault);
      const descriptor = path.join(vault, "Domain/Research Boundary.md");
      const changed = fs.readFileSync(descriptor, "utf8")
        .replace("view_mode: exact", "view_mode: rollup")
        .replace("rollup_boundaries: []", "rollup_boundaries:\n  - \"[[Other/Shared]]\"");
      fs.writeFileSync(descriptor, changed);

      const result = runValidatorPath(vault, ["--scope", "Domain", "--profile", "research"]);
      assertSuccess(result);
      assertCounter(result.stdout, "research-boundary-warnings", 1);
      assert.match(result.stdout, /not a declared descendant descriptor/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function scopedRoutingKeepsRootMatrixObligation() {
    const result = runValidator("routing_matrix_missing_scope_warning", ["--scope", "Projects/Alpha", "--profile", "research"]);
    assertSuccess(result);
    assertCounter(result.stdout, "routing-matrix-warnings", 1);
    assert.match(result.stdout, /Agent\/Task Routing Matrix\.md does not link scope hub Projects\/Alpha\/00 Alpha Index\.md/);
  },

  function nearestParentRoutingMatrixOverridesRoot() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "routing_matrix_missing_scope_warning"), vault);
      fs.appendFileSync(path.join(vault, "Projects/00 Projects Index.md"), "\n- [[Projects/Agent/Task Routing Matrix]]\n");
      writeFile(vault, "Projects/Agent/Task Routing Matrix.md", "# Projects Routing\n\n- [[Projects/00 Projects Index]]\n");
      const result = runValidatorPath(vault, ["--scope", "Projects/Alpha", "--profile", "research"]);
      assertSuccess(result);
      assertCounter(result.stdout, "routing-matrix-warnings", 1);
      assert.match(result.stdout, /Projects\/Agent\/Task Routing Matrix\.md does not link scope hub Projects\/Alpha\/00 Alpha Index\.md/);
      assert.doesNotMatch(result.stdout, /^Agent\/Task Routing Matrix\.md does not link scope hub/m);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function localRoutingOverrideCoversScopeAndNestedChildUsesIt() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "routing_matrix_missing_scope_warning"), vault);
      fs.appendFileSync(path.join(vault, "Projects/Alpha/00 Alpha Index.md"), "\n- [[Projects/Alpha/Agent/Task Routing Matrix]]\n- [[Projects/Alpha/Child/00 Child Index]]\n");
      writeFile(vault, "Projects/Alpha/Agent/Task Routing Matrix.md", "# Local Routing\n\n- [[Projects/Alpha/00 Alpha Index]]\n");
      writeFile(vault, "Projects/Alpha/Child/AGENTS.md", "Inherits parent rules.\n\n- [[Projects/Alpha/Child/00 Child Index]]\n");
      writeFile(vault, "Projects/Alpha/Child/00 Child Index.md", "---\ntype: scope-index\n---\n\n- [[Projects/Alpha/00 Alpha Index]]\n");
      const parent = runValidatorPath(vault, ["--scope", "Projects/Alpha", "--profile", "research"]);
      assertSuccess(parent);
      assertCounter(parent.stdout, "routing-matrix-warnings", 1);
      assert.match(parent.stdout, /Projects\/Alpha\/Agent\/Task Routing Matrix\.md does not link scope hub Projects\/Alpha\/Child\/00 Child Index\.md/);
      assert.doesNotMatch(parent.stdout, /does not link scope hub Projects\/Alpha\/00 Alpha Index\.md/);

      const child = runValidatorPath(vault, ["--scope", "Projects/Alpha/Child", "--profile", "research"]);
      assertSuccess(child);
      assertCounter(child.stdout, "routing-matrix-warnings", 1);
      assert.match(child.stdout, /Projects\/Alpha\/Agent\/Task Routing Matrix\.md/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function bareLinksUseExactAncestorWalkNotSiblingPrefix() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      fs.mkdirSync(vault, { recursive: true });
      writeFile(vault, "00 Index.md", "- [[Domain/Deep/Note]]\n- [[Domain/Shared]]\n- [[Domain/Deep/Sub/Shared]]\n");
      writeFile(vault, "Domain/Deep/Note.md", "- [[Shared]]\n- [[00 Index]]\n");
      writeFile(vault, "Domain/Shared.md", "- [[00 Index]]\n");
      writeFile(vault, "Domain/Deep/Sub/Shared.md", "- [[00 Index]]\n");
      const result = runValidatorPath(vault);
      assertSuccess(result);
      assertCounter(result.stdout, "ambiguous-wikilink-warnings", 0);
      assertCounter(result.stdout, "true-orphans-md", 0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function sameScopeSiblingBareLinksStayAmbiguousAndUncredited() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      fs.mkdirSync(vault, { recursive: true });
      writeFile(vault, "00 Index.md", "- [[Domain/Note]]\n");
      writeFile(vault, "Domain/Note.md", "- [[Shared]]\n- [[00 Index]]\n");
      writeFile(vault, "Domain/Raw/Shared.md", "# Raw Shared\n");
      writeFile(vault, "Domain/Other/Shared.md", "# Other Shared\n");
      const result = runValidatorPath(vault);
      assertFailure(result);
      assertCounter(result.stdout, "ambiguous-wikilink-warnings", 1);
      assertCounter(result.stdout, "true-orphans-md", 2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function navigationBareAmbiguityWarnsEvenWithAncestorCandidate() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      fs.mkdirSync(vault, { recursive: true });
      writeFile(vault, "00 Index.md", "- [[Domain/00 Domain Index]]\n- [[Domain/Shared]]\n- [[Other/Shared]]\n");
      writeFile(vault, "Domain/00 Domain Index.md", "- [[Shared]]\n- [[00 Index]]\n");
      writeFile(vault, "Domain/Shared.md", "- [[00 Index]]\n");
      writeFile(vault, "Other/Shared.md", "- [[00 Index]]\n");
      const result = runValidatorPath(vault);
      assertSuccess(result);
      assertCounter(result.stdout, "ambiguous-wikilink-warnings", 1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function agentsNavigationBareAmbiguityAlsoWarns() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      fs.mkdirSync(vault, { recursive: true });
      writeFile(vault, "00 Index.md", "- [[Domain/AGENTS]]\n- [[Domain/Shared]]\n- [[Other/Shared]]\n");
      writeFile(vault, "Domain/AGENTS.md", "Inherits parent rules.\n\n- [[Shared]]\n- [[00 Index]]\n");
      writeFile(vault, "Domain/Shared.md", "- [[00 Index]]\n");
      writeFile(vault, "Other/Shared.md", "- [[00 Index]]\n");
      const result = runValidatorPath(vault);
      assertSuccess(result);
      assertCounter(result.stdout, "ambiguous-wikilink-warnings", 1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function nestedArtifactSchemaWarnsWithoutYamlFailure() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "research_schema_valid"), vault);
      const note = path.join(vault, "Domain/Compiled Note.md");
      const changed = fs.readFileSync(note, "utf8")
        .replace("derived_from:\n  - \"[[Shared]]\"", "derived_from:\n  source: \"[[Shared]]\"");
      fs.writeFileSync(note, changed);

      const result = runValidatorPath(vault, ["--scope", "Domain", "--profile", "research"]);
      assertSuccess(result);
      assert.match(result.stdout, /^yaml-ok$/m);
      assertCounter(result.stdout, "research-provenance-warnings", 1);
      assert.match(result.stdout, /nested schema value/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function descriptorScalarFieldsRejectFlatLists() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "research_schema_valid"), vault);
      const descriptor = path.join(vault, "Domain/Research Boundary.md");
      let text = fs.readFileSync(descriptor, "utf8")
        .replace("boundary_id: domain-research", "boundary_id: [domain-research]")
        .replace("scope_path: Domain", "scope_path: [Domain]")
        .replace('raw_hub: "[[Domain/Raw Hub]]"', 'raw_hub: ["[[Domain/Raw Hub]]"]')
        .replace('compiled_hub: "[[Domain/Compiled Hub]]"', 'compiled_hub: ["[[Domain/Compiled Hub]]"]')
        .replace('inquiry_hub: "[[Domain/Inquiry Hub]]"', 'inquiry_hub: ["[[Domain/Inquiry Hub]]"]')
        .replace('synthesis_hub: "[[Domain/Synthesis Hub]]"', 'synthesis_hub: ["[[Domain/Synthesis Hub]]"]')
        .replace("view_mode: exact", "view_mode: [exact]");
      text = text.replace("rollup_boundaries: []", 'thread_hub: ["[[Domain/Thread Hub]]"]\nrollup_boundaries: []');
      fs.writeFileSync(descriptor, text);
      writeFile(vault, "Domain/Thread Hub.md", "- [[Domain/Research Boundary]]\n");

      const result = runValidatorPath(vault, ["--scope", "Domain", "--profile", "research"]);
      assertSuccess(result);
      for (const field of ["boundary_id", "scope_path", "raw_hub", "compiled_hub", "inquiry_hub", "synthesis_hub", "thread_hub", "view_mode"]) {
        assert.match(result.stdout, new RegExp(`${field} must be a top-level scalar`));
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function researchSchemaVersionRejectsAFlatListKind() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "research_schema_valid"), vault);
      const descriptor = path.join(vault, "Domain/Research Boundary.md");
      fs.writeFileSync(descriptor, fs.readFileSync(descriptor, "utf8").replace("research_schema: 1", "research_schema: [1]"));
      writeFile(vault, "Domain/Malformed Type.md", `---
type: [research-boundary]
research_schema: 1
boundary_id: malformed-type
scope_path: Domain
raw_hub: "[[Domain/Raw Hub]]"
compiled_hub: "[[Domain/Compiled Hub]]"
inquiry_hub: "[[Domain/Inquiry Hub]]"
synthesis_hub: "[[Domain/Synthesis Hub]]"
view_mode: exact
rollup_boundaries: []
---

- [[00 Index]]
`);
      fs.appendFileSync(path.join(vault, "00 Index.md"), "\n- [[Domain/Malformed Type]]\n");
      const result = runValidatorPath(vault, ["--scope", "Domain", "--profile", "research"]);
      assertSuccess(result);
      assert.match(result.stdout, /Research Boundary\.md: research_schema must be a top-level scalar/);
      assert.match(result.stdout, /Malformed Type\.md: type must be a top-level scalar/);
      assertCounter(result.stdout, "research-provenance-warnings", 0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function inlineFlatListPreservesQuotedWikilinkCommas() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "research_schema_valid"), vault);
      fs.renameSync(path.join(vault, "Domain/Shared.md"), path.join(vault, "Domain/Shared, One.md"));
      const hub = path.join(vault, "Domain/Raw Hub.md");
      fs.writeFileSync(hub, fs.readFileSync(hub, "utf8").replace("[[Domain/Shared]]", "[[Domain/Shared, One]]"));
      const note = path.join(vault, "Domain/Compiled Note.md");
      fs.writeFileSync(note, fs.readFileSync(note, "utf8").replace("derived_from:\n  - \"[[Shared]]\"", 'derived_from: ["[[Domain/Shared, One]]"]'));

      const result = runValidatorPath(vault, ["--scope", "Domain", "--profile", "research"]);
      assertSuccess(result);
      assertCounters(result.stdout);

      fs.writeFileSync(note, fs.readFileSync(note, "utf8").replace('derived_from: ["[[Domain/Shared, One]]"]', "derived_from: ['[[Domain/Shared, One]]']"));
      const singleQuoted = runValidatorPath(vault, ["--scope", "Domain", "--profile", "research"]);
      assertSuccess(singleQuoted);
      assertCounters(singleQuoted.stdout);

      fs.writeFileSync(note, fs.readFileSync(note, "utf8").replace("derived_from: ['[[Domain/Shared, One]]']", "derived_from: [ [[Domain/Shared, One]] ]"));
      const unquoted = runValidatorPath(vault, ["--scope", "Domain", "--profile", "research"]);
      assertSuccess(unquoted);
      assertCounters(unquoted.stdout);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function unmatchedInlineListQuoteRemainsYamlFatal() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "research_schema_valid"), vault);
      const note = path.join(vault, "Domain/Compiled Note.md");
      fs.writeFileSync(note, fs.readFileSync(note, "utf8").replace("derived_from:\n  - \"[[Shared]]\"", 'derived_from: ["[[Domain/Shared]] ]'));
      const result = runValidatorPath(vault, ["--scope", "Domain", "--profile", "research"]);
      assertFailure(result);
      assert.match(result.stdout, /^yaml-errors: 1$/m);
      assert.match(result.stdout, /YAML syntax: unterminated quote/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function inlineNestedCollectionsRemainUnsupportedResearchValues() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scope-validator-"));
    const vault = path.join(dir, "vault");
    try {
      copyDir(path.join(FIXTURES, "research_schema_valid"), vault);
      const descriptor = path.join(vault, "Domain/Research Boundary.md");
      fs.writeFileSync(descriptor, fs.readFileSync(descriptor, "utf8").replace("rollup_boundaries: []", "rollup_boundaries: [{ child: Domain }]") );
      const note = path.join(vault, "Domain/Compiled Note.md");
      fs.writeFileSync(note, fs.readFileSync(note, "utf8").replace("derived_from:\n  - \"[[Shared]]\"", "derived_from: [ [nested] ]"));

      const result = runValidatorPath(vault, ["--scope", "Domain", "--profile", "research"]);
      assertSuccess(result);
      assert.match(result.stdout, /Research Boundary\.md: nested schema value is not supported for rollup_boundaries/);
      assert.match(result.stdout, /Compiled Note\.md: nested schema value is not supported for derived_from/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },

  function invalidScopesAndProfilesAreRejected() {
    const fixture = path.join(FIXTURES, "research_schema_valid");
    for (const args of [
      ["--scope", "/absolute"],
      ["--scope", "../outside"],
      ["--scope", "Missing"],
      ["--scope", "00 Index.md"],
      ["--profile", "research"],
      ["--scope", "Domain", "--profile", "unsupported"],
    ]) {
      const result = runValidatorPath(fixture, args);
      assertFailure(result);
      assert.match(result.stderr, /^validator-error:/m);
    }
  },

  function noFlagCounterOrderAndFatalSemanticsStayCompatible() {
    const result = runValidator("root_only_legacy_pass");
    assertSuccess(result);
    const counterNames = result.stdout.split("\n")
      .filter((line) => /^[a-z][a-z-]+: \d+$/u.test(line))
      .map((line) => line.split(":", 1)[0]);
    assert.deepStrictEqual(counterNames, COUNTERS);

    const fatal = runValidator("duplicate_basename_wikilink_ambiguity_warning");
    assertSuccess(fatal);
    assertCounter(fatal.stdout, "ambiguous-wikilink-warnings", 1);
  },
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} tests passed`);
