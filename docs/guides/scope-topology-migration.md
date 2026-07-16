# Scope Topology Migration

Schema-v1 scope topology is opt-in for existing vaults. Updating installed skills does not rewrite vault content, infer scope boundaries, or activate strict topology. Run the validator first, review candidates, and choose an adoption mode explicitly.

## Adoption Modes

- **whole-vault adoption** adopts every approved scope candidate in one disclosed operation.
- **ancestor-chain adoption** adopts only the root-to-target chain needed for one selected scope. Unselected siblings remain legacy content.

Both modes preserve named hubs and user content. Adoption creates canonical checkpoint files or generated blocks; it does not move, merge, rename, archive, or delete existing notes. Use `ariadne_scope_adoption: dismissed` on an intentional legacy hub to suppress its repeated candidate warning without making it a scope.

`adopt` discovers legacy candidates from local `AGENTS.md` presence: any directory with a local `AGENTS.md` is eligible (the vault root is always eligible), except directories already active, already pending, hidden/tool-owned (any directory whose path has a dot-prefixed segment, for example `.ariadne`, `.claude`, `.codex`), or carrying `ariadne_scope_adoption: dismissed` on their `AGENTS.md` or any `00 * Index.md` file in that directory (a bare `00 Index.md` or a named index such as `00 Product Index.md`). A directory with only a named index gets a fresh canonical `00 Index.md` created alongside it, preserving the named index untouched; a directory with an unrecognized bare `00 Index.md` gets `scope_schema` frontmatter merged into that existing file, preserving its body. A directory holding a malformed *explicit* `type: scope-index` file is never reinterpreted as legacy content — adoption refuses, identifying the file and parse error, so a scope that already declared (even broken) identity is never silently overwritten.

`scope_id` is derived deterministically from the directory basename, falling back first to a full-path slug and finally to a hash-of-path suffix when even the full-path slug collides (for example `A-B/X` and `A/B/X`, which both slugify to `a-b-x`). For `ancestor-chain` mode, `target_scope_id` must be the derived ID of the intended target — `ariadne:scope` should state the exact ID it computed before you confirm the write set.

An `adopt` call against an already-active root (adopting more legacy scopes after the vault's first adoption) merges the newly-selected candidates into the existing active topology; already-active scopes, including root, are never dropped from the write-time model.

Generated `title` and `scope_path` values (and `former_scope_paths`/redirect path fields) are serialized through a minimal YAML scalar quoter, not raw interpolation. A value needing both a `'` and a `"` at once, a backslash, or a control character — combinations this codebase's own simplified frontmatter parsers cannot safely round-trip — causes adoption to refuse with a clear error rather than emit unsafe YAML; rename the source title (the legacy hub's `title:` field) or the folder itself before retrying. A folder path that violates the schema's existing Windows-compatibility character restrictions (`normalizeScopePath`, for example a literal `:` in a folder name) is refused the same way; rename the folder.

Preview the operation with the `sync_scope_topology.js` bundled with the installed validator skill. Inspect its findings, exact sorted `content_write_paths`, and plan hash. Authorize only that set in the operation request. Progressive adoption writes descendants inward and performs root activation last, so strict topology never claims a partially activated tree.

## Generated Checkpoints And Views

Every adopted scope has `00 Index.md`, `AGENTS.md`, `Agent/00 Agent Navigation.md`, and `Agent/Task Routing Matrix.md`. A checkpoint may be generated-only when it has no local additions; user extensions outside Ariadne marker blocks are preserved.

Canonical Markdown descriptors and checkpoint blocks own stable scope identity and topology. `Bases/Scope Registry.base` and `Agent/Scope Map.canvas` are fully derived optional views; `Agent/Scope Map.md` has a derived marker block. Obsidian is not required to adopt, synchronize, or validate the contract. Do not repair these views by hand. Other Base formulas are audited for child-before-parent ordering but remain report-only: the synchronizer does not authorize or rewrite them.

Each scope in `Agent/Scope Map.canvas` is one text node carrying a clickable, qualified link to its canonical `00 Index.md`, plus its title, `scope_id`, and `scope_path`. A separate file node is intentionally omitted because Obsidian labels every canonical scope file as the indistinguishable filename `00 Index`.

Generated checkpoint and map links are qualified across scope boundaries. Root targets use explicit relative paths from the generated artifact, while non-root targets use vault-relative paths, so a child scope never mistakes its own `00 Index.md` or `AGENTS.md` for the root file with the same basename.

## Interrupted Operations

The synchronizer seals its manifest and lock under `.ariadne/`. A live lock or changed precondition causes refusal. Do not delete or edit these controls.

- Use `--resume <operation-id>` to validate hashes, identities, and preconditions before continuing.
- Use `--abort <operation-id>` to close the operation and return reconciliation paths.

Abort is not a content rollback: some authorized replacements may already have landed. Inspect every reconciliation path, compare it with the manifest, and either authorize a new repair or restore content from your own version-control/backup policy. Never improvise a metadata-only rollback that breaks physical ancestry.

## Verification And Reconciliation

After adoption or repair, run scoped validation, then whole-vault validation, then a second synchronizer `--check`. The second check must propose no changes. If it does, stop and reconcile the named descriptor, checkpoint, or derived artifact; do not repeatedly write over unexplained drift.

Moves preserve `scope_id`, append the old location to `former_scope_paths`, and leave an explicit redirect when authorized. Lifecycle transitions, IDs, parent changes, moves, cleanup, and destructive consolidation require separate approval. Automatic repair does not decide them.

## Updating Installed Skills

An installed skill is a copy, not a live migration service. Update the Ariadne skill package first, confirm that `validate_vault.js` and `sync_scope_topology.js` come from the same installed version, then preview against the vault. Do not mix a new request schema with an older synchronizer. Updating installed skills alone must leave vault files unchanged.
