#!/bin/bash
set -euo pipefail

# Only run on Claude Code Web
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install repo-bundled Claude skills into the user-global skills dir so they
# auto-load in every session for this repo (the cloud container is ephemeral).
SKILLS_SRC="$CLAUDE_PROJECT_DIR/.claude/skills"
SKILLS_DEST="$HOME/.claude/skills"
if [ -d "$SKILLS_SRC" ]; then
  echo "Installing bundled skills into $SKILLS_DEST..."
  mkdir -p "$SKILLS_DEST"
  cp -R "$SKILLS_SRC/." "$SKILLS_DEST/"
fi

echo "Installing npm dependencies..."
npm install

echo "Session setup complete."
