# Knowledge Processing Architecture

Use this reference when a vault needs to grow coherently over time instead of becoming a folder of disconnected notes.

## Principle

Knowledge management and task execution are different jobs.

Task agents may answer questions, generate outputs, or execute project work. A knowledge-processing workflow maintains the vault's structure: ingest, compile, link, index, lint, and archive.

## Intake Interfaces

Support three intake paths:

- `Raw/Sources/` for external sources: articles, papers, repos, tweets, PDFs, videos, screenshots, datasets.
- `Inbox/` for human brain dumps, rough thoughts, meeting notes, voice transcripts, and unstructured project context.
- `Outputs/` for generated briefs, artifacts, charts, specs, and slides that should be filed back into the wiki if durable.

## Processing Queue

Create a processing item when an input needs follow-up.

Recommended statuses:

- `captured`
- `processing`
- `compiled`
- `linked`
- `needs-review`
- `archived`

## Processing Passes

### 1. Triage

Decide whether the item is:

- discardable
- raw-only
- source-backed research
- concept candidate
- entity candidate
- relationship candidate
- decision candidate
- output candidate

### 2. Extraction

Extract:

- source claims
- entities
- relationships
- concepts
- decisions
- open questions
- potential outputs

Keep source claims separate from interpretation.

### 3. Contextual Linking

Create meaningful links, not decorative links.

Examples:

- brand guide -> audience -> positioning -> content strategy
- customer persona -> pain -> workflow -> product decision
- paper -> claim -> concept -> implementation note
- meeting note -> decision -> project roadmap
- source -> entity -> relationship -> output

### 4. Compilation

Convert raw material into durable notes in the appropriate folder.

Compiled notes should include:

- summary
- what is known
- what is inferred
- links to sources
- related concepts/entities
- open questions

### 5. Visibility

Make the knowledge base inspectable through:

- `00 Index.md`
- folder index notes
- `.base` views
- Canvas maps
- health check reports
- generated artifacts in `Outputs/`

## Optional Visual Layer

Do not make a 3D graph a default requirement. For most vaults, use Obsidian Canvas and Bases first.

If a vault becomes client-facing or productized, a custom dashboard or interactive graph can be built later. The Markdown vault remains the source of truth.

## Guardrail

Do not let task-running agents restructure the vault opportunistically. They can propose changes or write outputs, but durable structural changes should follow this processing workflow.
