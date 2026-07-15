#!/usr/bin/env node
"use strict";
const fs = require("fs");
const { abortOperation, applyOperation, checkTopology, resumeOperation } = require("./scope-topology");
function fail(message) { process.stderr.write(`${message}\n`); process.exitCode = 1; }
try {
  const args = process.argv.slice(2); const vault = args.shift(); if (!vault) throw new Error("usage: sync_scope_topology.js VAULT (--check [--scope PATH] | --write --request FILE | --resume ID | --abort ID)");
  let result;
  if (args.includes("--check")) { const index = args.indexOf("--scope"); result = checkTopology(vault, index >= 0 ? { scope: args[index + 1] } : {}); }
  else if (args.includes("--write")) { const index = args.indexOf("--request"); if (index < 0 || !args[index + 1]) throw new Error("--write requires --request FILE"); result = applyOperation(vault, JSON.parse(fs.readFileSync(args[index + 1], "utf8"))); }
  else if (args.includes("--resume")) result = resumeOperation(vault, args[args.indexOf("--resume") + 1]);
  else if (args.includes("--abort")) result = abortOperation(vault, args[args.indexOf("--abort") + 1]);
  else throw new Error("select exactly one of --check, --write, --resume, or --abort");
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) { fail(error.message); }
