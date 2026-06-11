#!/bin/bash
set -euo pipefail

# Only run on Claude Code Web
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Resolve project dir (CLAUDE_PROJECT_DIR is set by the harness; fall back to repo root)
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$PROJECT_DIR"

echo "Installing npm dependencies..."
npm install

echo "Session setup complete."
