#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
FPS=30
ENC="-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r $FPS -an"

card_clip () { # card out dur
  ffmpeg -y -loglevel error -loop 1 -t "$3" -i "$1" \
    -filter_complex "[0:v]scale=1188:2112,zoompan=z='min(zoom+0.0010,1.07)':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=$FPS,trim=duration=$3,format=yuv420p[v]" \
    -map "[v]" $ENC "$2"
}
screen_clip () { # shot cap out dur zdir
  local z; if [ "$5" = out ]; then z="if(eq(on,0),1.10,max(zoom-0.0011,1.0))"; else z="min(zoom+0.0011,1.10)"; fi
  ffmpeg -y -loglevel error -loop 1 -t "$4" -i bg.png -loop 1 -t "$4" -i "$1" \
    -loop 1 -t "$4" -i screen-mask.png -loop 1 -t "$4" -i "$2" \
    -filter_complex "[1:v]scale=760:1689,zoompan=z='$z':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=720x1600:fps=$FPS,trim=duration=$4,format=rgba[s];[2:v]alphaextract[m];[s][m]alphamerge[r];[0:v][r]overlay=180:160[b];[b][3:v]overlay=0:0,format=yuv420p[v]" \
    -map "[v]" $ENC "$3"
}

build () { # name hook screen sol zdir
  local n="$1"
  card_clip "pc-hook_$2.png" "x-h.mp4" 3.5
  screen_clip "$3" "pc-sol_$2.png" "x-s.mp4" 9.0 "$5"
  card_clip "pc-cta_mini.png" "x-c.mp4" 2.5
  printf "file 'x-h.mp4'\nfile 'x-s.mp4'\nfile 'x-c.mp4'\n" > x-list.txt
  ffmpeg -y -loglevel error -f concat -safe 0 -i x-list.txt -c copy x-sil.mp4
  local D=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 x-sil.mp4)
  ffmpeg -y -loglevel error -i x-sil.mp4 -stream_loop -1 -i music.m4a \
    -filter_complex "[0:v]fade=t=in:st=0:d=0.3,fade=t=out:st=$(echo "$D-0.4"|bc):d=0.4[v];[1:a]volume=0.9,afade=t=in:st=0:d=0.4,afade=t=out:st=$(echo "$D-0.8"|bc):d=0.8[a]" \
    -map "[v]" -map "[a]" -t "$D" -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r $FPS -c:a aac -b:a 192k -movflags +faststart "pain-$n.mp4"
  echo "✅ pain-$n.mp4 ($D s)"
}

build advance advance shot-3-workers.png  sol in
build profit  profit  shot-1-dashboard.png sol out
build vat     vat     shot-5-expenses.png  sol in
rm -f x-*.mp4 x-list.txt x-sil.mp4
echo done
