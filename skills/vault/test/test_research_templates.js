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
    thread_hub: "Programs/Atlas/Maps/Research Thread",
  };
  const childHubs = {
    raw_hub: "Experiments/Nested/Maps/Evidence Registry",
    compiled_hub: "Experiments/Nested/Maps/Knowledge Registry",
    inquiry_hub: "Experiments/Nested/Maps/Inquiry Registry",
    synthesis_hub: "Experiments/Nested/Maps/Synthesis Registry",
    thread_hub: "Experiments/Nested/Maps/Research Thread",
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
  write(root, `${rawPath}.md`, noteFromTemplate("Raw Source Note.md", {}, {
    research_boundary: `"${rootBoundaryLink}"`,
    source_type: "meeting",
    evidence_role: "first-party-evidence",
    compilation_status: "compiled",
  }));
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

  return { root, rootBoundary, childBoundary, rawPath, researchPath, inquiryPath, synthesisPath, decisionPath, base };
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

function testTemplateSchemaAndGeneratedFixture() {
  for (const name of ["Research Boundary.md", "Research Inquiry.md", "Research Synthesis.md"])
    assert.ok(fs.existsSync(path.join(TEMPLATES, name)), `${name} must be shipped`);

  const fixture = generatedFixture();
  const notes = markdownNotes(fixture.root);
  const rootDescriptor = frontmatter(fs.readFileSync(path.join(fixture.root, `${fixture.rootBoundary}.md`), "utf8"));
  const childDescriptor = frontmatter(fs.readFileSync(path.join(fixture.root, `${fixture.childBoundary}.md`), "utf8"));

  assert.strictEqual(rootDescriptor.type, "research-boundary");
  assert.strictEqual(rootDescriptor.research_schema, 1);
  assert.strictEqual(rootDescriptor.boundary_id, "atlas-research");
  assert.strictEqual(rootDescriptor.scope_path, "Programs/Atlas");
  assert.strictEqual(rootDescriptor.view_mode, "rollup");
  assert.deepStrictEqual(rootDescriptor.rollup_boundaries, [`[[${fixture.childBoundary}]]`]);
  assert.strictEqual(childDescriptor.view_mode, "exact");
  assert.deepStrictEqual(childDescriptor.rollup_boundaries, []);

  const exact = exactMembers(notes, fixture.rootBoundary);
  assert.deepStrictEqual(
    exact.map((file) => path.relative(fixture.root, file)).sort(),
    [fixture.rawPath, fixture.researchPath, fixture.inquiryPath, fixture.synthesisPath].map((item) => `${item}.md`).sort(),
  );
  const rollup = [...exact, ...exactMembers(notes, fixture.childBoundary)];
  assert.strictEqual(rollup.length, 5, "rollup includes only the explicitly listed child boundary");

  assert.match(fixture.base, /research_boundary\s*==\s*link\("Programs\/Atlas\/Maps\/Atlas Research Boundary"\)/);
  assert.doesNotMatch(fixture.base, /file\.inFolder|file\.folder/);
  for (const type of RESEARCH_TYPES) assert.match(fixture.base, new RegExp(`type == "${type}"`));
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

  const inquiry = fs.readFileSync(path.join(fixture.root, `${fixture.inquiryPath}.md`), "utf8");
  assert.match(inquiry, /## Disposition History/);
  assert.match(inquiry, /\| Date \| Sources \| Disposition \| Note \|/);
  assert.match(inquiry, /append-only/i);
  assertLinksResolve(fixture.root, notes);
}

try {
  testTemplateSchemaAndGeneratedFixture();
  console.log("research template tests passed");
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
