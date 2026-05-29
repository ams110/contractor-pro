#!/bin/bash
# Auto-commit and push any uncommitted changes at session end

cd "$CLAUDE_PROJECT_DIR"

# Nothing to do if working tree is clean
if git diff --quiet && git diff --cached --quiet; then
  exit 0
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)

git add -A
git commit -m "chore: auto-commit uncommitted changes at session end"

# Push with retry (exponential backoff)
for WAIT in 0 2 4 8 16; do
  [ "$WAIT" -gt 0 ] && sleep "$WAIT"
  if git push -u origin "$BRANCH" 2>&1; then
    exit 0
  fi
done

exit 1
