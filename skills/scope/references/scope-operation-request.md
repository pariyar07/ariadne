# Scope Operation Request

`sync_scope_topology.js` is the only topology mutation authority. Resolve it relative to the installed `ariadne:validator` skill. Requests use exact schema v1; unknown, missing, operation-inapplicable, absolute, traversing, duplicate-normalized, or malformed fields are refused before writes.

## Preview And Authorization

First run `--check` (optionally with `--scope`) for a zero-write audit. Construct the operation with `allowed_write_paths: []` and run `--write --request`; it refuses with `operation is not write-authorized: missing-write-authorization:<path>` and makes zero writes. Copy the complete, sorted `content_write_paths` disclosed by the plan into `allowed_write_paths`, disclose them to the user, obtain current-turn confirmation, then run the authorized request. Do not add unused paths: `unused-write-authorization:<path>` is also refused.

`allowed_write_paths` contains vault-relative content paths only. Engine control paths such as `.ariadne/scope-topology.lock`, `.ariadne/scope-topology-operation.json`, candidate stages, and owned temporary files are validator-owned recovery state and never belong in `allowed_write_paths`.

## Exact Requests

```json
{"operation_schema":1,"operation":"create","target_scope_id":"alpha","destination_path":"Domains/Alpha","normalize_files":[],"allowed_write_paths":[]}
```

```json
{"operation_schema":1,"operation":"adopt","target_scope_id":"alpha","adoption_mode":"ancestor-chain","normalize_files":[],"allowed_write_paths":[]}
```

`adoption_mode` is exactly `ancestor-chain` or `whole-vault`.

```json
{"operation_schema":1,"operation":"move","target_scope_id":"alpha","source_path":"Domains/Alpha","destination_path":"Projects/Alpha","normalize_files":[],"allowed_write_paths":[]}
```

```json
{"operation_schema":1,"operation":"set-status","target_scope_id":"alpha","desired_status":"archived","normalize_files":[],"allowed_write_paths":[]}
```

Statuses are `active`, `archived`, or `retired`. Retirement may add `"replacement_scope_id":"beta"`; that field is invalid for every other transition or operation.

```json
{"operation_schema":1,"operation":"repair","target_scope_id":"root","normalize_files":[],"allowed_write_paths":[]}
```

`normalize_files` is an explicit list of content files whose generated marker blocks may be normalized. It is never blanket permission.

## Commands And Recovery

```bash
node /path/to/skills/validator/scripts/sync_scope_topology.js /path/to/vault --check
node /path/to/skills/validator/scripts/sync_scope_topology.js /path/to/vault --check --scope "Domains/Alpha"
node /path/to/skills/validator/scripts/sync_scope_topology.js /path/to/vault --write --request /path/to/request.json
node /path/to/skills/validator/scripts/sync_scope_topology.js /path/to/vault --resume 00000000-0000-0000-0000-000000000000
node /path/to/skills/validator/scripts/sync_scope_topology.js /path/to/vault --abort 00000000-0000-0000-0000-000000000000
```

On interruption, report the operation ID. Resume replays the sealed plan after identity, checksum, and precondition checks. Abort removes only engine-owned temporary/control state and returns `{ "aborted": true, "operation_id": "...", "reconciliation_paths": [...] }`; listed content paths may already have landed and require evidence-backed reconciliation. Never hand-edit control files.
