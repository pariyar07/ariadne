# Ariadne Quickstart Guide

This guide covers everything you can do with Ariadne: from bootstrapping a new vault to running a cold-start ingest in a specific domain. Each section shows the exact words to give a cold agent and which skills handle each job.

---

## What You Need to Say

Ariadne vaults are designed so a cold agent — one that has never seen your vault — can orient, route, and act correctly from a single instruction. The pattern is:

> **verb + optional scope + optional material**

Examples:
- `"Research ingest https://example.com"` → asks for a domain if needed, then routes into the right research pipeline
- `"Ingest this link into OCG"` → routes directly to OCG ingest workflow
- `"Synthesize the context graph research thread"` → routes to OCG synthesis
- `"Add a new scope for customer discovery"` → routes to scope creation
- `"Run a vault health check"` → routes to maintenance
- `"Bootstrap a new vault for my gym training"` → routes to vault creation

---

## Skill Map

| What you want to do | Skill to invoke | Trigger phrase |
| --- | --- | --- |
| Create a new vault from scratch | `obsidian-agentic-vault` | "Bootstrap a new vault for..." |
| Register an existing vault globally | `obsidian-vault-discovery` | "Make this vault discoverable" / "Register this vault globally" |
| Add a new domain or scope | `obsidian-scope-manager` | "Add a scope for..." / "Create a domain for..." |
| Add research infrastructure inside a domain | `obsidian-research-pipeline` | "Add a research pipeline to..." |
| Cold-start research source ingest | `obsidian-research-ingest` | "Research ingest..." / "Save this research..." |
| Ingest a link, article, or brain dump | `obsidian-ingest-compile` | "Ingest this..." / "Add this to..." |
| Synthesize multiple sources | `obsidian-research-synthesis` | "Synthesize the ... research" / "Update the ... thread" |
| Redesign navigation or routing | `obsidian-navigation-architect` | "Redesign navigation for..." / "Add a workstream for..." |
| Run health checks and repair | `obsidian-vault-maintainer` | "Run a vault health check" / "Fix navigation drift" |
| Validate structure deterministically | `obsidian-vault-validator` | "Validate the vault" / "Check for broken links" |

---

## Scenario 1: New Vault From Scratch

**What to say:**
> "Bootstrap a new vault for [purpose] at [path]"

**What happens:**
1. `obsidian-agentic-vault` creates the base folder structure, `AGENTS.md`, `CLAUDE.md`, `00 Index.md`, `Agent/` navigation files, `Bases/`, `Templates/`, intake folders, and mode-specific folders.
2. The agent offers optional machine-level registration through `obsidian-vault-discovery` so future cold agents can discover this vault from outside the vault.
3. You get a vault that a cold agent can navigate immediately.

**When to use:** First time setting up any vault. Works for research, startups, personal life systems, content operations, engineering, or any other purpose.

**Scale choices:**
- Small vault (personal topic, early research): minimal structure — `Raw/Sources/`, `Inbox/`, `Research/`, `Concepts/`, `Questions/`, `Decisions/`, `Outputs/`
- Medium vault (active project, startup): adds `Agent/` nav files, `Entities/`, `Relationships/`, `Bases/`, `Processing Queue/`, mode-specific folders
- Large vault (multiple recurring workstreams): promotes each workstream into a child scope with its own hub, routing, and optional local rules

**Optional global discovery:**

If you want agents launched from any folder on your machine to find this vault for vague long-term-context questions, register it:

```bash
node skills/obsidian-agentic-vault/scripts/register_vault.js \
  --vault "/path/to/vault" \
  --name "My Knowledge Vault" \
  --purpose "Long-term project and research knowledge." \
  --agents codex,claude,gemini \
  --primary
```

This writes `~/.ariadne/vaults.json`, `~/.ariadne/vaults.md`, and tiny marker-managed pointers in selected global agent files. See `docs/guides/global-discovery.md`.

---

## Scenario 2: Register an Existing Vault For Global Discovery

**What to say:**
> "Make this vault discoverable to agents"
> "Register my existing Ariadne vault globally"
> "Make agents find this vault from anywhere"

**What happens:**
1. `obsidian-vault-discovery` checks the target path for Ariadne entry files.
2. It creates or updates `~/.ariadne/vaults.json` and `~/.ariadne/vaults.md`.
3. It optionally updates selected global agent instruction files with tiny marker-managed pointers.
4. Future cold agents can read the registry first, then enter the vault through `00 Index.md`, `AGENTS.md`, and `Agent/00 Agent Navigation.md`.

**When to use:** You skipped registration during vault creation, imported an older vault, changed machines, or want to repair global discovery later.

**Command:**

```bash
node skills/obsidian-agentic-vault/scripts/register_vault.js \
  --vault "/path/to/vault" \
  --name "My Knowledge Vault" \
  --purpose "Long-term project and research knowledge." \
  --agents codex,claude,gemini \
  --primary
```

To unregister a vault later:

```bash
node skills/obsidian-agentic-vault/scripts/register_vault.js \
  --vault "/path/to/vault" \
  --agents codex,claude,gemini \
  --remove
```

---

## Scenario 3: Add a Domain Scope to an Existing Vault

**What to say:**
> "Add a scope for [domain name] — it will [describe the recurring job]"

**What happens:**
1. `obsidian-scope-manager` reads the root `AGENTS.md` and `Agent/Task Routing Matrix.md`.
2. Creates the scope folder, hub, local `AGENTS.md` (delta only), routing row, parent/child nav links.
3. If the scope will ingest raw material, creates `Raw/Sources/`, `Inbox/`, `Processing Queue/`, and a local `Agent/Ingest Compile Workflow.md`.
4. Updates root `Bases/*.base` scope formulas so notes in the new scope appear correctly in global views.
5. Validates — `routing-matrix-warnings: 0` and `base-scope-formula-warnings: 0` confirm it's fully wired.

**When to use:** Adding a new project, content brand, research area, or life domain to an existing vault that already has the root layer.

**Scope inheritance rules:**
- Root `AGENTS.md` applies everywhere. Domain `AGENTS.md` adds only local deltas — never repeats global rules.
- Each domain scope can have its own `Concepts/`, `Research/`, `Decisions/` etc. — these are domain-specific, separate from the root `Concepts/` (which holds vault-wide design principles).

---

## Scenario 4: Add a Research Pipeline Inside a Domain

**What to say:**
> "Add a research pipeline to [domain]"
> "Set up research intake and synthesis for [domain]"

**What happens:**
1. `obsidian-research-pipeline` reads the scope hub, local agent navigation, routing matrix, and existing research folder.
2. Creates or updates the local research pipeline: `Raw/Sources/`, `Inbox/`, `Processing Queue/`, `Research/`, synthesis/thread hubs, `Concepts/`, `Entities`, `Relationships/`, `Questions/`, templates, and optional local Bases.
3. Adds local ingest and knowledge-processing workflow notes when needed.
4. Wires routing rows so future source intake and synthesis start from the smallest useful context set.
5. Validates the resulting structure.

**When to use:** A domain already exists, but research is still just a folder or a few notes. Use this before recurring source ingest or research sprints.

**Scale choices:**
- Small domain: research index, source index, synthesis note, thread hub, ingest workflow, routing rows.
- Active research domain: add concepts, entities, relationships, questions, templates, and local `Research Pipeline.base`.
- Mature domain: add health-check coverage and more local Bases when metadata inspection helps.

---

## Scenario 5: Cold-Start Research Ingest

**What to say:**
> "Research ingest https://example.com"
> "Save this research source"

**What happens:**
1. `obsidian-research-ingest` reads the root routing layer and active domain registry.
2. If no domain is named, it asks which domain should receive the research.
3. It checks whether the target domain has a research pipeline.
4. If the pipeline is missing, it invokes `obsidian-research-pipeline` first.
5. It uses `obsidian-ingest-compile` to capture raw source metadata and compile a source-backed research note.
6. It updates synthesis/thread hubs only when the source changes the research map.

**When to use:** You are entering a cold agent session with a source link or research material and do not want to remember the vault routing rules.

**What gets created or updated:**
- `Raw/Sources/YYYY-MM-DD Source Title.md` when raw capture is useful
- `Research/Source Title.md` for compiled source-backed understanding
- synthesis/thread hubs, concepts, entities, relationships, and questions when the source warrants it

---

## Scenario 6: Direct Ingest Into a Specific Domain

**What to say:**
> "Ingest this link into [domain]" or "Add this to [domain] research"

**Cold start routing chain** (what the agent does automatically):
1. Reads root `AGENTS.md` → sees the read-first list including `Agent/Task Routing Matrix.md`
2. Reads `Agent/Task Routing Matrix.md` → finds explicit row for "Shared link or source material for [domain]"
3. Reads domain `AGENTS.md` → gets local scope boundary and routing rules
4. Reads domain `Agent/Task Routing Matrix.md` → finds "Shared link or article" row → reads local `Agent/Ingest Compile Workflow.md`
5. Executes the full ingest: raw capture → extract claims → compile research note → update concepts/entities/synthesis → link from hub

**What gets created:**
- `Raw/Sources/YYYY-MM-DD Source Title.md` — timestamped raw capture with metadata
- `Research/Source Title.md` — compiled synthesis note with source claims and interpretation separated
- Updates to relevant concept notes, entity notes, synthesis hubs, and research index

**If intake infrastructure doesn't exist yet** (new scope with no `Raw/Sources/`): `obsidian-ingest-compile` sets it up silently before the first ingest. You never need to create it manually.

**If you don't name a domain:** material lands in the root `Raw/Sources/` and `Processing Queue/` with a note to route it to a specific scope later.

---

## Scenario 7: Synthesize a Research Thread

**What to say:**
> "Synthesize the [topic] research thread"
> "Update the [domain] research synthesis with recent sources"

**What happens:**
1. `obsidian-research-synthesis` reads the domain research hub and thread hub.
2. Gathers compiled research notes — does not re-read raw sources unless compiled notes are insufficient.
3. Updates the synthesis note: what is known, what is inferred, what is contested, open questions, implications.
4. Updates thread hub and relevant concept/entity notes.

**When to use:** After ingesting multiple sources on the same topic. After a research sprint. When you want a single synthesis note that a future cold agent can read first instead of opening every source.

**Cross-scope synthesis:** If a topic spans two domains (e.g. OCG and Signal Theory both reference context graphs), the synthesis note belongs at the nearest common parent — usually the root `Research/` or a shared relationship note. It links to child-scope evidence, never duplicates it.

---

## Scenario 8: Redesign Navigation or Add a Workstream

**What to say:**
> "Add a workstream for [topic] inside [domain]"
> "The [folder] hub is too long — split it"
> "Wire up routing for [recurring task]"

**What happens:**
1. `obsidian-navigation-architect` reads the vault navigation layer.
2. Creates or updates: folder hub, thread hub, routing row in `Agent/Task Routing Matrix.md`, Base if metadata inspection helps, local `AGENTS.md` if specialized rules are needed.
3. Calls out bloat signals proactively: entry files acting as tables of contents, hubs too long to scan, recurring workstreams with no routing row.

**When to use:** When a folder has grown enough to need its own map. When a recurring task type has no routing row. When navigation drift makes the vault harder to traverse.

---

## Scenario 9: Health Check

**What to say:**
> "Run a vault health check"
> "Check for broken links and stale content"

**Two tools work together:**

`obsidian-vault-maintainer` — reads the vault, checks for:
- raw sources never compiled
- orphan notes with no links
- stale inbox/queue/output buildup
- hubs missing links, Bases missing scope filters
- local AGENTS.md files repeating parent policy

`obsidian-vault-validator` — deterministic CLI check (11 counters):
```bash
node /path/to/skills/obsidian-vault-validator/scripts/validate_vault.js "/path/to/vault"
```
Target: all 11 counters at 0.

See `docs/guides/validator.md` for the full counter reference.

---

## Scenario 10: Cold Start in an Existing Vault

If you open a new agent session and want it to orient fast:

**What to say:**
> "Read the vault context and tell me what's here"

**What the agent reads** (in order):
1. `AGENTS.md` — scope inheritance rules and global policy
2. `00 Global Index.md` — strategic map
3. `Agent/00 Agent Navigation.md` — routing map
4. `Agent/Task Routing Matrix.md` — task entry selector
5. `Domains/00 Domains Index.md` — scope registry

That's the full cold-start context. The agent should not read more until it knows which task to do.

If the session starts outside the vault and the vault has been registered globally, the agent should first read `~/.ariadne/vaults.md`, choose the relevant vault, then follow the entry order above.

---

## Skill Chains: Common Combinations

### New vault → first ingest

```
obsidian-agentic-vault   → creates vault structure
obsidian-research-ingest → first research source enters the right scope
obsidian-vault-validator → confirms structure is clean
```

### New scope → ready for ingest

```
obsidian-scope-manager   → creates scope, hub, routing, intake infrastructure
obsidian-research-ingest → first research source enters the new scope
obsidian-vault-validator → confirms routing-matrix-warnings: 0, base-scope-formula-warnings: 0
```

### Existing scope → research pipeline

```
obsidian-research-pipeline → creates research hubs, local intake, routing, optional Bases
obsidian-research-ingest   → first source enters the scope
obsidian-ingest-compile    → compiles the source once the scope is known
obsidian-research-synthesis → updates synthesis and thread hub after multiple sources
obsidian-vault-validator   → confirms structure is wired
```

### Research sprint → synthesis

```
obsidian-research-ingest    (×N sources, if scope may be unclear)
obsidian-ingest-compile     (×N sources, if scope is known)
obsidian-research-synthesis → synthesis note + thread hub
obsidian-vault-maintainer   → confirm no orphans or stale queue items
```

### Navigation drift repair

```
obsidian-vault-maintainer    → identifies what's drifting
obsidian-navigation-architect → fixes hubs, routing, Bases
obsidian-vault-validator     → confirms all counters back to 0
```

### Periodic vault maintenance

```
obsidian-vault-validator  → find structural issues
obsidian-vault-maintainer → find content/navigation issues
obsidian-ingest-compile   → process any stale raw/inbox items
```

---

## What Each Folder Does

| Folder | Purpose |
| --- | --- |
| `Raw/Sources/` | Timestamped raw captures — articles, tweets, PDFs, repos. Never modified after capture. |
| `Inbox/` | Rough human input, brain dumps, unstructured notes. Always temporary. |
| `Processing Queue/` | Items that need triage, compilation, or follow-up. |
| `Research/` | Source-backed compiled synthesis. Claims separated from interpretation. |
| `Concepts/` | Reusable mental models and definitions. One note per concept. |
| `Entities/` | Durable objects: people, companies, products, platforms. |
| `Relationships/` | Durable connections between entities that deserve explicit explanation. |
| `Decisions/` | Dated commitments with context and rationale. |
| `Questions/` | Unresolved questions and future research prompts. |
| `Outputs/` | Generated artifacts: briefs, memos, slide drafts, diagrams. File back into wiki if durable. |
| `Agent/` | Agent instructions, routing matrices, workflows, health check procedures. |
| `Bases/` | `.base` view files — live queries over Markdown metadata. Not the source of truth. |
| `Templates/` | Reusable note shapes. |
| `Archive/` | Inactive or superseded material. |

Root `Concepts/` (in multi-scope vaults) holds vault-wide design principles. Domain scopes each keep their own `Concepts/` for domain-specific ideas.

---

## Common Mistakes

**Putting domain content at the root.** Root is global operating layer only. Domain work belongs inside `Domains/<name>/`.

**Ingesting without naming a scope.** Always tell the agent which domain the material belongs to. If you're unsure, use the root intake queues and route later.

**Creating child scopes preemptively.** A scope should emerge from recurring use, not from planning. If a folder has no recurring workflow yet, keep it as a plain folder.

**Repeating global rules in local `AGENTS.md`.** Local files add deltas only. Repeating root rules breaks the inheritance model and triggers `local-agents-inheritance-warnings`.

**Using Bases as the source of truth.** Bases are live queries. The Markdown files are the actual knowledge base. Never put durable content only in a Base.

**Letting raw sources pile up without compiling.** Every raw capture should eventually become a compiled research note, concept, decision, or question. Raw-only material is a maintenance debt.
