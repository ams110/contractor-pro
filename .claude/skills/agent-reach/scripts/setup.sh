#!/usr/bin/env bash
# agent-reach — تجهيز البيئة (idempotent، ~دقيقة أول مرة، ثوانٍ إذا مركّب)
# الحاوية الريموت تُمسح بين الجلسات، فشغّل هذا السكربت أول ما تحتاج السكيل.
set -euo pipefail

VENV=/root/.agent-reach-venv

# 1) venv ببايثون حديث البناء (setuptools نظام ديبيان القديم يفشل ببناء sgmllib3k)
if [ ! -x "$VENV/bin/agent-reach" ]; then
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --quiet --upgrade pip setuptools wheel
  "$VENV/bin/pip" install --quiet "git+https://github.com/Panniantong/Agent-Reach.git" yt-dlp imageio-ffmpeg
fi

# 2) روابط تنفيذية عامة
ln -sf "$VENV/bin/agent-reach" /usr/local/bin/agent-reach
ln -sf "$VENV/bin/yt-dlp" /usr/local/bin/yt-dlp

# 3) ffmpeg ثابت (بدون apt) من imageio-ffmpeg
FF=$("$VENV/bin/python" -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")
ln -sf "$FF" /usr/local/bin/ffmpeg

# 4) yt-dlp يحتاج JS runtime (node موجود بالبيئة)
mkdir -p /root/.config/yt-dlp
grep -qxF -- '--js-runtimes node' /root/.config/yt-dlp/config 2>/dev/null \
  || printf '%s\n' '--js-runtimes node' >> /root/.config/yt-dlp/config

echo "✅ agent-reach $(agent-reach --version 2>/dev/null || echo ok) | yt-dlp $(yt-dlp --version) | $(ffmpeg -version | head -1 | cut -d' ' -f1-3)"
