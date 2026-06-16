#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
FPS=30
ENC="-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r $FPS -an"

# قبل: فوضى الورق (Ken Burns + نبرة كئيبة) + شارة "قبل" + فلاش أبيض بالنهاية
ffmpeg -y -loglevel error -loop 1 -t 4.0 -i chaos.png -loop 1 -t 4.0 -i ba_before.png \
 -filter_complex "[0:v]scale=1200:2133:force_original_aspect_ratio=increase,crop=1200:2133,zoompan=z='min(zoom+0.0013,1.12)':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=$FPS,trim=duration=4.0,eq=saturation=0.70:brightness=-0.04[bg];[bg][1:v]overlay=0:0,fade=t=out:st=3.6:d=0.4:color=white,format=yuv420p[v]" \
 -map "[v]" $ENC b-before.mp4

# بعد: شاشة بموك-أب + شارة "بعد" (الأولى تدخل بفلاش أبيض)
after () { # shot out zdir fadein
  local z; if [ "$3" = out ]; then z="if(eq(on,0),1.10,max(zoom-0.0011,1.0))"; else z="min(zoom+0.0011,1.10)"; fi
  local fin=""; [ "$4" = yes ] && fin=",fade=t=in:st=0:d=0.4:color=white"
  ffmpeg -y -loglevel error -loop 1 -t 4.0 -i bg.png -loop 1 -t 4.0 -i "$1" \
   -loop 1 -t 4.0 -i screen-mask.png -loop 1 -t 4.0 -i ba_after.png \
   -filter_complex "[1:v]scale=760:1689,zoompan=z='$z':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=720x1600:fps=$FPS,trim=duration=4.0,format=rgba[s];[2:v]alphaextract[m];[s][m]alphamerge[r];[0:v][r]overlay=180:160[b];[b][3:v]overlay=0:0,format=yuv420p${fin}[v]" \
   -map "[v]" $ENC "$2"
}
after shot-1-dashboard.png b-after1.mp4 in  yes
after shot-2-projects.png  b-after2.mp4 out no

# CTA
ffmpeg -y -loglevel error -loop 1 -t 2.5 -i pc-cta_mini.png \
 -filter_complex "[0:v]scale=1188:2112,zoompan=z='min(zoom+0.0010,1.06)':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=$FPS,trim=duration=2.5,format=yuv420p[v]" \
 -map "[v]" $ENC b-cta.mp4

printf "file 'b-before.mp4'\nfile 'b-after1.mp4'\nfile 'b-after2.mp4'\nfile 'b-cta.mp4'\n" > b-list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i b-list.txt -c copy b-sil.mp4
D=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 b-sil.mp4)
ffmpeg -y -loglevel error -i b-sil.mp4 -stream_loop -1 -i music.m4a \
 -filter_complex "[0:v]fade=t=in:st=0:d=0.3,fade=t=out:st=$(echo "$D-0.4"|bc):d=0.4[v];[1:a]volume=0.95,afade=t=in:st=0:d=0.4,afade=t=out:st=$(echo "$D-0.8"|bc):d=0.8[a]" \
 -map "[v]" -map "[a]" -t "$D" -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r $FPS -c:a aac -b:a 192k -movflags +faststart before-after.mp4
echo "✅ before-after.mp4 ($D s)"
rm -f b-before.mp4 b-after1.mp4 b-after2.mp4 b-cta.mp4 b-list.txt b-sil.mp4
