#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const TEMPLATES = path.resolve(__dirname, "../assets/templates");
const RESEARCH_TYPES = new Set([
  "raw-source",
  "research",
  "research-inquiry",
  "research-synthesis",
]);
const EVIDENCE_ROLES = new Set([
  "external-evidence",
  "first-party-evidence",
  "context",
  "hypothesis",
  "generated-analysis",
  "derivative-copy",
]);
const COMPILATION_STATES = new Set(["pending", "compiled", "source-only", "needs-review"]);

function readTemplate(name) {
  return fs.readFileSync(path.join(TEMPLATES, name), "utf8");
}

function replaceAll(text, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    text,
  );
}

function setProperty(text, key, yamlValue) {
  const line = new RegExp(`^${key}:.*$`, "m");
  assert.match(text, line, `template is missing ${key}`);
  return text.replace(line, `${key}: ${yamlValue}`);
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "[]") return [];
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function frontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  assert.ok(match, "note must have YAML frontmatter");
  const result = {};
  let listKey = null;

  for (const line of match[1].split("\n")) {
    if (/^  - /.test(line)) {
      assert.ok(listKey, `orphan list item: ${line}`);
      result[listKey].push(parseScalar(line.slice(4)));
      continue;
    }
    assert.doesNotMatch(line, /^\s+\w+:/, "nested YAML objects are not schema-v1");
    const pair = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):(?:\s*(.*))?$/);
    assert.ok(pair, `unsupported frontmatter line: ${line}`);
    const [, key, raw = ""] = pair;
    if (raw === "") {
      result[key] = [];
      listKey = key;
    } else {
      result[key] = parseScalar(raw);
      listKey = null;
    }
  }
  return result;
}

function parseResearchBaseFilters(text) {
  const lines = text.split("\n");
  const filtersIndex = lines.indexOf("filters:");
  assert.notStrictEqual(filtersIndex, -1, "Base must declare filters");
  assert.strictEqual(lines[filtersIndex + 1], "  and:", "Base filters must use a top-level and");

  const and = [];
  for (let index = filtersIndex + 2; index < lines.length && lines[index] !== "views:";) {
    if (lines[index] === "") {
      index += 1;
      continue;
    }
    const scalar = lines[index].match(/^    - '(.+)'$/);
    if (scalar) {
      and.push(scalar[1]);
      index += 1;
      continue;
    }
    assert.strictEqual(lines[index], "    - or:", `unexpected Base filter structure: ${lines[index]}`);
    const or = [];
    index += 1;
    while (index < lines.length) {
      const nested = lines[index].match(/^        - '(.+)'$/);
      if (!nested) break;
      or.push(nested[1]);
      index += 1;
    }
    assert.ok(or.length > 0, "nested type or must not be empty");
    and.push({ or });
  }
  return { and };
}

function linkTarget(value) {
  const match = typeof value === "string" && value.match(/^\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]$/);
  return match ? match[1] : null;
}

function write(root, relativePath, text) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
  return target;
}

function noteFromTemplate(name, replacements, properties = {}) {
  let text = replaceAll(readTemplate(name), {
    title: "Fixture Note",
    date: "2026-07-15",
    boundary_id: "fixture-boundary",
    scope_path: "Domains/Fixture",
    raw_hub: "Maps/Raw Hub",
    compiled_hub: "Maps/Compiled Hub",
    inquiry_hub: "Maps/Inquiry Hub",
    synthesis_hub: "Maps/Synthesis Hub",
    thread_hub: "Maps/Thread Hub",
    research_boundary: "Maps/Fixture Boundary",
    inquiry_id: "fixture-inquiry",
    ...replacements,
  });
  for (const [key, value] of Object.entries(properties)) {
    text = setProperty(text, key, value);
  }
  return text;
}

function generatedFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-research-templates-"));
  const rootBoundary = "Programs/Atlas/Maps/Atlas Research Boundary";
  const childBoundary = "Experiments/Nested/Maps/Orbit Research Boundary";
  const rootBoundaryLink = `[[${rootBoundary}]]`;
  const childBoundaryLink = `[[${childBoundary}]]`;
  const rootHubs = {
    raw_hub: "Programs/Atlas/Maps/Evidence Registry",
    compiled_hub: "Programs/Atlas/Maps/Knowledge Registry",
    inquiry_hub: "Programs/Atlas/Maps/Inquiry Registry",
    synthesis_hub: "Programs/Atlas/Maps/Synthesis Registry",
  };
  const childHubs = {
    raw_hub: "Experiments/Nested/Maps/Evidence Registry",
    compiled_hub: "Experiments/Nested/Maps/Knowledge Registry",
    inquiry_hub: "Experiments/Nested/Maps/Inquiry Registry",
    synthesis_hub: "Experiments/Nested/Maps/Synthesis Registry",
  };

  write(
    root,
    `${rootBoundary}.md`,
    noteFromTemplate("Research Boundary.md", {
      title: "Atlas Research Boundary",
      boundary_id: "atlas-research",
      scope_path: "Programs/Atlas",
      ...rootHubs,
    }, { view_mode: "rollup", rollup_boundaries: `\n  - "${childBoundaryLink}"` }),
  );
  write(
    root,
    `${childBoundary}.md`,
    noteFromTemplate("Research Boundary.md", {
      title: "Orbit Research Boundary",
      boundary_id: "orbit-research",
      scope_path: "Experiments/Nested",
      ...childHubs,
    }),
  );

  for (const hub of [...Object.values(rootHubs), ...Object.values(childHubs)]) {
    write(root, `${hub}.md`, `# ${path.basename(hub)}\n`);
  }

  const rawPath = "Imports/Interviews/Atlas Operator Interview";
  const researchPath = "Programs/Atlas/Knowledge/Operator Constraints";
  const inquiryPath = "Open Loops/Atlas Adoption Inquiry";
  const synthesisPath = "Programs/Atlas/Maps/Atlas Current Synthesis";
  const decisionPath = "Strategy/2026-07-15 Atlas Rollout Decision";
  const evidenceCases = [
    {
      path: rawPath,
      role: "first-party-evidence",
      state: "compiled",
      sourceType: "meeting",
      origin: "Atlas operator interview",
      derivedFrom: [],
    },
    {
      path: "Library/Vendor Benchmarks",
      role: "external-evidence",
      state: "source-only",
      sourceType: "dataset",
      origin: "Vendor benchmark dataset",
      derivedFrom: [],
    },
    {
      path: "Background/Legacy Constraints",
      role: "context",
      state: "needs-review",
      sourceType: "notes",
      origin: "Legacy context notes",
      derivedFrom: [],
    },
    {
      path: "Working/Hypothesized Adoption Risk",
      role: "hypothesis",
      state: "pending",
      sourceType: "human-note",
      origin: "Researcher hypothesis",
      derivedFrom: [],
    },
    {
      path: "Generated/Interview Analysis",
      role: "generated-analysis",
      state: "compiled",
      sourceType: "generated-analysis",
      origin: "Shared analyst output",
      derivedFrom: [rawPath],
    },
    {
      path: "Mirrors/Interview Analysis Copy",
      role: "derivative-copy",
      state: "source-only",
      sourceType: "mirror",
      origin: "Shared analyst output",
      derivedFrom: ["Generated/Interview Analysis"],
    },
  ];
  for (const evidence of evidenceCases) {
    write(root, `${evidence.path}.md`, noteFromTemplate("Raw Source Note.md", {}, {
      research_boundary: `"${rootBoundaryLink}"`,
      source_type: evidence.sourceType,
      evidence_role: evidence.role,
      origin: `"${evidence.origin}"`,
      compilation_status: evidence.state,
      derived_from: evidence.derivedFrom.length === 0
        ? "[]"
        : `\n${evidence.derivedFrom.map((upstream) => `  - "[[${upstream}]]"`).join("\n")}`,
    }));
  }
  write(root, `${researchPath}.md`, noteFromTemplate("Research Note.md", {}, {
    research_boundary: `"${rootBoundaryLink}"`,
    derived_from: `\n  - "[[${rawPath}]]"`,
    inquiries: `\n  - "[[${inquiryPath}]]"`,
  }));
  write(root, `${inquiryPath}.md`, noteFromTemplate("Research Inquiry.md", {
    research_boundary: rootBoundary,
    inquiry_id: "atlas-adoption",
  }, {
    derived_from: `\n  - "[[${rawPath}]]"`,
  }));
  write(root, `${synthesisPath}.md`, noteFromTemplate("Research Synthesis.md", {}, {
    research_boundary: `"${rootBoundaryLink}"`,
    derived_from: `\n  - "[[${researchPath}]]"`,
    inquiries: `\n  - "[[${inquiryPath}]]"`,
    promoted_to: `\n  - "[[${decisionPath}]]"`,
  }));
  write(root, `${decisionPath}.md`, noteFromTemplate("Decision Note.md", {}, {
    research_basis: `\n  - "[[${synthesisPath}]]"`,
  }));
  write(root, "Experiments/Nested/Loose Evidence/Orbit Observation.md", noteFromTemplate("Raw Source Note.md", {}, {
    research_boundary: `"${childBoundaryLink}"`,
    source_type: "observation",
    evidence_role: "first-party-evidence",
    compilation_status: "pending",
  }));
  write(root, "Programs/Atlas/Product/Atlas Brief.md", `---\ntitle: Atlas Brief\ntype: product\nresearch_basis:\n  - "[[${synthesisPath}]]"\n---\n`);

  const base = replaceAll(readTemplate("Research Pipeline.base"), {
    research_boundary: rootBoundary,
  });
  write(root, "Views/Atlas Evidence.base", base);

  return {
    root,
    rootBoundary,
    childBoundary,
    rawPath,
    researchPath,
    inquiryPath,
    synthesisPath,
    decisionPath,
    evidenceCases,
    base,
  };
}

function markdownNotes(root) {
  const found = [];
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.name.endsWith(".md")) found.push(full);
    }
  }
  visit(root);
  return found;
}

function assertLinksResolve(root, files) {
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g)) {
      assert.ok(fs.existsSync(path.join(root, `${match[1]}.md`)), `${file} has broken link ${match[1]}`);
    }
  }
}

function exactMembers(notes, descriptorPath) {
  const expected = `[[${descriptorPath}]]`;
  return notes.filter((file) => {
    const text = fs.readFileSync(file, "utf8");
    if (!text.startsWith("---\n")) return false;
    const data = frontmatter(text);
    return RESEARCH_TYPES.has(data.type) && data.research_boundary === expected;
  });
}

function provenanceRoots(notePath, notesByPath, visiting = new Set()) {
  assert.ok(!visiting.has(notePath), `provenance cycle at ${notePath}`);
  const data = notesByPath.get(notePath);
  assert.ok(data, `missing provenance note ${notePath}`);
  if (data.derived_from.length === 0) return new Set([notePath]);
  const nextVisiting = new Set(visiting).add(notePath);
  const roots = new Set();
  for (const upstream of data.derived_from) {
    const target = linkTarget(upstream);
    assert.ok(target, `invalid derived_from link ${upstream}`);
    for (const root of provenanceRoots(target, notesByPath, nextVisiting)) roots.add(root);
  }
  return roots;
}

function testTemplateSchemaAndGeneratedFixture() {
  for (const name of ["Research Boundary.md", "Research Inquiry.md", "Research Synthesis.md"])
    assert.ok(fs.existsSync(path.join(TEMPLATES, name)), `${name} must be shipped`);

  const rootIndex = readTemplate("00 Index.md");
  assert.match(rootIndex, /^type: scope-index$/m);
  assert.match(rootIndex, /^scope_id: root$/m);
  assert.match(rootIndex, /<!-- ariadne:scope-boundary:start -->/);
  assert.match(rootIndex, /## Current Focus/, "root topology must preserve the existing vault workflow");

  const rootAgents = readTemplate("AGENTS.md");
  assert.match(rootAgents, /<!-- ariadne:scope-inheritance:start -->/);
  assert.match(rootAgents, /Keep research frontmatter to top-level scalars/, "root inheritance must preserve research policy");

  const fixture = generatedFixture();
  const notes = markdownNotes(fixture.root);
  const rootDescriptor = frontmatter(fs.readFileSync(path.join(fixture.root, `${fixture.rootBoundary}.md`), "utf8"));
  const childDescriptor = frontmatter(fs.readFileSync(path.join(fixture.root, `${fixture.childBoundary}.md`), "utf8"));
  const boundaryTemplate = readTemplate("Research Boundary.md");

  assert.doesNotMatch(boundaryTemplate, /^thread_hub:/m, "optional thread_hub must be omitted by default");
  assert.doesNotMatch(boundaryTemplate, /^- Research thread:/m, "omitted thread_hub must not leave a body link");

  assert.strictEqual(rootDescriptor.type, "research-boundary");
  assert.strictEqual(rootDescriptor.research_schema, 1);
  assert.strictEqual(rootDescriptor.boundary_id, "atlas-research");
  assert.strictEqual(rootDescriptor.scope_path, "Programs/Atlas");
  assert.strictEqual(rootDescriptor.raw_hub, "[[Programs/Atlas/Maps/Evidence Registry]]");
  assert.strictEqual(rootDescriptor.compiled_hub, "[[Programs/Atlas/Maps/Knowledge Registry]]");
  assert.strictEqual(rootDescriptor.inquiry_hub, "[[Programs/Atlas/Maps/Inquiry Registry]]");
  assert.strictEqual(rootDescriptor.synthesis_hub, "[[Programs/Atlas/Maps/Synthesis Registry]]");
  assert.strictEqual(rootDescriptor.view_mode, "rollup");
  assert.deepStrictEqual(rootDescriptor.rollup_boundaries, [`[[${fixture.childBoundary}]]`]);
  assert.strictEqual(childDescriptor.view_mode, "exact");
  assert.deepStrictEqual(childDescriptor.rollup_boundaries, []);

  const exact = exactMembers(notes, fixture.rootBoundary);
  assert.deepStrictEqual(
    exact.map((file) => path.relative(fixture.root, file)).sort(),
    [
      ...fixture.evidenceCases.map((evidence) => evidence.path),
      fixture.researchPath,
      fixture.inquiryPath,
      fixture.synthesisPath,
    ].map((item) => `${item}.md`).sort(),
  );
  const rollup = [...exact, ...exactMembers(notes, fixture.childBoundary)];
  assert.strictEqual(rollup.length, 10, "rollup includes only the explicitly listed child boundary");

  const baseFilters = parseResearchBaseFilters(fixture.base);
  assert.deepStrictEqual(baseFilters, {
    and: [
      'research_boundary == link("Programs/Atlas/Maps/Atlas Research Boundary")',
      { or: [...RESEARCH_TYPES].map((type) => `type == "${type}"`) },
    ],
  });
  const mutatedBase = fixture.base.replace(/^  and:/m, "  or:");
  assert.throws(
    () => parseResearchBaseFilters(mutatedBase),
    /top-level and/,
    "changing top-level and to or must fail the structural assertion",
  );
  assert.doesNotMatch(fixture.base, /file\.inFolder|file\.folder/);
  assert.doesNotMatch(fixture.base, /type == "(?:product|decision|roadmap)"/);

  const raw = frontmatter(fs.readFileSync(path.join(fixture.root, `${fixture.rawPath}.md`), "utf8"));
  const research = frontmatter(fs.readFileSync(path.join(fixture.root, `${fixture.researchPath}.md`), "utf8"));
  const synthesis = frontmatter(fs.readFileSync(path.join(fixture.root, `${fixture.synthesisPath}.md`), "utf8"));
  const decision = frontmatter(fs.readFileSync(path.join(fixture.root, `${fixture.decisionPath}.md`), "utf8"));
  assert.strictEqual(raw.evidence_role, "first-party-evidence");
  assert.strictEqual(raw.compilation_status, "compiled");
  assert.deepStrictEqual(raw.derived_from, []);
  assert.deepStrictEqual(research.derived_from, [`[[${fixture.rawPath}]]`]);
  assert.deepStrictEqual(synthesis.derived_from, [`[[${fixture.researchPath}]]`]);
  assert.deepStrictEqual(decision.research_basis, [`[[${fixture.synthesisPath}]]`]);
  assert.deepStrictEqual(synthesis.promoted_to, [`[[${fixture.decisionPath}]]`]);
  assert.ok(fs.existsSync(path.join(fixture.root, `${fixture.rawPath}.md`)), "promotion does not move raw evidence");

  const evidenceByPath = new Map(fixture.evidenceCases.map((evidence) => {
    const data = frontmatter(fs.readFileSync(path.join(fixture.root, `${evidence.path}.md`), "utf8"));
    return [evidence.path, data];
  }));
  assert.deepStrictEqual(new Set([...evidenceByPath.values()].map((data) => data.evidence_role)), EVIDENCE_ROLES);
  assert.deepStrictEqual(new Set([...evidenceByPath.values()].map((data) => data.compilation_status)), COMPILATION_STATES);
  for (const role of ["generated-analysis", "derivative-copy"]) {
    const [, data] = [...evidenceByPath].find(([, item]) => item.evidence_role === role);
    assert.ok(data.derived_from.length > 0, `${role} must declare upstream derived_from links`);
  }
  const generatedPath = "Generated/Interview Analysis";
  const mirrorPath = "Mirrors/Interview Analysis Copy";
  assert.strictEqual(evidenceByPath.get(generatedPath).origin, evidenceByPath.get(mirrorPath).origin);
  assert.deepStrictEqual([...provenanceRoots(generatedPath, evidenceByPath)], [fixture.rawPath]);
  assert.deepStrictEqual([...provenanceRoots(mirrorPath, evidenceByPath)], [fixture.rawPath]);
  const corroboratingFamilies = new Set([
    ...provenanceRoots(generatedPath, evidenceByPath),
    ...provenanceRoots(mirrorPath, evidenceByPath),
  ]);
  assert.strictEqual(corroboratingFamilies.size, 1, "shared-origin generated and mirror notes are one evidence family");

  const inquiry = fs.readFileSync(path.join(fixture.root, `${fixture.inquiryPath}.md`), "utf8");
  assert.match(inquiry, /## Disposition History/);
  assert.match(inquiry, /\| Date \| Sources \| Disposition \| Note \|/);
  assert.match(inquiry, /append-only/i);
  const architecture = readTemplate("Knowledge Processing Architecture.md");
  assert.match(architecture, /compiled into durable knowledge or intentionally marked `source-only`/i);
  assert.doesNotMatch(architecture, /Every raw input should eventually compile/i);
  assertLinksResolve(fixture.root, notes);
}

try {
  testTemplateSchemaAndGeneratedFixture();
  console.log("research template tests passed");
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
