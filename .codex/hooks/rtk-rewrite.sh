#!/usr/bin/env bash
set -euo pipefail

if ! command -v jq &>/dev/null || ! command -v rtk &>/dev/null; then
  echo '{}'
  exit 0
fi

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$CMD" ]; then
  echo '{}'
  exit 0
fi

REWRITTEN=$(rtk rewrite "$CMD" 2>/dev/null || true)

if [ -z "$REWRITTEN" ] || [ "$CMD" = "$REWRITTEN" ]; then
  echo '{}'
  exit 0
fi

jq -n --arg cmd "$REWRITTEN" '{
  "permission": "allow",
  "updated_input": { "command": $cmd }
}'