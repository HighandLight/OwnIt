#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

pnpm build

SMOKE_HOME="$(mktemp -d)"
trap 'rm -rf "$SMOKE_HOME"' EXIT
export HOME="$SMOKE_HOME"

node dist/cli/index.js init --lang ko

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "OPENAI_API_KEY not set — skipping LLM-dependent check step"
else
  node dist/cli/index.js check --text "샘플 Codex 답변 텍스트" --no-save
fi

echo "Smoke test passed"
