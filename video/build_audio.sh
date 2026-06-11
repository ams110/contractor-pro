#!/usr/bin/env bash
# يبني المسار الصوتي للإعلان 15ث: VO عربي (espeak placeholder) + خلفية ناعمة + SFX،
# ثم يدمجه مع الفيديو الصامت. الصوت "scratch" يُستبدل لاحقاً بـVO احترافي وموسيقى مرخّصة.
set -e
cd "$(dirname "$0")"
mkdir -p au

# ── 1) VO عربي: كل سطر wav مستقل (سرعة 165 ليناسب التوقيت) ──
say(){ espeak-ng -v ar -s 165 -p 42 -w "au/$1.wav" "$2"; }
say l1 "المحاسب بياخد منك ألف وثمانمية شيكل بالسنة"
say l2 "وما بيدير ولا عامل"
say l3 "هذا يدير عمالك"
say l4 "رواتبهم وضريبتك، بالعربي"
say l5 "سنة كاملة بتسعمية وتسعين شيكل"
say l6 "جربه مجانا اليوم"

# ── 2) الدمج: خلفية + VO مؤقّت + SFX (whoosh عند 4.2ث، ختم عند 9.8ث، نجاح عند 11.8ث) ──
ffmpeg -y \
  -i au/l1.wav -i au/l2.wav -i au/l3.wav -i au/l4.wav -i au/l5.wav -i au/l6.wav \
  -filter_complex "
    sine=frequency=98:duration=15,volume=0.05[b1];
    sine=frequency=147:duration=15,volume=0.035[b2];
    [b1][b2]amix=inputs=2,tremolo=f=0.25:d=0.4,lowpass=f=600[bed];
    anoisesrc=d=0.6:c=pink:a=0.5,highpass=f=300,afade=t=in:d=0.1,afade=t=out:st=0.3:d=0.3,adelay=4200|4200[whoosh];
    sine=frequency=1320:duration=0.25,afade=t=out:st=0.05:d=0.2,adelay=9800|9800,volume=0.5[ding1];
    sine=frequency=880:duration=0.3,afade=t=out:st=0.05:d=0.25,adelay=11800|11800,volume=0.45[ding2];
    [0:a]adelay=200|200,volume=1.7[v1];
    [1:a]adelay=3000|3000,volume=1.7[v2];
    [2:a]adelay=6100|6100,volume=1.7[v3];
    [3:a]adelay=8500|8500,volume=1.7[v4];
    [4:a]adelay=11000|11000,volume=1.7[v5];
    [5:a]adelay=13000|13000,volume=1.8[v6];
    [bed][whoosh][ding1][ding2][v1][v2][v3][v4][v5][v6]amix=inputs=10:duration=longest:normalize=0,
      acompressor=threshold=0.1:ratio=3,alimiter=limit=0.95,atrim=0:15,asetpts=N/SR/TB[a]
  " -map "[a]" -ar 48000 -ac 2 au/master.wav 2>&1 | tail -1

# ── 3) دمج الصوت مع الفيديو الصامت → الإعلان النهائي ──
ffmpeg -y -i silent.mp4 -i au/master.wav -c:v copy -c:a aac -b:a 192k -shortest \
  ../docs/ad/cp_15s_ar.mp4 2>&1 | tail -1

echo "=== DONE ==="
ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name -of default=noprint_wrappers=1 ../docs/ad/cp_15s_ar.mp4
ls -la ../docs/ad/cp_15s_ar.mp4
