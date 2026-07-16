#!/usr/bin/env node
"use strict";
const fs = require("fs");
const { abortOperation, applyOperation, checkTopology, resumeOperation } = require("./scope-topology");
function fail(message) { process.stderr.write(`${message}\n`); process.exitCode = 1; }
try {
  const args = process.argv.slice(2); const vault = args.shift(); if (!vault) throw new Error("usage: sync_scope_topology.js VAULT (--check [--scope PATH] | --write --request FILE | --resume ID | --abort ID)");
  const modes = ["--check", "--write", "--resume", "--abort"].filter((mode) => args.includes(mode));
  if (modes.length !== 1) throw new Error("select exactly one of --check, --write, --resume, or --abort");
  let result;
  if (modes[0] === "--check") { if (![1, 3].includes(args.length) || args.length === 3 && (args[1] !== "--scope" || !args[2])) throw new Error("--check accepts only optional --scope PATH"); result = checkTopology(vault, args.length === 3 ? { scope: args[2] } : {}); }
  else if (modes[0] === "--write") { if (args.length !== 3 || args[1] !== "--request" || !args[2]) throw new Error("--write requires exactly --request FILE"); result = applyOperation(vault, JSON.parse(fs.readFileSync(args[2], "utf8"))); }
  else if (modes[0] === "--resume") { if (args.length !== 2 || !args[1]) throw new Error("--resume requires exactly one operation ID"); result = resumeOperation(vault, args[1]); }
  else { if (args.length !== 2 || !args[1]) throw new Error("--abort requires exactly one operation ID"); result = abortOperation(vault, args[1]); }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) { fail(error.message); }
