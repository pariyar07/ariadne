#!/usr/bin/env node
"use strict";

const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const REGISTER = path.resolve(__dirname, "../scripts/register_vault.js");

function runRegister(args) {
  const result = childProcess.spawnSync(process.execPath, [REGISTER, ...args], {
    encoding: "utf8",
  });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  };
}

function assertSuccess(result) {
  assert.strictEqual(result.status, 0, result.stdout + result.stderr);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function tempHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-register-"));
}

function registerArgs(home, vault, extra = []) {
  return [
    "--home",
    home,
    "--vault",
    vault,
    "--name",
    "Work Vault",
    "--purpose",
    "Long-term project and research knowledge.",
    "--agents",
    "codex,claude,gemini",
    ...extra,
  ];
}

const tests = [
  function createsRegistryFilesAndAgentAdapters() {
    const home = tempHome();
    const vault = path.join(home, "Documents", "Work Vault");
    fs.mkdirSync(path.join(vault, "Agent"), { recursive: true });
    fs.writeFileSync(path.join(vault, "00 Global Index.md"), "# Work Vault\n");
    fs.writeFileSync(path.join(vault, "AGENTS.md"), "# Agent Instructions\n");
    fs.writeFileSync(path.join(vault, "Agent", "00 Agent Navigation.md"), "# Agent Navigation\n");
    fs.writeFileSync(path.join(vault, "Agent", "Task Routing Matrix.md"), "# Task Routing Matrix\n");

    const result = runRegister(registerArgs(home, vault));

    assertSuccess(result);
    assert.match(result.stdout, /Registered Work Vault/);

    const registryJson = path.join(home, ".ariadne", "vaults.json");
    const registryMd = path.join(home, ".ariadne", "vaults.md");
    assert.ok(fs.existsSync(registryJson));
    assert.ok(fs.existsSync(registryMd));

    const data = JSON.parse(read(registryJson));
    assert.strictEqual(data.vaults.length, 1);
    assert.strictEqual(data.vaults[0].name, "Work Vault");
    assert.strictEqual(data.vaults[0].path, vault);
    assert.strictEqual(data.vaults[0].purpose, "Long-term project and research knowledge.");
    assert.deepStrictEqual(data.vaults[0].entrypoints, [
      "00 Global Index.md",
      "AGENTS.md",
      "Agent/00 Agent Navigation.md",
      "Agent/Task Routing Matrix.md",
    ]);

    assert.match(read(registryMd), /# Registered Obsidian Vaults/);
    assert.match(read(registryMd), /## Work Vault/);
    assert.match(read(registryMd), /Path: /);
    assert.match(read(registryMd), /Read `00 Global Index\.md`/);
    assert.doesNotMatch(read(registryMd), /Read `00 Index\.md`/);

    for (const file of [
      path.join(home, ".codex", "AGENTS.md"),
      path.join(home, ".claude", "CLAUDE.md"),
      path.join(home, ".gemini", "GEMINI.md"),
    ]) {
      const text = read(file);
      assert.match(text, /<!-- ariadne:vault-discovery:start -->/);
      assert.match(text, /## Registered Vault Discovery/);
      assert.match(text, /Registry:/);
      assert.match(text, /\.ariadne\/vaults\.md/);
      assert.match(text, /terse keyword prompts/);
      assert.match(text, /before creating new artifacts/);
      assert.match(text, /listed cold-start entry order/);
      assert.doesNotMatch(text, /This machine has one or more Ariadne/);
      assert.match(text, /<!-- ariadne:vault-discovery:end -->/);
    }
  },

  function detectsStandardRootIndexWhenPresent() {
    const home = tempHome();
    const vault = path.join(home, "Vault");
    fs.mkdirSync(vault, { recursive: true });
    fs.writeFileSync(path.join(vault, "00 Index.md"), "# Standard Vault\n");
    fs.writeFileSync(path.join(vault, "AGENTS.md"), "# Agent Instructions\n");

    assertSuccess(runRegister(registerArgs(home, vault, ["--agents", "none"])));

    const data = JSON.parse(read(path.join(home, ".ariadne", "vaults.json")));
    assert.deepStrictEqual(data.vaults[0].entrypoints, ["00 Index.md", "AGENTS.md"]);
    assert.match(read(path.join(home, ".ariadne", "vaults.md")), /Read `00 Index\.md`/);
  },

  function checkReportsHealthyDiscovery() {
    const home = tempHome();
    const vault = path.join(home, "Vault");
    fs.mkdirSync(path.join(vault, "Agent"), { recursive: true });
    fs.writeFileSync(path.join(vault, "00 Global Index.md"), "# Global\n");
    fs.writeFileSync(path.join(vault, "AGENTS.md"), "# Agents\n");
    fs.writeFileSync(path.join(vault, "Agent", "00 Agent Navigation.md"), "# Navigation\n");

    assertSuccess(runRegister(registerArgs(home, vault, ["--agents", "codex"])));

    const result = runRegister(["--home", home, "--agents", "codex", "--doctor"]);

    assertSuccess(result);
    assert.match(result.stdout, /Discovery check passed/);
  },

  function checkReportsStaleOrMissingDiscovery() {
    const home = tempHome();
    const vault = path.join(home, "Vault");
    fs.mkdirSync(vault, { recursive: true });
    fs.writeFileSync(path.join(vault, "00 Global Index.md"), "# Global\n");
    fs.writeFileSync(path.join(vault, "AGENTS.md"), "# Agents\n");
    fs.mkdirSync(path.join(home, ".ariadne"), { recursive: true });
    fs.writeFileSync(
      path.join(home, ".ariadne", "vaults.json"),
      `${JSON.stringify(
        {
          version: 1,
          primaryVaultPath: vault,
          updatedAt: "2026-05-25T00:00:00.000Z",
          vaults: [
            {
              name: "Vault",
              path: vault,
              purpose: "Test vault.",
              entrypoints: ["00 Index.md", "AGENTS.md"],
              registeredAt: "2026-05-25T00:00:00.000Z",
              updatedAt: "2026-05-25T00:00:00.000Z",
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
    fs.writeFileSync(path.join(home, ".ariadne", "vaults.md"), "# stale\n");

    const result = runRegister(["--home", home, "--agents", "codex", "--check"]);

    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /Discovery check found 4 issue/);
    assert.match(result.stdout, /Registered entrypoint missing: 00 Index\.md/);
    assert.match(result.stdout, /Detected entrypoint is not registered: 00 Global Index\.md/);
    assert.match(result.stdout, /Registry Markdown is stale/);
    assert.match(result.stdout, /Adapter file missing marker block/);
  },

  function updatesExistingMarkerBlockWithoutDuplicating() {
    const home = tempHome();
    const vault = path.join(home, "Vault");
    fs.mkdirSync(path.join(home, ".codex"), { recursive: true });
    fs.mkdirSync(vault, { recursive: true });
    fs.writeFileSync(
      path.join(home, ".codex", "AGENTS.md"),
      [
        "# Personal Codex Instructions",
        "",
        "<!-- ariadne:vault-discovery:start -->",
        "old block",
        "<!-- ariadne:vault-discovery:end -->",
        "",
        "Keep this trailing note.",
        "",
      ].join("\n"),
    );

    assertSuccess(runRegister(registerArgs(home, vault, ["--agents", "codex"])));
    assertSuccess(runRegister(registerArgs(home, vault, ["--agents", "codex"])));

    const text = read(path.join(home, ".codex", "AGENTS.md"));
    assert.match(text, /# Personal Codex Instructions/);
    assert.match(text, /Keep this trailing note\./);
    assert.doesNotMatch(text, /old block/);
    assert.strictEqual((text.match(/ariadne:vault-discovery:start/g) || []).length, 1);

    const data = JSON.parse(read(path.join(home, ".ariadne", "vaults.json")));
    assert.strictEqual(data.vaults.length, 1);
  },

  function unregisterRemovesVaultAndAdapterBlockWhenRegistryIsEmpty() {
    const home = tempHome();
    const vault = path.join(home, "Vault");
    fs.mkdirSync(vault, { recursive: true });

    assertSuccess(runRegister(registerArgs(home, vault, ["--agents", "codex"])));
    assertSuccess(runRegister(["--home", home, "--vault", vault, "--agents", "codex", "--remove"]));

    const data = JSON.parse(read(path.join(home, ".ariadne", "vaults.json")));
    assert.strictEqual(data.vaults.length, 0);
    assert.strictEqual(data.primaryVaultPath, null);
    assert.doesNotMatch(read(path.join(home, ".codex", "AGENTS.md")), /ariadne:vault-discovery:start/);
  },

  function unregisterDoesNotCreateMissingAdapterFiles() {
    const home = tempHome();
    const vault = path.join(home, "Vault");
    fs.mkdirSync(vault, { recursive: true });

    assertSuccess(runRegister(["--home", home, "--vault", vault, "--agents", "codex", "--remove"]));

    assert.ok(fs.existsSync(path.join(home, ".ariadne", "vaults.json")));
    assert.ok(!fs.existsSync(path.join(home, ".codex", "AGENTS.md")));
  },
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} tests passed`);
