#!/usr/bin/env bash
set -e; cd "$(dirname "$0")"; FPS=30
ENC="-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r $FPS -an"
sc(){ local z; if [ "$4" = out ];then z="if(eq(on,0),1.10,max(zoom-0.0011,1.0))";else z="min(zoom+0.0011,1.10)";fi
 ffmpeg -y -loglevel error -loop 1 -t "$5" -i bg.png -loop 1 -t "$5" -i "$1" -loop 1 -t "$5" -i screen-mask.png -loop 1 -t "$5" -i "$2" \
 -filter_complex "[1:v]scale=760:1689,zoompan=z='$z':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=720x1600:fps=$FPS,trim=duration=$5,format=rgba[s];[2:v]alphaextract[m];[s][m]alphamerge[r];[0:v][r]overlay=180:160[b];[b][3:v]overlay=0:0,format=yuv420p[v]" \
 -map "[v]" $ENC "$3"; echo "✅ $3"; }
sc shot-5-expenses.png card-cap_expenses.png s-1.mp4 in  3.96
sc shot-2-projects.png card-cap_projects.png s-2.mp4 out 3.96
