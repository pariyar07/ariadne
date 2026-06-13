#!/usr/bin/env node
"use strict";

const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const GUARD = path.resolve(__dirname, "../scripts/guard_vault_write.js");

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ariadne-write-guard-"));
}

function runGuard(input, env) {
  const result = childProcess.spawnSync(process.execPath, [GUARD], {
    input: `${JSON.stringify(input)}\n`,
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
    },
  });
  assert.strictEqual(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function writeRegistry(home, vaultPath) {
  fs.mkdirSync(path.join(home, ".ariadne"), { recursive: true });
  fs.writeFileSync(
    path.join(home, ".ariadne", "vaults.json"),
    `${JSON.stringify({
      version: 1,
      primaryVaultPath: vaultPath,
      vaults: [
        {
          name: "Work Vault",
          path: vaultPath,
          purpose: "Test vault.",
          entrypoints: ["00 Global Index.md", "AGENTS.md"],
        },
      ],
    })}\n`,
  );
}

function promptInput(sessionId, prompt) {
  return {
    hook_event_name: "UserPromptSubmit",
    session_id: sessionId,
    user_prompt: prompt,
  };
}

function editInput(sessionId, cwd, filePath) {
  return {
    hook_event_name: "PreToolUse",
    session_id: sessionId,
    cwd,
    tool_name: "Edit",
    tool_input: {
      file_path: filePath,
      old_string: "before",
      new_string: "after",
    },
  };
}

const tests = [
  function blocksAmbiguousWriteToLikelyStagingBoard() {
    const root = tempDir();
    const env = {
      HOME: root,
      ARIADNE_WRITE_GUARD_STATE_DIR: path.join(root, "state"),
    };
    const board = path.join(root, "ariadne-kanban-staging", "Kanban", "Ariadne Evaluation and Testing.md");
    fs.mkdirSync(path.dirname(board), { recursive: true });
    fs.writeFileSync(board, "# Board\n");

    runGuard(promptInput("s1", "Add tracking for automated transcript review"), env);
    const result = runGuard(editInput("s1", root, board), env);

    assert.strictEqual(result.hookSpecificOutput.permissionDecision, "deny");
    assert.match(result.systemMessage, /blocked this Markdown write/);
    assert.match(result.systemMessage, /Likely target: Ariadne/);
    assert.match(result.systemMessage, /current turn/);
  },

  function allowsWriteWhenCurrentPromptNamesTarget() {
    const root = tempDir();
    const env = {
      HOME: root,
      ARIADNE_WRITE_GUARD_STATE_DIR: path.join(root, "state"),
    };
    const vault = path.join(root, "Vault");
    const board = path.join(vault, "Domains", "Ariadne", "Kanban", "Ariadne Evaluation and Testing.md");
    fs.mkdirSync(path.dirname(board), { recursive: true });
    fs.writeFileSync(board, "# Board\n");
    writeRegistry(root, vault);

    runGuard(promptInput("s2", "Add tracking for Ariadne automated transcript review"), env);
    const result = runGuard(editInput("s2", root, board), env);

    assert.strictEqual(result.hookSpecificOutput.permissionDecision, "allow");
  },

  function allowsWriteAfterConfirmationTurn() {
    const root = tempDir();
    const env = {
      HOME: root,
      ARIADNE_WRITE_GUARD_STATE_DIR: path.join(root, "state"),
    };
    const board = path.join(root, "ariadne-kanban-staging", "Kanban", "Ariadne Evaluation and Testing.md");
    fs.mkdirSync(path.dirname(board), { recursive: true });
    fs.writeFileSync(board, "# Board\n");

    runGuard(promptInput("s3", "Add tracking for automated transcript review"), env);
    const blocked = runGuard(editInput("s3", root, board), env);
    assert.strictEqual(blocked.hookSpecificOutput.permissionDecision, "deny");

    runGuard(promptInput("s3", "Yes, add it to Ariadne."), env);
    const allowed = runGuard(editInput("s3", root, board), env);
    assert.strictEqual(allowed.hookSpecificOutput.permissionDecision, "allow");
  },

  function ignoresNonVaultMarkdownWrites() {
    const root = tempDir();
    const env = {
      HOME: root,
      ARIADNE_WRITE_GUARD_STATE_DIR: path.join(root, "state"),
    };
    const file = path.join(root, "scratch.md");
    fs.writeFileSync(file, "# Scratch\n");

    runGuard(promptInput("s4", "Add tracking for automated transcript review"), env);
    const result = runGuard(editInput("s4", root, file), env);

    assert.strictEqual(result.hookSpecificOutput.permissionDecision, "allow");
  },
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} tests passed`);
