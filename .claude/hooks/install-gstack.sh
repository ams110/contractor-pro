#!/bin/bash
# Install gstack (Garry Tan's Claude Code skill suite) into the user-global
# skills dir so it auto-loads in every session for this repo.
#
# The cloud container is ephemeral (rebuilt each session), so this re-installs
# gstack on every fresh session. It is launched in the BACKGROUND from
# session-start.sh (setsid) so it never blocks session start, and it is
# best-effort: any failure exits cleanly and never breaks the session.
#
# Progress/errors are logged to /tmp/gstack-install.log.
set -uo pipefail

GSTACK_DIR="$HOME/.claude/skills/gstack"

# Idempotent: if setup already completed (browse binary built), do nothing.
if [ -x "$GSTACK_DIR/browse/dist/browse" ]; then
  echo "gstack already installed."
  exit 0
fi

# Requirements - silently skip if the toolchain isn't present.
command -v git >/dev/null 2>&1 || { echo "git missing - skipping gstack."; exit 0; }
command -v bun >/dev/null 2>&1 || { echo "bun missing - skipping gstack."; exit 0; }

# Fresh shallow clone if not already present.
if [ ! -d "$GSTACK_DIR/.git" ]; then
  rm -rf "$GSTACK_DIR"
  git clone --single-branch --depth 1 \
    https://github.com/garrytan/gstack.git "$GSTACK_DIR" || { echo "clone failed."; exit 0; }
fi

# Register skills + build the browse binary for Claude Code (non-interactive).
cd "$GSTACK_DIR" && ./setup --host claude --quiet || true

echo "gstack install finished."
