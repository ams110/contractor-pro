#!/usr/bin/env bash
# إعلان "وجع الرواتب ← حل": هوك فيديو حقيقي (مقاول مرهَق) + شاشة عمّال حقيقية + CTA
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
M="$ROOT/marketing"
PF="$M/promo-frames"
FPS=30
ENC="-c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p -r $FPS -an"

# ① الهوك: فيديو الإرهاق الحقيقي + نص محروق فوقه (4ث)
ffmpeg -y -loglevel error -i "$M/higgsfield/salary-hook-new.mp4" -loop 1 -t 4 -i "$PF/sal-hook.png" \
  -filter_complex "[0:v]scale=1080:-2,crop=1080:1920,trim=duration=4,setpts=PTS-STARTPTS[bg];[bg][1:v]overlay=0:0:shortest=1,format=yuv420p[v]" \
  -map "[v]" -t 4 $ENC "$PF/s-hook.mp4"

# ② الحل: شاشة العمّال الحقيقية بإطار تلفون + Ken Burns + كابشن سفلي (8ث)
ffmpeg -y -loglevel error \
  -loop 1 -t 8 -i "$M/assets/bg.png" -loop 1 -t 8 -i "$M/source-screens/shot-3-workers.png" \
  -loop 1 -t 8 -i "$M/assets/screen-mask.png" -loop 1 -t 8 -i "$PF/sal-sol.png" \
  -filter_complex "[1:v]scale=760:1689,zoompan=z='min(zoom+0.0011,1.10)':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=720x1600:fps=$FPS,trim=duration=8,format=rgba[s];[2:v]alphaextract[m];[s][m]alphamerge[r];[0:v][r]overlay=180:160[b];[b][3:v]overlay=0:0,format=yuv420p[v]" \
  -map "[v]" $ENC "$PF/s-screen.mp4"

# ③ CTA (2.5ث)
ffmpeg -y -loglevel error -loop 1 -t 2.5 -i "$PF/sal-cta.png" \
  -filter_complex "[0:v]scale=1188:2112,zoompan=z='min(zoom+0.0010,1.07)':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=$FPS,trim=duration=2.5,format=yuv420p[v]" \
  -map "[v]" $ENC "$PF/s-cta.mp4"

# دمج + موسيقى + فيد
printf "file '%s'\nfile '%s'\nfile '%s'\n" "$PF/s-hook.mp4" "$PF/s-screen.mp4" "$PF/s-cta.mp4" > "$PF/s-list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$PF/s-list.txt" -c copy "$PF/s-sil.mp4"
D=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$PF/s-sil.mp4")
mkdir -p "$M/final"
ffmpeg -y -loglevel error -i "$PF/s-sil.mp4" -stream_loop -1 -i "$M/higgsfield/music.m4a" \
  -filter_complex "[0:v]fade=t=in:st=0:d=0.3,fade=t=out:st=$(echo "$D-0.4"|bc):d=0.4[v];[1:a]volume=0.9,afade=t=in:st=0:d=0.4,afade=t=out:st=$(echo "$D-0.8"|bc):d=0.8[a]" \
  -map "[v]" -map "[a]" -t "$D" -c:v libx264 -preset veryfast -crf 19 -pix_fmt yuv420p -r $FPS -c:a aac -b:a 192k -movflags +faststart "$M/final/salary-pain.mp4"

rm -f "$PF"/s-*.mp4 "$PF/s-list.txt"
echo "✅ salary-pain.mp4 ($D s)"
