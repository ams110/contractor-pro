#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
O=promo-daftar/out
S=marketing/source-screens
M=marketing/higgsfield/music.m4a
ENC="-c:v libx264 -pix_fmt yuv420p -r 30 -preset medium -crf 18"

# ── Scene 1: HOOK (3.0s) — chaos clip + hook overlay ──
ffmpeg -y -i promo-daftar/hook.mp4 -loop 1 -t 3 -i $O/hook.png \
  -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,trim=0:3,setpts=PTS-STARTPTS[v];[v][1:v]overlay=0:0[o]" \
  -map "[o]" -t 3 $ENC -an $O/s1.mp4 -loglevel error

# ── Scene 2: TURN (0.8s) — bg + turn text + white flash in ──
ffmpeg -y -loop 1 -t 0.8 -i $O/bg.png -loop 1 -t 0.8 -i $O/turn.png \
  -filter_complex "[0:v]scale=1080:1920,setsar=1[b];[b][1:v]overlay=0:0,fade=t=in:st=0:d=0.12:color=white[o]" \
  -map "[o]" -t 0.8 $ENC -an $O/s2.mp4 -loglevel error

# ── screen scene helper: bg + zooming screen + top caption ──
scene () { # $1=screen $2=cap $3=out
ffmpeg -y -loop 1 -t 3 -i $O/bg.png -loop 1 -t 3 -i "$1" -loop 1 -t 3 -i "$2" \
  -filter_complex "[1:v]scale=1560:-1,zoompan=z='min(1.0+0.0010*on,1.09)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=90:s=780x1380:fps=30,setsar=1[s];[0:v]scale=1080:1920,setsar=1[b];[b][s]overlay=(W-w)/2:230[bs];[bs][2:v]overlay=0:0[o]" \
  -map "[o]" -t 3 $ENC -an "$3" -loglevel error
}
scene $S/shot-1-dashboard.png $O/cap_dash.png    $O/s3.mp4
scene $S/shot-3-workers.png   $O/cap_workers.png $O/s4.mp4
scene $S/shot-5-expenses.png  $O/cap_tax.png     $O/s5.mp4

# ── Scene 6: OUTRO (2.7s) — slight zoom ──
ffmpeg -y -loop 1 -t 2.7 -i $O/outro.png \
  -filter_complex "[0:v]scale=1188:2112,zoompan=z='min(1.0+0.0008*on,1.07)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=81:s=1080x1920:fps=30,setsar=1[o]" \
  -map "[o]" -t 2.7 $ENC -an $O/s6.mp4 -loglevel error

# ── concat (hard cuts) ──
printf "file 's1.mp4'\nfile 's2.mp4'\nfile 's3.mp4'\nfile 's4.mp4'\nfile 's5.mp4'\nfile 's6.mp4'\n" > $O/list.txt
ffmpeg -y -f concat -safe 0 -i $O/list.txt -c copy $O/silent.mp4 -loglevel error

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $O/silent.mp4)
echo "silent duration: $DUR"

# ── whoosh SFX at the hook->turn cut (~3.0s) ──
ffmpeg -y -f lavfi -t 0.6 -i "anoisesrc=c=pink:a=0.6" \
  -af "highpass=f=250,lowpass=f=6000,afade=t=in:d=0.05,afade=t=out:st=0.25:d=0.35,volume=0.7" $O/whoosh.wav -loglevel error

# ── mix music (loop/trim to duration, fade) + whoosh ──
ffmpeg -y -i $O/silent.mp4 -i $M -i $O/whoosh.wav \
  -filter_complex "[1:a]atrim=0:${DUR},afade=t=in:d=0.3,afade=t=out:st=$(echo "$DUR-1.0"|bc):d=1.0,volume=0.85[m];[2:a]adelay=2950|2950,volume=1.0[w];[m][w]amix=inputs=2:duration=first:dropout_transition=0,volume=1.3[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest promo-daftar/daftar-v1.mp4 -loglevel error

echo "=== DONE ==="
ffprobe -v error -show_entries format=duration:stream=width,height -of default=noprint_wrappers=1 promo-daftar/daftar-v1.mp4
ls -la promo-daftar/daftar-v1.mp4
