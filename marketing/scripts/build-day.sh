#!/usr/bin/env bash
# تركيب ريل قصصي «يوم بحياة الحاج» — 4 مشاهد حاج (seedance) + شاشات حقيقية + كباشن + VO + موسيقى
# تصدير نظيف: شعار Contractor Pro فقط، بلا أي علامة منصّة.
set -e
FF=/usr/local/bin/ffmpeg
FP=/tmp/node_modules/ffprobe-static/bin/linux/x64/ffprobe
D=/home/user/contractor-pro/marketing/promo-frames/day
SH=/home/user/contractor-pro/shots
FPS=30
VENC="-c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r $FPS -an"

# مشهد حاج (فيديو): cover-crop 1080x1920 + قص + كابشن اختياري (صامت)
vid(){ # in out dur [overlay]
  if [ -n "$4" ]; then
    $FF -y -loglevel error -i "$1" -loop 1 -i "$4" \
     -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=$FPS,trim=duration=$3,setpts=PTS-STARTPTS[v0];[1:v]format=rgba,fade=t=in:st=0.3:d=0.6:alpha=1[ov];[v0][ov]overlay=0:0:shortest=1,setsar=1,format=yuv420p[v]" \
     -map "[v]" $VENC "$2"
  else
    $FF -y -loglevel error -i "$1" \
     -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=$FPS,trim=duration=$3,setpts=PTS-STARTPTS,setsar=1,format=yuv420p[v]" \
     -map "[v]" $VENC "$2"
  fi; echo "✅ $2 ($3s)"
}
# شاشة حقيقية: Ken Burns (بان لأسفل) + كابشن (صامت)
scr(){ # img out dur overlay
  $FF -y -loglevel error -loop 1 -t "$3" -i "$1" -loop 1 -t "$3" -i "$4" \
   -filter_complex "[0:v]scale=1080:-1,crop=1080:1920:0:'min((ih-1920)*t/$3\,ih-1920)',setsar=1[v0];[v0][1:v]overlay=0:0,format=yuv420p[v]" \
   -map "[v]" -t "$3" $VENC "$2"; echo "✅ $2 ($3s)"
}
# CTA ختامي: زوم خفيف على البطاقة
outro(){ # img out dur
  $FF -y -loglevel error -loop 1 -t "$3" -i "$1" \
   -filter_complex "[0:v]scale=1188:2112,zoompan=z='min(zoom+0.0006,1.06)':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=$FPS,trim=duration=$3,setsar=1,format=yuv420p[v]" \
   -map "[v]" -t "$3" $VENC "$2"; echo "✅ $2 ($3s)"
}

vid "$D/s1.mp4" "$D/D1.mp4" 3.6 "$D/card-hook.png"
scr "$SH/shot-2-payments.png" "$D/D2.mp4" 4.4 "$D/card-cap_advance.png"
vid "$D/s2.mp4" "$D/D3.mp4" 3.2
scr "$SH/shot-1-expenses.png" "$D/D4.mp4" 4.2 "$D/card-cap_expense.png"
vid "$D/s3.mp4" "$D/D5.mp4" 3.2
scr "$SH/shot-1-projects.png" "$D/D6.mp4" 4.2 "$D/card-cap_collect.png"
vid "$D/s4.mp4" "$D/D7.mp4" 3.6
scr "$SH/shot-1-dashboard.png" "$D/D8.mp4" 4.0 "$D/card-cap_profit.png"
outro "$D/card-outro.png" "$D/D9.mp4" 4.0

printf "file 'D%d.mp4'\n" 1 2 3 4 5 6 7 8 9 > "$D/day-list.txt"
$FF -y -loglevel error -f concat -safe 0 -i "$D/day-list.txt" -c copy "$D/day-sil.mp4"
DUR=$($FP -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$D/day-sil.mp4")
echo "total=$DUR"

$FF -y -loglevel error -i "$D/day-sil.mp4" -i "$D/vo-day.wav" -stream_loop -1 -i "$D/music.m4a" \
 -filter_complex "[0:v]fade=t=in:st=0:d=0.5,fade=t=out:st=$(echo "$DUR-0.6"|bc):d=0.6[v];\
   [1:a]volume=1.3[vo];[2:a]volume=0.13,afade=t=in:st=0:d=1.0,afade=t=out:st=$(echo "$DUR-1.4"|bc):d=1.4[bed];\
   [vo][bed]amix=inputs=2:duration=first:dropout_transition=0,dynaudnorm[a]" \
 -map "[v]" -map "[a]" -t "$DUR" -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r $FPS \
 -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart "$D/final-day.mp4"
echo "🎉 final-day.mp4 ($DUR s)"
rm -f "$D"/D?.mp4 "$D/day-list.txt" "$D/day-sil.mp4"
