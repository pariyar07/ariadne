# Changelog

All notable Ariadne releases are documented here. Ariadne follows Semantic Versioning while it is pre-1.0: minor releases may contain breaking changes.

## [Unreleased]

### Fixed

- `ariadne:scope`'s `adopt` operation now discovers legacy candidates (local `AGENTS.md` presence, per the scope topology LLD) so whole-vault and ancestor-chain adoption work on vaults with zero pre-existing `type: scope-index` descriptors. Previously `create`, `adopt`, and `repair` all required a scope to already be tagged or already adopted, so a genuinely unmigrated vault (root included) could never take its first `sync_scope_topology.js --write` step, contradicting the documented "whole-vault adoption adopts every approved scope candidate" behavior. Root titles now also come from an existing legacy hub when present instead of a hardcoded `"Vault"`.

## [0.3.0] - 2026-07-16

### Added

- Schema-v1 scope descriptors with immutable `scope_id` values, canonical vault-relative paths, explicit ancestry, and lifecycle metadata.
- Deterministic generated scope wayfinding: checkpoint cores, `Bases/Scope Registry.base`, `Agent/Scope Map.md`, and `Agent/Scope Map.canvas`.
- Whole-vault and subtree `--profile scope` validation with stable findings and three non-fatal scope counters.
- A dependency-free topology synchronizer with declarative write authorization, precondition hashes, single-writer locks, resumable manifests, and explicit abort reconciliation.

### Changed

- Scope creation, adoption, relocation, lifecycle changes, and repair now flow through one canonical topology model shared by validation and synchronization.
- Existing vaults adopt the contract explicitly through whole-vault or root-to-target ancestor-chain migration; legacy content and named hubs are preserved.
- Markdown checkpoints and descriptors remain canonical and do not require Obsidian. Bases and Canvas are optional, derived view artifacts.

### Migration

Updating skills does not activate or rewrite an existing vault. Review [Scope Topology Migration](docs/guides/scope-topology-migration.md), preview the exact write set, select an adoption mode, and verify scoped validation, whole-vault validation, and a no-change second synchronizer check.

### Verification

- Deterministic topology, rendering, operation, failure-injection, recovery, template, recursive-scope, registration, and workspace-instruction suites.
- Repository and skill guardrails, release-link audit, private-path audit, and clean-diff checks.
- Public implementation: [PR #37](https://github.com/pariyar07/ariadne/pull/37).

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

[Unreleased]: https://github.com/pariyar07/ariadne/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/pariyar07/ariadne/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/pariyar07/ariadne/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/pariyar07/ariadne/releases/tag/v0.2.0
