# Changelog

All notable Ariadne releases are documented here. Ariadne follows Semantic Versioning while it is pre-1.0: minor releases may contain breaking changes.

## [Unreleased]

## [0.2.1] - 2026-07-16

### Changed

- Position Ariadne around filesystem-backed Markdown knowledge vaults; Obsidian remains an optional, recommended frontend and compatibility target.
- Use frontend-neutral global discovery wording while preserving Obsidian-compatible wikilinks and optional Bases, Canvas, Kanban, Dataview, and CLI integrations.
- Add the canonical GitHub social-preview asset.

## [0.2.0] - 2026-07-15

### Added

- `ariadne:research-ingest`, `ariadne:research-synthesis`, and `ariadne:research-stewardship`.
- Research schema v1 boundary, inquiry, synthesis, provenance, and exact/rollup contracts.
- Scoped research validation and five non-fatal research counters.
- Deterministic research lifecycle fixtures and migration guardrails.

### Changed

- Research ingest now requires a current-turn confirmed target and closed write set in multi-scope vaults.
- Synthesis disposition is durable and owned exclusively by `ariadne:research-synthesis`.
- Whole-vault maintenance routes research-semantic work to stewardship.

### Removed

- `ariadne:research-intake` and its `skills/research-intake/` folder.
- `ariadne:synthesis` and its `skills/synthesis/` folder.

### Migration

This is a breaking release. Reinstall the skill package, remove stale copied retired folders, and update saved prompts and external automations. See [Research Lifecycle Migration](docs/guides/research-lifecycle-migration.md).

[Unreleased]: https://github.com/pariyar07/ariadne/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/pariyar07/ariadne/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/pariyar07/ariadne/releases/tag/v0.2.0
