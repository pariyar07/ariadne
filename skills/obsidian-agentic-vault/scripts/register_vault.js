#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const MARKER_START = "<!-- ariadne:vault-discovery:start -->";
const MARKER_END = "<!-- ariadne:vault-discovery:end -->";
const DEFAULT_ENTRYPOINTS = [
  "00 Index.md",
  "AGENTS.md",
  "Agent/00 Agent Navigation.md",
  "Agent/Task Routing Matrix.md",
];

const AGENT_FILES = {
  codex: [".codex", "AGENTS.md"],
  claude: [".claude", "CLAUDE.md"],
  gemini: [".gemini", "GEMINI.md"],
  copilot: [".copilot", "copilot-instructions.md"],
  opencode: [".config", "opencode", "AGENTS.md"],
  roo: [".roo", "rules", "ariadne-vault-discovery.md"],
  cline: ["Documents", "Cline", "Rules", "ariadne-vault-discovery.md"],
};

function usage() {
  return [
    "Usage:",
    "  node register_vault.js --vault <path> --name <name> [options]",
    "",
    "Options:",
    "  --purpose <text>       Short description of the vault purpose.",
    "  --home <path>          Override home directory. Useful for tests.",
    "  --agents <list>        Comma-separated adapters: codex,claude,gemini,copilot,opencode,roo,cline,all,none.",
    "  --primary             Mark this vault as the primary registered vault.",
    "  --check, --doctor     Check registry paths, entrypoints, Markdown, and selected adapter blocks.",
    "  --remove              Remove this vault from the registry and remove adapter blocks when no vaults remain.",
    "  --dry-run             Print planned files without writing.",
    "  --help                Show this help.",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    home: os.homedir(),
    purpose: "",
    agents: ["codex", "claude", "gemini"],
    primary: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--primary") {
      options.primary = true;
    } else if (arg === "--check" || arg === "--doctor") {
      options.check = true;
    } else if (arg === "--remove") {
      options.remove = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--home" || arg === "--vault" || arg === "--name" || arg === "--purpose" || arg === "--agents") {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a value`);
      options[arg.slice(2)] = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.help) return options;
  if (!options.check && !options.vault) throw new Error("--vault is required");
  if (!options.check && !options.remove && !options.name) throw new Error("--name is required");

  options.home = path.resolve(options.home);
  if (options.vault) options.vault = path.resolve(options.vault);
  options.agents = expandAgents(options.agents);

  return options;
}

function expandAgents(value) {
  const raw = Array.isArray(value) ? value : String(value || "").split(",");
  const names = raw.map((name) => name.trim().toLowerCase()).filter(Boolean);
  if (names.includes("none")) return [];
  if (names.includes("all")) return Object.keys(AGENT_FILES);

  const unknown = names.filter((name) => !AGENT_FILES[name]);
  if (unknown.length > 0) throw new Error(`Unsupported agent adapter: ${unknown.join(", ")}`);
  return Array.from(new Set(names));
}

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function loadRegistry(file) {
  if (!fs.existsSync(file)) {
    return {
      version: 1,
      primaryVaultPath: null,
      updatedAt: null,
      vaults: [],
    };
  }

  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  return {
    version: parsed.version || 1,
    primaryVaultPath: parsed.primaryVaultPath || null,
    updatedAt: parsed.updatedAt || null,
    vaults: Array.isArray(parsed.vaults) ? parsed.vaults : [],
  };
}

function existsInVault(vaultPath, relativePath) {
  return fs.existsSync(path.join(vaultPath, relativePath));
}

function detectRootIndex(vaultPath) {
  const preferred = ["00 Global Index.md", "00 Index.md"];
  for (const file of preferred) {
    if (existsInVault(vaultPath, file)) return file;
  }

  if (!fs.existsSync(vaultPath)) return null;

  const rootIndex = fs
    .readdirSync(vaultPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^00 .*Index\.md$/u.test(name))
    .sort((left, right) => left.localeCompare(right))[0];

  return rootIndex || null;
}

function detectEntrypoints(vaultPath) {
  const rootIndex = detectRootIndex(vaultPath);
  const candidates = [
    rootIndex,
    "AGENTS.md",
    "Agent/00 Agent Navigation.md",
    "Agent/Task Routing Matrix.md",
  ].filter(Boolean);

  const existing = candidates.filter((relativePath) => existsInVault(vaultPath, relativePath));
  return existing.length > 0 ? Array.from(new Set(existing)) : DEFAULT_ENTRYPOINTS;
}

function upsertVault(registry, vault, now, primary) {
  const existing = registry.vaults.find((entry) => entry.path === vault.path);
  const entry = {
    name: vault.name,
    path: vault.path,
    purpose: vault.purpose,
    entrypoints: detectEntrypoints(vault.path),
    registeredAt: existing ? existing.registeredAt : now,
    updatedAt: now,
  };

  if (existing) {
    Object.assign(existing, entry);
  } else {
    registry.vaults.push(entry);
  }

  registry.vaults.sort((left, right) => left.name.localeCompare(right.name));
  if (primary || !registry.primaryVaultPath) {
    registry.primaryVaultPath = vault.path;
  }
  registry.updatedAt = now;
}

function removeVault(registry, vaultPath, now) {
  registry.vaults = registry.vaults.filter((entry) => entry.path !== vaultPath);
  if (registry.primaryVaultPath === vaultPath) {
    registry.primaryVaultPath = registry.vaults.length > 0 ? registry.vaults[0].path : null;
  }
  registry.updatedAt = now;
}

function registryMarkdown(registry) {
  const lines = [
    "# Registered Obsidian Vaults",
    "",
    "These are local Obsidian vaults registered as long-term knowledge sources for AI-agent navigation.",
    "",
  ];

  if (registry.primaryVaultPath) {
    lines.push(`Primary vault: ${registry.primaryVaultPath}`, "");
  }

  for (const vault of registry.vaults) {
    lines.push(`## ${vault.name}`);
    lines.push("");
    lines.push(`Path: ${vault.path}`);
    if (vault.purpose) lines.push(`Purpose: ${vault.purpose}`);
    lines.push("");
    lines.push("Cold-start entry order:");
    const entrypoints = Array.isArray(vault.entrypoints) && vault.entrypoints.length > 0 ? vault.entrypoints : DEFAULT_ENTRYPOINTS;
    entrypoints.forEach((entrypoint, index) => {
      const suffix = entrypoint === "Agent/Task Routing Matrix.md" ? " when routing by task" : "";
      lines.push(`${index + 1}. Read \`${entrypoint}\`${suffix}.`);
    });
    lines.push(`${entrypoints.length + 1}. Search this vault with \`rg\` before searching chat history or unrelated folders.`);
    lines.push(`${entrypoints.length + 2}. Prefer compiled notes, indexes, hubs, decisions, and synthesis notes over raw sources.`);
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function discoveryBlock(registryPathDisplay) {
  return [
    MARKER_START,
    "## Registered Vault Discovery",
    "",
    "This machine has one or more Obsidian vaults registered as long-term knowledge sources.",
    "",
    "Registry:",
    `- ${registryPathDisplay}`,
    "",
    "For vague questions, terse keyword prompts, or empty-workspace ambiguity about prior projects, documents, meetings, research, decisions, customers, work history, personal knowledge, or \"what was I working on\", read the vault registry first before creating new artifacts. Then enter the relevant vault through its listed cold-start entry order.",
    "For action prompts like create, draft, write, plan, summarize, or update, if the object may refer to prior projects, customers, documents, contracts, proposals, meetings, decisions, or workstreams, read the vault registry first before creating a new artifact.",
    "If multiple plausible vault matches exist, show the top matches with short reasons and ask the user to choose before creating, updating, or filing artifacts.",
    "Inside a selected multi-scope vault, before write actions, if the prompt does not name the target scope, domain, customer, project, or workstream, ask for confirmation before editing. Search hits alone are not confirmation.",
    "",
    "Do not scan the whole vault by default. Search progressively and prefer compiled notes, hubs, indexes, decisions, and synthesis notes over raw sources.",
    MARKER_END,
    "",
  ].join("\n");
}

function replaceMarkedBlock(existing, block) {
  const escapedStart = MARKER_START.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const escapedEnd = MARKER_END.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}\\n?`, "u");
  if (pattern.test(existing)) {
    return existing.replace(pattern, block);
  }

  const separator = existing.trim().length > 0 && !existing.endsWith("\n\n") ? "\n" : "";
  return `${existing}${separator}${block}`;
}

function removeMarkedBlock(existing) {
  if (!existing.includes(MARKER_START)) return existing;
  const escapedStart = MARKER_START.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const escapedEnd = MARKER_END.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(`\\n?${escapedStart}[\\s\\S]*?${escapedEnd}\\n?`, "u");
  const removed = existing.replace(pattern, "\n").replace(/\n{3,}/gu, "\n\n").trimEnd();
  return removed ? `${removed}\n` : "";
}

function writeFile(file, text, dryRun, planned) {
  planned.push(file);
  if (dryRun) return;
  ensureDir(file);
  fs.writeFileSync(file, text);
}

function checkDiscovery(options) {
  const registryDir = path.join(options.home, ".ariadne");
  const registryJson = path.join(registryDir, "vaults.json");
  const registryMd = path.join(registryDir, "vaults.md");
  const issues = [];

  if (!fs.existsSync(registryJson)) {
    issues.push(`Registry JSON missing: ${registryJson}`);
  }

  if (!fs.existsSync(registryMd)) {
    issues.push(`Registry Markdown missing: ${registryMd}`);
  }

  if (!fs.existsSync(registryJson)) {
    return issues;
  }

  const registry = loadRegistry(registryJson);
  const expectedMarkdown = registryMarkdown(registry);
  if (fs.existsSync(registryMd) && fs.readFileSync(registryMd, "utf8") !== expectedMarkdown) {
    issues.push(`Registry Markdown is stale: ${registryMd}`);
  }

  if (registry.primaryVaultPath && !registry.vaults.some((vault) => vault.path === registry.primaryVaultPath)) {
    issues.push(`Primary vault is not registered: ${registry.primaryVaultPath}`);
  }

  for (const vault of registry.vaults) {
    if (!fs.existsSync(vault.path)) {
      issues.push(`Vault path missing: ${vault.path}`);
      continue;
    }

    const registeredEntrypoints = Array.isArray(vault.entrypoints) ? vault.entrypoints : DEFAULT_ENTRYPOINTS;
    for (const entrypoint of registeredEntrypoints) {
      if (!existsInVault(vault.path, entrypoint)) {
        issues.push(`Registered entrypoint missing: ${entrypoint} (${vault.name})`);
      }
    }

    const detectedEntrypoints = detectEntrypoints(vault.path);
    for (const entrypoint of detectedEntrypoints) {
      if (!registeredEntrypoints.includes(entrypoint)) {
        issues.push(`Detected entrypoint is not registered: ${entrypoint} (${vault.name})`);
      }
    }
  }

  for (const agent of options.agents) {
    const file = path.join(options.home, ...AGENT_FILES[agent]);
    if (!fs.existsSync(file)) {
      issues.push(`Adapter file missing marker block: ${file}`);
      continue;
    }

    const text = fs.readFileSync(file, "utf8");
    if (!text.includes(MARKER_START) || !text.includes(MARKER_END)) {
      issues.push(`Adapter file missing marker block: ${file}`);
      continue;
    }

    const requiredPhrases = [
      ["registry path", "~/.ariadne/vaults.md"],
      ["entrypoint instructions", "listed cold-start entry order"],
      ["action-prompt discovery instructions", "For action prompts like create, draft, write, plan, summarize, or update"],
      ["multiple-match confirmation instructions", "multiple plausible vault matches"],
      ["target-scope confirmation instructions", "target scope, domain, customer, project, or workstream"],
      ["search-hit confirmation guard", "Search hits alone are not confirmation"],
    ];

    for (const [label, phrase] of requiredPhrases) {
      if (!text.includes(phrase)) {
        issues.push(`Adapter block has stale ${label}: ${file}`);
      }
    }
  }

  return issues;
}

function register(options) {
  const registryDir = path.join(options.home, ".ariadne");
  const registryJson = path.join(registryDir, "vaults.json");
  const registryMd = path.join(registryDir, "vaults.md");
  const registryPathDisplay = "~/.ariadne/vaults.md";
  const now = new Date().toISOString();
  const planned = [];

  const registry = loadRegistry(registryJson);
  if (options.remove) {
    removeVault(registry, options.vault, now);
  } else {
    upsertVault(
      registry,
      {
        name: options.name,
        path: options.vault,
        purpose: options.purpose,
      },
      now,
      options.primary,
    );
  }

  writeFile(registryJson, `${JSON.stringify(registry, null, 2)}\n`, options.dryRun, planned);
  writeFile(registryMd, registryMarkdown(registry), options.dryRun, planned);

  const block = discoveryBlock(registryPathDisplay);
  for (const agent of options.agents) {
    const file = path.join(options.home, ...AGENT_FILES[agent]);
    const exists = fs.existsSync(file);
    const existing = exists ? fs.readFileSync(file, "utf8") : "";
    if (options.remove && registry.vaults.length === 0 && !existing.includes(MARKER_START)) continue;
    const nextText = options.remove && registry.vaults.length === 0 ? removeMarkedBlock(existing) : replaceMarkedBlock(existing, block);
    writeFile(file, nextText, options.dryRun, planned);
  }

  return planned;
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      return;
    }

    if (options.check) {
      const issues = checkDiscovery(options);
      if (issues.length === 0) {
        console.log("Discovery check passed");
        return;
      }

      console.log(`Discovery check found ${issues.length} issue(s):`);
      for (const issue of issues) {
        console.log(`- ${issue}`);
      }
      process.exitCode = 1;
      return;
    }

    const planned = register(options);
    const action = options.remove
      ? options.dryRun
        ? "Would unregister"
        : "Unregistered"
      : options.dryRun
        ? "Would register"
        : "Registered";
    console.log(`${action} ${options.name || options.vault}`);
    for (const file of planned) {
      console.log(`- ${file}`);
    }
  } catch (error) {
    console.error(error.message);
    console.error("");
    console.error(usage());
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  AGENT_FILES,
  MARKER_END,
  MARKER_START,
  detectEntrypoints,
  detectRootIndex,
  checkDiscovery,
  discoveryBlock,
  register,
};
