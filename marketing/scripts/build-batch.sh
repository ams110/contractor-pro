#!/usr/bin/env bash
# تركيب دفعة 4 ريلز: #2 محاسب · #3 بوّابة العامل POV · #4 بلا نت · #5 מע"מ 18%
# تصدير نظيف: شعار Contractor Pro فقط، بلا أي علامة منصّة.
set -e
FF=/usr/local/bin/ffmpeg
FP=/tmp/node_modules/ffprobe-static/bin/linux/x64/ffprobe
D=/home/user/contractor-pro/marketing/promo-frames/batch
SH=/home/user/contractor-pro/shots
FPS=30
VENC="-c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r $FPS -an"

# بطاقة كاملة (هوك/ختام) بزوم خفيف
card(){ $FF -y -loglevel error -loop 1 -t "$3" -i "$1" \
  -filter_complex "[0:v]scale=1188:2112,zoompan=z='min(zoom+0.0006,1.06)':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=$FPS,trim=duration=$3,setsar=1,format=yuv420p[v]" \
  -map "[v]" -t "$3" $VENC "$2"; echo "✅ $2"; }
# صورة cover + Ken Burns + overlay شفّاف
imgc(){ $FF -y -loglevel error -loop 1 -t "$3" -i "$1" -loop 1 -t "$3" -i "$4" \
  -filter_complex "[0:v]scale=1188:2112:force_original_aspect_ratio=increase,crop=1188:2112,zoompan=z='min(zoom+0.0007,1.07)':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=$FPS,trim=duration=$3,setsar=1[v0];[v0][1:v]overlay=0:0,format=yuv420p[v]" \
  -map "[v]" -t "$3" $VENC "$2"; echo "✅ $2"; }
# فيديو cover + overlay شفّاف + قص
vidc(){ $FF -y -loglevel error -i "$1" -loop 1 -i "$4" \
  -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=$FPS,trim=duration=$3,setpts=PTS-STARTPTS[v0];[1:v]format=rgba[ov];[v0][ov]overlay=0:0:shortest=1,setsar=1,format=yuv420p[v]" \
  -map "[v]" -t "$3" $VENC "$2"; echo "✅ $2"; }
# شاشة حقيقية: بان لأسفل + overlay
scr(){ $FF -y -loglevel error -loop 1 -t "$3" -i "$1" -loop 1 -t "$3" -i "$4" \
  -filter_complex "[0:v]scale=1080:-1,crop=1080:1920:0:'min((ih-1920)*t/$3\,ih-1920)',setsar=1[v0];[v0][1:v]overlay=0:0,format=yuv420p[v]" \
  -map "[v]" -t "$3" $VENC "$2"; echo "✅ $2"; }

# يجمع seg(قائمة) + vo + موسيقى → ناتج نهائي
mux(){ local out="$1" vo="$2"; shift 2
  printf "file '%s'\n" "$@" > "$D/list.txt"
  $FF -y -loglevel error -f concat -safe 0 -i "$D/list.txt" -c copy "$D/sil.mp4"
  local DUR=$($FP -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$D/sil.mp4")
  $FF -y -loglevel error -i "$D/sil.mp4" -i "$vo" -stream_loop -1 -i "$D/music.m4a" \
   -filter_complex "[0:v]fade=t=in:st=0:d=0.4,fade=t=out:st=$(echo "$DUR-0.5"|bc):d=0.5[v];[1:a]volume=1.3[vo];[2:a]volume=0.12,afade=t=out:st=$(echo "$DUR-1.2"|bc):d=1.2[bed];[vo][bed]amix=inputs=2:duration=first:dropout_transition=0,dynaudnorm[a]" \
   -map "[v]" -map "[a]" -t "$DUR" -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r $FPS -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart "$out"
  echo "🎉 $out ($DUR s)"; rm -f "$D/list.txt" "$D/sil.mp4"; }

# ── #2 أرخص من نص محاسب (vo2 19.4s) ──
card "$D/c-compare.png" "$D/a1.mp4" 5.0
scr  "$SH/shot-1-expenses.png" "$D/a2.mp4" 5.0 "$D/c-cap2a.png"
scr  "$SH/shot-1-projects.png" "$D/a3.mp4" 5.4 "$D/c-cap2b.png"
card "$D/card-outro.png" "$D/a4.mp4" 4.5
mux "$D/final-02-accountant.mp4" "$D/vo2.wav" "$D/a1.mp4" "$D/a2.mp4" "$D/a3.mp4" "$D/a4.mp4"

# ── #3 بوّابة العامل POV (vo3 18.7s) ──
imgc "/home/user/contractor-pro/marketing/higgsfield/adam.jpg" "$D/b1.mp4" 4.0 "$D/c-ovhook3.png"
scr  "$SH/shot-2-workers.png"  "$D/b2.mp4" 5.2 "$D/c-cap3a.png"
scr  "$SH/shot-2-payments.png" "$D/b3.mp4" 5.4 "$D/c-cap3b.png"
card "$D/card-outro.png" "$D/b4.mp4" 4.5
mux "$D/final-03-worker-portal.mp4" "$D/vo3.wav" "$D/b1.mp4" "$D/b2.mp4" "$D/b3.mp4" "$D/b4.mp4"

# ── #4 بلا نت (vo4 13.4s) ──
vidc "$D/broll.mp4" "$D/d1.mp4" 4.5 "$D/c-ovhook4.png"
scr  "$SH/shot-1-expenses.png" "$D/d2.mp4" 4.6 "$D/c-cap4.png"
card "$D/card-outro.png" "$D/d3.mp4" 4.5
mux "$D/final-04-offline.mp4" "$D/vo4.wav" "$D/d1.mp4" "$D/d2.mp4" "$D/d3.mp4"

# ── #5 מע"מ 18% (vo5 11.8s) ──
card "$D/c-vat.png" "$D/e1.mp4" 4.0
scr  "$SH/shot-1-expenses.png" "$D/e2.mp4" 4.0 "$D/c-cap5.png"
card "$D/card-outro.png" "$D/e3.mp4" 4.2
mux "$D/final-05-vat.mp4" "$D/vo5.wav" "$D/e1.mp4" "$D/e2.mp4" "$D/e3.mp4"

rm -f "$D"/a?.mp4 "$D"/b?.mp4 "$D"/d?.mp4 "$D"/e?.mp4
echo "ALL DONE"
