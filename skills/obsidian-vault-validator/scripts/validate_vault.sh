#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

if ! command -v node >/dev/null 2>&1; then
  echo "error: Node.js is required to run the Obsidian vault validator." >&2
  echo "Install Node.js, or run the validator from an agent/runtime that includes Node.js." >&2
  exit 127
fi

exec node "$script_dir/validate_vault.js" "$@"
