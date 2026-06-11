#!/bin/bash
set -euo pipefail

# Only run on Claude Code Web
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

echo "Installing npm dependencies..."
npm install

# بيئة معاينة للساندبوكس: supabase.js يرمي خطأ بدون env والصفحة تطلع سوداء.
# قيم وهمية تكفي لعرض الواجهة محلياً (الملف ضمن .gitignore — لا يُرفع أبداً).
if [ ! -f .env.local ]; then
  cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://example.supabase.co
VITE_SUPABASE_ANON_KEY=dummy-key-for-sandbox-preview
EOF
  echo "Created .env.local (dummy Supabase env for sandbox preview)."
fi

echo "Session setup complete."
