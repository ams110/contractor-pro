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
# npm ci يثبّت من الـlockfile بلا ما يعدّله أبداً — npm install كان يولّد
# فرق 500+ سطر بالساندبوكس، وhook نهاية الجلسة يرفعه commit نويز للبرانش.
npm ci --no-audit --no-fund || npm install

# بيئة معاينة للساندبوكس: supabase.js يرمي خطأ بدون env والصفحة تطلع سوداء.
# قيم وهمية تكفي لعرض الواجهة محلياً (الملف ضمن .gitignore — لا يُرفع أبداً).
if [ ! -f .env.local ]; then
  cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://example.supabase.co
VITE_SUPABASE_ANON_KEY=dummy-key-for-sandbox-preview
EOF
  echo "Created .env.local (dummy Supabase env for sandbox preview)."
fi

# Install gstack skill suite SYNCHRONOUSLY (blocking) so it is fully armed
# before the first message. The container is ephemeral, so gstack is
# re-installed each session (~1-2 min: clone + browse build + 110MB Chromium).
# Best-effort: `|| true` ensures a failure never aborts session start.
# NOTE: the SessionStart hook needs a generous `timeout` in settings.json to
# allow this to finish (see .claude/settings.json).
if [ -x "$CLAUDE_PROJECT_DIR/.claude/hooks/install-gstack.sh" ]; then
  echo "Installing gstack skill suite (blocking; can take 1-2 min on a fresh session)..."
  "$CLAUDE_PROJECT_DIR/.claude/hooks/install-gstack.sh" || true
fi

echo "Session setup complete."
