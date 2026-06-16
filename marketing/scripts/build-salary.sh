#!/usr/bin/env bash
# إعلان "وجع الرواتب ← الحل": هوك فيديو أصلي + مونتاج 3 شاشات حقيقية + CTA
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
M="$ROOT/marketing"
PF="$M/promo-frames"
mkdir -p "$PF" "$M/final"
FPS=30
ENC="-c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p -r $FPS -an"

# لقطة شاشة بإطار تلفون + Ken Burns + كابشن سفلي
screen_clip () { # shot cap out dur zdir
  local z; if [ "$5" = out ]; then z="if(eq(on,0),1.10,max(zoom-0.0013,1.0))"; else z="min(zoom+0.0013,1.10)"; fi
  ffmpeg -y -loglevel error -loop 1 -t "$4" -i "$M/assets/bg.png" -loop 1 -t "$4" -i "$1" \
    -loop 1 -t "$4" -i "$M/assets/screen-mask.png" -loop 1 -t "$4" -i "$2" \
    -filter_complex "[1:v]scale=760:1689,zoompan=z='$z':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=720x1600:fps=$FPS,trim=duration=$4,format=rgba[s];[2:v]alphaextract[m];[s][m]alphamerge[r];[0:v][r]overlay=180:160[b];[b][3:v]overlay=0:0,format=yuv420p[v]" \
    -map "[v]" $ENC "$3"
}

# ① الهوك: فيديو الإرهاق الأصلي (مقاول بالموقع + كاش) + نص محروق فوقه (4ث)
ffmpeg -y -loglevel error -i "$M/higgsfield/salary-hook-new.mp4" -loop 1 -t 4 -i "$PF/sal-hook.png" \
  -filter_complex "[0:v]scale=1080:-2,crop=1080:1920,trim=duration=4,setpts=PTS-STARTPTS[bg];[bg][1:v]overlay=0:0:shortest=1,format=yuv420p[v]" \
  -map "[v]" -t 4 $ENC "$PF/s-hook.mp4"

# ② مونتاج 3 شاشات حقيقية (قصّة الراتب: تسجيل → رصيد → دفع) — 3ث لكل وحدة
screen_clip "$M/source-screens/sal-workdays.png" "$PF/sal-sol1.png" "$PF/s-s1.mp4" 3.0 in
screen_clip "$M/source-screens/sal-workers.png"  "$PF/sal-sol2.png" "$PF/s-s2.mp4" 3.0 out
screen_clip "$M/source-screens/sal-payments.png" "$PF/sal-sol3.png" "$PF/s-s3.mp4" 3.0 in

# ③ CTA (2.5ث)
ffmpeg -y -loglevel error -loop 1 -t 2.5 -i "$PF/sal-cta.png" \
  -filter_complex "[0:v]scale=1188:2112,zoompan=z='min(zoom+0.0010,1.07)':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=$FPS,trim=duration=2.5,format=yuv420p[v]" \
  -map "[v]" $ENC "$PF/s-cta.mp4"

# دمج + موسيقى + فيد
printf "file '%s'\nfile '%s'\nfile '%s'\nfile '%s'\nfile '%s'\n" \
  "$PF/s-hook.mp4" "$PF/s-s1.mp4" "$PF/s-s2.mp4" "$PF/s-s3.mp4" "$PF/s-cta.mp4" > "$PF/s-list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$PF/s-list.txt" -c copy "$PF/s-sil.mp4"
D=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$PF/s-sil.mp4")
ffmpeg -y -loglevel error -i "$PF/s-sil.mp4" -stream_loop -1 -i "$M/higgsfield/music.m4a" \
  -filter_complex "[0:v]fade=t=in:st=0:d=0.3,fade=t=out:st=$(echo "$D-0.4"|bc):d=0.4[v];[1:a]volume=0.9,afade=t=in:st=0:d=0.4,afade=t=out:st=$(echo "$D-0.8"|bc):d=0.8[a]" \
  -map "[v]" -map "[a]" -t "$D" -c:v libx264 -preset veryfast -crf 19 -pix_fmt yuv420p -r $FPS -c:a aac -b:a 192k -movflags +faststart "$M/final/salary-pain.mp4"

rm -f "$PF"/s-*.mp4 "$PF/s-list.txt"
echo "✅ salary-pain.mp4 ($D s)"
