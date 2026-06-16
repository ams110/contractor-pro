#!/usr/bin/env bash
set -e; cd "$(dirname "$0")"; FPS=30
ENC="-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r $FPS -an"

# فيديو + overlay اختياري + قص
vidseg(){ # in out dur [overlay]
  if [ -n "$4" ]; then
    ffmpeg -y -loglevel error -i "$1" -loop 1 -i "$4" \
     -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=$FPS,trim=duration=$3,setpts=PTS-STARTPTS[v0];[1:v]format=rgba,fade=t=in:st=0.4:d=0.7:alpha=1[ov];[v0][ov]overlay=0:0:shortest=1,format=yuv420p[v]" \
     -map "[v]" $ENC "$2"
  else
    ffmpeg -y -loglevel error -i "$1" \
     -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=$FPS,trim=duration=$3,setpts=PTS-STARTPTS,format=yuv420p[v]" \
     -map "[v]" $ENC "$2"
  fi; echo "✅ $2"
}
# صورة Ken Burns (+grade اختياري)
imgseg(){ # img out dur zin/zout grade
  local z; if [ "$4" = out ]; then z="if(eq(on,0),1.12,max(zoom-0.0012,1.0))"; else z="min(zoom+0.0012,1.12)"; fi
  ffmpeg -y -loglevel error -loop 1 -t "$3" -i "$1" \
   -filter_complex "[0:v]scale=1300:2311:force_original_aspect_ratio=increase,crop=1300:2311,zoompan=z='$z':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=$FPS,trim=duration=$3,${5}format=yuv420p[v]" \
   -map "[v]" $ENC "$2"; echo "✅ $2"
}
# شاشة بموك-أب
scr(){ # shot out dur zdir [overlay]
  local z; if [ "$4" = out ];then z="if(eq(on,0),1.10,max(zoom-0.0011,1.0))";else z="min(zoom+0.0011,1.10)";fi
  local ov4="" ovin="[b]"
  if [ -n "$5" ]; then ov4="-loop 1 -t $3 -i $5"; ovin="[b][3:v]overlay=0:0,"; fi
  ffmpeg -y -loglevel error -loop 1 -t "$3" -i bg.png -loop 1 -t "$3" -i "$1" -loop 1 -t "$3" -i screen-mask.png $ov4 \
   -filter_complex "[1:v]scale=760:1689,zoompan=z='$z':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=720x1600:fps=$FPS,trim=duration=$3,format=rgba[s];[2:v]alphaextract[m];[s][m]alphamerge[r];[0:v][r]overlay=180:160[b];${ovin}format=yuv420p[v]" \
   -map "[v]" $ENC "$2"; echo "✅ $2"
}

vidseg hero-stress.mp4 H1.mp4 5.0 hero-cap-stress.png
vidseg broll.mp4       H2.mp4 4.5
imgseg chaos.png       H3.mp4 3.0 in "eq=saturation=0.65:brightness=-0.05,"
scr shot-3-workers.png  H4.mp4 3.4 in hero-cap-app.png
scr shot-5-expenses.png H5.mp4 3.4 out
scr shot-1-dashboard.png H6.mp4 3.4 in
vidseg hero-family.mp4 H7.mp4 5.0 hero-cap-family.png
imgseg hero-family.png H8.mp4 4.5 out
imgseg hero-cta.png    H9.mp4 7.0 in

printf "file 'H%d.mp4'\n" 1 2 3 4 5 6 7 8 9 > hero-list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i hero-list.txt -c copy hero-sil.mp4
D=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 hero-sil.mp4)
echo "total=$D"
ffmpeg -y -loglevel error -i hero-sil.mp4 -i hero-vo.wav -i hero-music.m4a \
 -filter_complex "[0:v]fade=t=in:st=0:d=0.6,fade=t=out:st=$(echo "$D-0.6"|bc):d=0.6[v];[1:a]volume=1.35[vo];[2:a]volume=0.42,afade=t=in:st=0:d=1.0,afade=t=out:st=$(echo "$D-1.5"|bc):d=1.5[bed];[vo][bed]amix=inputs=2:duration=longest:normalize=0[a]" \
 -map "[v]" -map "[a]" -t "$D" -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r $FPS -c:a aac -b:a 192k -movflags +faststart hero-waqtak-elak.mp4
echo "✅ hero-waqtak-elak.mp4 ($D s)"
rm -f H?.mp4 hero-list.txt hero-sil.mp4
