#!/usr/bin/env bash
# تركيب ريل زاوية C «مين مدين لك» — حاج + شاشات حقيقية + كباشن محروقة + VO + موسيقى
# تصدير نظيف: شعار Contractor Pro فقط، بلا أي علامة منصّة.
set -e
FF=/usr/local/bin/ffmpeg
D=/home/user/contractor-pro/marketing/promo-frames/c
SH=/home/user/contractor-pro/shots
FPS=30
VENC="-c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r $FPS"
AENC="-c:a aac -b:a 192k -ar 48000 -ac 2"

HK=9.78    # vo-hook
BD=10.52   # vo-body  (نص لكل شاشة)
HB=5.26
CT=5.98    # vo-cta

# ── SEG1: الحاج (هوك) — cover-crop + كابشن هوك + الصوت المدمج ──
$FF -y -loglevel error -t $HK -i "$D/haj-raw.mp4" -i "$D/card-hook.png" \
  -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v0];[v0][1:v]overlay=0:0,format=yuv420p[v]" \
  -map "[v]" -map 0:a -t $HK $VENC $AENC "$D/seg1.mp4"
echo "✅ seg1 (haj hook) $HK s"

# ── BODY1: شاشة المشاريع — Ken Burns (بان لأسفل) + كابشن «مين مدين لك» (صامت) ──
$FF -y -loglevel error -loop 1 -t $HB -i "$SH/shot-1-projects.png" -i "$D/card-cap_collect.png" \
  -filter_complex "[0:v]scale=1080:-1,crop=1080:1920:0:'min((ih-1920)*t/$HB\,ih-1920)',setsar=1[v0];[v0][1:v]overlay=0:0,format=yuv420p[v]" \
  -map "[v]" -t $HB $VENC "$D/body1.mp4"
echo "✅ body1 (projects)"

# ── BODY2: الداشبورد — Ken Burns (زوم خفيف) + كابشن «كل مصلحتك» (صامت) ──
$FF -y -loglevel error -loop 1 -t $HB -i "$SH/shot-1-dashboard.png" -i "$D/card-cap_pulse.png" \
  -filter_complex "[0:v]scale=1080:-1,crop=1080:1920:0:'min((ih-1920)*t/$HB\,ih-1920)',setsar=1[v0];[v0][1:v]overlay=0:0,format=yuv420p[v]" \
  -map "[v]" -t $HB $VENC "$D/body2.mp4"
echo "✅ body2 (dashboard)"

# ── concat body1+body2 (صامت) ثم إضافة vo-body ──
printf "file '%s'\nfile '%s'\n" "$D/body1.mp4" "$D/body2.mp4" > "$D/body.txt"
$FF -y -loglevel error -f concat -safe 0 -i "$D/body.txt" -c copy "$D/body-silent.mp4"
$FF -y -loglevel error -i "$D/body-silent.mp4" -i "$D/vo-body.wav" \
  -map 0:v -map 1:a -t $BD $VENC $AENC "$D/seg2.mp4"
echo "✅ seg2 (body+vo) $BD s"

# ── SEG3: CTA ختامي — زوم خفيف + vo-cta ──
$FF -y -loglevel error -loop 1 -t $CT -i "$D/card-outro.png" -i "$D/vo-cta.wav" \
  -filter_complex "[0:v]scale=1188:2112,zoompan=z='min(zoom+0.0006,1.06)':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=$FPS,trim=duration=$CT,setsar=1,format=yuv420p[v]" \
  -map "[v]" -map 1:a -t $CT $VENC $AENC "$D/seg3.mp4"
echo "✅ seg3 (cta) $CT s"

# ── concat الكل ──
printf "file '%s'\nfile '%s'\nfile '%s'\n" "$D/seg1.mp4" "$D/seg2.mp4" "$D/seg3.mp4" > "$D/all.txt"
$FF -y -loglevel error -f concat -safe 0 -i "$D/all.txt" -c copy "$D/voiced.mp4"
echo "✅ concat → voiced.mp4"

# ── خلفية موسيقى منخفضة + ducking تحت الصوت ──
$FF -y -loglevel error -i "$D/voiced.mp4" -stream_loop -1 -i "$D/music.m4a" \
  -filter_complex "[1:a]volume=0.14,aloop=loop=-1:size=2e9[mus];[0:a]volume=1.0[vo];[vo][mus]amix=inputs=2:duration=first:dropout_transition=0,dynaudnorm[a]" \
  -map 0:v -map "[a]" $VENC $AENC -shortest "$D/final-c.mp4"
echo "🎉 final-c.mp4"
