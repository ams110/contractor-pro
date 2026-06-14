#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
FPS=30
SD=2.4        # مدّة كل كليب شاشة
ENC="-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r $FPS -an"

# كليب شاشة واحد: خلفية + موبايل (زوايا مدوّرة + Ken Burns) + عنوان سفلي
make_screen () {
  local shot="$1" cap="$2" out="$3" zdir="$4"
  # zdir: in => زوم داخل ، out => زوم خارج
  local zexpr
  if [ "$zdir" = "out" ]; then zexpr="if(eq(on,0),1.10,max(zoom-0.0013,1.0))"; else zexpr="min(zoom+0.0013,1.10)"; fi
  ffmpeg -y -loglevel error \
    -loop 1 -t $SD -i bg.png \
    -loop 1 -t $SD -i "$shot" \
    -loop 1 -t $SD -i screen-mask.png \
    -loop 1 -t $SD -i "$cap" \
    -filter_complex "\
      [1:v]scale=760:1689,zoompan=z='$zexpr':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=720x1600:fps=$FPS,trim=duration=$SD,format=rgba[shot];\
      [2:v]alphaextract[m];\
      [shot][m]alphamerge[rounded];\
      [0:v][rounded]overlay=180:160[b1];\
      [b1][3:v]overlay=0:0,format=yuv420p[v]" \
    -map "[v]" $ENC "$out"
  echo "✅ $out"
}

# بطاقة كاملة (افتتاح/ختام) مع زوم خفيف
make_card () {
  local card="$1" out="$2" dur="$3"
  ffmpeg -y -loglevel error \
    -loop 1 -t "$dur" -i "$card" \
    -filter_complex "[0:v]scale=1188:2112,zoompan=z='min(zoom+0.0009,1.06)':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=$FPS,trim=duration=$dur,format=yuv420p[v]" \
    -map "[v]" $ENC "$out"
  echo "✅ $out"
}

make_card card-intro.png clip-intro.mp4 2.0
make_card card-outro.png clip-outro.mp4 3.6
make_screen shot-1-dashboard.png card-cap_dashboard.png clip-1.mp4 in
make_screen shot-2-projects.png  card-cap_projects.png  clip-2.mp4 out
make_screen shot-3-workers.png   card-cap_workers.png   clip-3.mp4 in
make_screen shot-4-workdays.png  card-cap_workdays.png  clip-4.mp4 out
make_screen shot-5-expenses.png  card-cap_expenses.png  clip-5.mp4 in
echo "🎬 done"
