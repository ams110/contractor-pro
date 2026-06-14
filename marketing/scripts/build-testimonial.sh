#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
FPS=30
ENC="-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r $FPS -an"

make_screen () {
  local shot="$1" cap="$2" out="$3" zdir="$4" SD="$5"
  local zexpr
  if [ "$zdir" = "out" ]; then zexpr="if(eq(on,0),1.10,max(zoom-0.0011,1.0))"; else zexpr="min(zoom+0.0011,1.10)"; fi
  ffmpeg -y -loglevel error \
    -loop 1 -t $SD -i bg.png -loop 1 -t $SD -i "$shot" \
    -loop 1 -t $SD -i screen-mask.png -loop 1 -t $SD -i "$cap" \
    -filter_complex "\
      [1:v]scale=760:1689,zoompan=z='$zexpr':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=720x1600:fps=$FPS,trim=duration=$SD,format=rgba[shot];\
      [2:v]alphaextract[m];[shot][m]alphamerge[r];\
      [0:v][r]overlay=180:160[b1];[b1][3:v]overlay=0:0,format=yuv420p[v]" \
    -map "[v]" $ENC "$out"
  echo "✅ $out ($SD s)"
}

make_screen shot-3-workers.png  card-cap_workers.png  t-1.mp4 in  3.90
make_screen shot-5-expenses.png card-cap_expenses.png t-2.mp4 out 3.90
make_screen shot-2-projects.png card-cap_projects.png t-3.mp4 in  3.98
echo "done"
