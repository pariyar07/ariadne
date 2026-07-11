#!/usr/bin/env node
"use strict";

const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const REGISTER = path.resolve(__dirname, "../scripts/register_vault.js");
const { discoveryBlock } = require("../scripts/register_vault.js");

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

function assertIncludesActionPromptRule(text) {
  assert.match(text, /For action prompts like add, create, draft, write, plan, summarize, update, track, log, or record/);
  assert.match(text, /prior projects, customers, documents, contracts, proposals, meetings, decisions, or workstreams/);
  assert.match(text, /read the vault registry before asking whether to start from scratch, where the code lives, or what project to use/);
  assert.match(text, /An empty current directory is not evidence that no prior project context exists/);
  assert.match(text, /check registered vaults before proposing a new project or codebase workflow/);
}

function assertIncludesMultipleMatchConfirmationRule(text) {
  assert.match(text, /multiple plausible vault matches/i);
  assert.match(text, /show the top matches with short reasons/i);
  assert.match(text, /ask the user to choose before creating, updating, or filing artifacts/i);
}

function assertIncludesScopeConfirmationRule(text) {
  assert.match(text, /Inside a selected multi-scope vault, write actions require a current-turn explicit target before editing/i);
  assert.match(text, /A target is explicit only when the current prompt names/i);
  assert.match(text, /target scope, domain, customer, project, or workstream/i);
  assert.match(text, /the user confirms one after the agent asks/i);
  assert.match(text, /Search hits, a single likely match/i);
  assert.match(text, /prior conversation, current working directory, and active skills are not confirmation/i);
}

function tempHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-register-"));
}

function registerArgs(home, vault, options = {}) {
  const agents = options.agents || "codex,claude,gemini";
  const extra = options.extra || [];
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
    agents,
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

    const registryMarkdown = read(registryMd);
    assert.match(registryMarkdown, /# Registered Obsidian Vaults/);
    assert.match(registryMarkdown, /Primary vault: /);
    assert.match(registryMarkdown, /## Work Vault/);
    assert.match(registryMarkdown, new RegExp(`Path: ${vault.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(registryMarkdown, /Purpose: Long-term project and research knowledge\./);
    assert.match(registryMarkdown, /1\. Read `00 Global Index\.md`\./);
    assert.match(registryMarkdown, /2\. Read `AGENTS\.md`\./);
    assert.match(registryMarkdown, /3\. Read `Agent\/00 Agent Navigation\.md`\./);
    assert.match(registryMarkdown, /4\. Read `Agent\/Task Routing Matrix\.md` when routing by task\./);
    assert.match(registryMarkdown, /5\. Search this vault with `rg` before searching chat history or unrelated folders\./);
    assert.match(registryMarkdown, /6\. Prefer compiled notes, indexes, hubs, decisions, and synthesis notes over raw sources\./);
    assert.doesNotMatch(registryMarkdown, /Read `00 Index\.md`/);

    for (const file of [
      path.join(home, ".codex", "AGENTS.md"),
      path.join(home, ".claude", "CLAUDE.md"),
      path.join(home, ".gemini", "GEMINI.md"),
    ]) {
      const text = read(file);
      assert.strictEqual(text, discoveryBlock("~/.ariadne/vaults.md"));
      assertIncludesActionPromptRule(text);
      assertIncludesMultipleMatchConfirmationRule(text);
      assertIncludesScopeConfirmationRule(text);
      assert.doesNotMatch(text, /This machine has one or more Ariadne/);
    }
  },

  function detectsStandardRootIndexWhenPresent() {
    const home = tempHome();
    const vault = path.join(home, "Vault");
    fs.mkdirSync(vault, { recursive: true });
    fs.writeFileSync(path.join(vault, "00 Index.md"), "# Standard Vault\n");
    fs.writeFileSync(path.join(vault, "AGENTS.md"), "# Agent Instructions\n");

    assertSuccess(runRegister(registerArgs(home, vault, { agents: "none" })));

    const data = JSON.parse(read(path.join(home, ".ariadne", "vaults.json")));
    assert.deepStrictEqual(data.vaults[0].entrypoints, ["00 Index.md", "AGENTS.md"]);
    assert.match(read(path.join(home, ".ariadne", "vaults.md")), /Read `00 Index\.md`/);
    assert.ok(!fs.existsSync(path.join(home, ".codex", "AGENTS.md")));
    assert.ok(!fs.existsSync(path.join(home, ".claude", "CLAUDE.md")));
    assert.ok(!fs.existsSync(path.join(home, ".gemini", "GEMINI.md")));
  },

  function checkReportsHealthyDiscovery() {
    const home = tempHome();
    const vault = path.join(home, "Vault");
    fs.mkdirSync(path.join(vault, "Agent"), { recursive: true });
    fs.writeFileSync(path.join(vault, "00 Global Index.md"), "# Global\n");
    fs.writeFileSync(path.join(vault, "AGENTS.md"), "# Agents\n");
    fs.writeFileSync(path.join(vault, "Agent", "00 Agent Navigation.md"), "# Navigation\n");

    assertSuccess(runRegister(registerArgs(home, vault, { agents: "codex" })));

    const result = runRegister(["--home", home, "--agents", "codex", "--doctor"]);

    assertSuccess(result);
    assert.match(result.stdout, /Discovery check passed/);
  },

  function checkReportsStaleDiscoveryWhenAdapterBlockMissesScopeRule() {
    const home = tempHome();
    const vault = path.join(home, "Vault");
    fs.mkdirSync(path.join(vault, "Agent"), { recursive: true });
    fs.writeFileSync(path.join(vault, "00 Global Index.md"), "# Global\n");
    fs.writeFileSync(path.join(vault, "AGENTS.md"), "# Agents\n");
    fs.writeFileSync(path.join(vault, "Agent", "00 Agent Navigation.md"), "# Navigation\n");

    assertSuccess(runRegister(registerArgs(home, vault, { agents: "codex" })));

    const adapterFile = path.join(home, ".codex", "AGENTS.md");
    const oldBlock = discoveryBlock("~/.ariadne/vaults.md").replace(
      "Inside a selected multi-scope vault, write actions require a current-turn explicit target before editing. A target is explicit only when the current prompt names the target scope, domain, customer, project, or workstream, or the user confirms one after the agent asks. Search hits, a single likely match, existing matching cards, prior conversation, current working directory, and active skills are not confirmation.\n",
      "",
    );
    fs.writeFileSync(adapterFile, oldBlock);

    const result = runRegister(["--home", home, "--agents", "codex", "--doctor"]);

    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /Discovery check found \d+ issue/);
    assert.match(result.stdout, /Adapter block has stale target-scope confirmation instructions/);
    assert.match(result.stdout, /Adapter block has stale current-turn target confirmation guard/);
    assert.match(result.stdout, /Adapter block has stale search-hit confirmation guard/);
    assert.match(result.stdout, /Adapter block has stale context inference confirmation guard/);
  },

  function checkReportsStaleDiscoveryWhenAdapterBlockUsesOldScopeRule() {
    const home = tempHome();
    const vault = path.join(home, "Vault");
    fs.mkdirSync(path.join(vault, "Agent"), { recursive: true });
    fs.writeFileSync(path.join(vault, "00 Global Index.md"), "# Global\n");
    fs.writeFileSync(path.join(vault, "AGENTS.md"), "# Agents\n");
    fs.writeFileSync(path.join(vault, "Agent", "00 Agent Navigation.md"), "# Navigation\n");

    assertSuccess(runRegister(registerArgs(home, vault, { agents: "codex" })));

    const adapterFile = path.join(home, ".codex", "AGENTS.md");
    const staleBlock = discoveryBlock("~/.ariadne/vaults.md").replace(
      "Inside a selected multi-scope vault, write actions require a current-turn explicit target before editing. A target is explicit only when the current prompt names the target scope, domain, customer, project, or workstream, or the user confirms one after the agent asks. Search hits, a single likely match, existing matching cards, prior conversation, current working directory, and active skills are not confirmation.",
      "Inside a selected multi-scope vault, before write actions, if the prompt does not name the target scope, domain, customer, project, or workstream, ask for confirmation before editing. Search hits alone are not confirmation.",
    );
    fs.writeFileSync(adapterFile, staleBlock);

    const result = runRegister(["--home", home, "--agents", "codex", "--doctor"]);

    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /Discovery check found \d+ issue/);
    assert.match(result.stdout, /Adapter block has stale current-turn target confirmation guard/);
    assert.match(result.stdout, /Adapter block has stale search-hit confirmation guard/);
    assert.match(result.stdout, /Adapter block has stale context inference confirmation guard/);
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
    assert.match(result.stdout, /Discovery check found \d+ issue/);
    assert.match(result.stdout, /Registered entrypoint missing: 00 Index\.md/);
    assert.match(result.stdout, /Detected entrypoint is not registered: 00 Global Index\.md/);
    assert.match(result.stdout, /Registry Markdown is stale/);
    assert.match(result.stdout, /Adapter file missing marker block/);
  },

  function checkReportsOversizedSignpostBlock() {
    const home = tempHome();
    const vault = path.join(home, "Vault");
    fs.mkdirSync(path.join(vault, "Agent"), { recursive: true });
    fs.writeFileSync(path.join(vault, "00 Global Index.md"), "# Global\n");
    fs.writeFileSync(path.join(vault, "AGENTS.md"), "# Agents\n");
    fs.writeFileSync(path.join(vault, "Agent", "00 Agent Navigation.md"), "# Navigation\n");

    assertSuccess(runRegister(registerArgs(home, vault, { agents: "codex" })));

    const adapterFile = path.join(home, ".codex", "AGENTS.md");
    const endMarker = "<!-- ariadne:vault-discovery:end -->";
    const bloatedBlock = discoveryBlock("~/.ariadne/vaults.md").replace(
      endMarker,
      `${"Extra copied vault navigation line. ".repeat(300)}\n${endMarker}`,
    );
    fs.writeFileSync(adapterFile, bloatedBlock);

    const result = runRegister(["--home", home, "--agents", "codex", "--doctor"]);

    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /Adapter discovery block is oversized/);
  },

  function checkReportsDuplicateDiscoveryBlock() {
    const home = tempHome();
    const vault = path.join(home, "Vault");
    fs.mkdirSync(path.join(vault, "Agent"), { recursive: true });
    fs.writeFileSync(path.join(vault, "00 Global Index.md"), "# Global\n");
    fs.writeFileSync(path.join(vault, "AGENTS.md"), "# Agents\n");
    fs.writeFileSync(path.join(vault, "Agent", "00 Agent Navigation.md"), "# Navigation\n");

    assertSuccess(runRegister(registerArgs(home, vault, { agents: "codex" })));

    const adapterFile = path.join(home, ".codex", "AGENTS.md");
    const oneBlock = discoveryBlock("~/.ariadne/vaults.md");
    fs.writeFileSync(adapterFile, `${oneBlock}\n${oneBlock}`);

    const result = runRegister(["--home", home, "--agents", "codex", "--doctor"]);

    assert.strictEqual(result.status, 1);
    assert.match(result.stdout, /Adapter file has duplicate discovery block/);
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

    assertSuccess(runRegister(registerArgs(home, vault, { agents: "codex" })));
    assertSuccess(runRegister(registerArgs(home, vault, { agents: "codex" })));

    const text = read(path.join(home, ".codex", "AGENTS.md"));
    assert.match(text, /# Personal Codex Instructions/);
    assert.match(text, /Keep this trailing note\./);
    assert.match(text, new RegExp(discoveryBlock("~/.ariadne/vaults.md").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(text, /old block/);
    assert.strictEqual((text.match(/ariadne:vault-discovery:start/g) || []).length, 1);

    const data = JSON.parse(read(path.join(home, ".ariadne", "vaults.json")));
    assert.strictEqual(data.vaults.length, 1);
  },

  function unregisterRemovesVaultAndAdapterBlockWhenRegistryIsEmpty() {
    const home = tempHome();
    const vault = path.join(home, "Vault");
    fs.mkdirSync(vault, { recursive: true });

    assertSuccess(runRegister(registerArgs(home, vault, { agents: "codex" })));
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
