#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  buildTopology,
  inventoryVault,
  renderCheckpointBlocks,
  renderScopeMapCanvas,
  renderScopeMapMarkdown,
  renderScopeRegistry,
} = require("../../validator/scripts/scope-topology");

const TEMPLATES = path.resolve(__dirname, "../assets/templates");
const VALIDATOR = path.resolve(__dirname, "../../validator/scripts/validate_vault.js");
const ROOT_TEMPLATES = new Map([
  ["00 Index.md", "00 Index.md"],
  ["AGENTS.md", "AGENTS.md"],
  ["Agent Navigation.md", "Agent/00 Agent Navigation.md"],
  ["Task Routing Matrix.md", "Agent/Task Routing Matrix.md"],
  ["Scope Registry.base", "Bases/Scope Registry.base"],
  ["Scope Map.md", "Agent/Scope Map.md"],
  ["Scope Map.canvas", "Agent/Scope Map.canvas"],
  ["Bases Index.md", "Bases/00 Bases Index.md"],
]);

function materializeTemplate(source, destination) {
  if (!fs.existsSync(path.join(TEMPLATES, source))) return;
  const output = path.join(vault, destination);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const text = fs.readFileSync(path.join(TEMPLATES, source), "utf8")
    .replaceAll("{{vault_name}}", "Template Vault")
    .replaceAll("{{purpose}}", "Exercise the generated root topology contract.")
    .replaceAll("{{date}}", "2026-07-16");
  fs.writeFileSync(output, text);
}

const vault = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-scope-template-")));
try {
  for (const [source, destination] of ROOT_TEMPLATES) materializeTemplate(source, destination);

  const validation = spawnSync(process.execPath, [VALIDATOR, vault, "--profile", "scope"], { encoding: "utf8" });
  for (const counter of ["scope-adoption-warnings", "scope-contract-warnings", "scope-map-warnings"]) {
    assert.match(validation.stdout, new RegExp(`^${counter}: 0$`, "mu"), validation.stdout);
  }

  const model = buildTopology(inventoryVault(vault));
  assert.strictEqual(model.active, true, "template vault must activate one root scope");
  assert.deepStrictEqual([...model.descriptors].map((item) => item.scopeId), ["root"]);

  for (const artifact of renderCheckpointBlocks(model)) {
    const actual = fs.readFileSync(path.join(vault, artifact.path), "utf8");
    const generated = artifact.bytes.toString("utf8");
    assert.strictEqual(actual.split(generated).length - 1, 1, `${artifact.path} must contain the exact renderer block once`);
  }

  for (const artifact of [renderScopeRegistry(model), renderScopeMapMarkdown(model), renderScopeMapCanvas(model)]) {
    assert.deepStrictEqual(fs.readFileSync(path.join(vault, artifact.path)), artifact.bytes, `${artifact.path} must match renderer bytes`);
  }

  const basesIndex = fs.readFileSync(path.join(vault, "Bases/00 Bases Index.md"), "utf8");
  assert.match(basesIndex, /\[\[Bases\/Scope Registry\.base\]\]/u);
} finally {
  fs.rmSync(vault, { recursive: true, force: true });
}

console.log("scope topology vault templates: ok");
