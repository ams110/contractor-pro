#!/usr/bin/env bash
# مسار صوت v2 بمبادئ الماستركلاس: room tone خفيف · صمت استراتيجي قبل التحوّل ·
# SFX مُزامَن على الإطار (whoosh عند التحوّل 5.6ث · ختم 10ث · chime راحة 12.9ث) ·
# bed يدخل بعد التحوّل ويتصاعد للذروة · ≤5 طبقات. VO placeholder (espeak).
set -e
cd "$(dirname "$0")"
mkdir -p au2

say(){ espeak-ng -v ar -s 172 -p 44 -w "au2/$1.wav" "$2"; }
say l1 "آخر الليل، ولسّا بتحسب بإيدك؟"
say l2 "المحاسب بياخد ألف وثمانمية، وما بيدير عامل"
say l3 "خلص، في طريقة أسهل"
say l4 "كل شغلك بشاشة وحدة، بالعربي"
say l5 "يوم عمل بلمسة، وراتب محسوب لحاله"
say l6 "رواتب وسلف، محسوبة لحالها"
say l7 "نام مرتاح، جربه مجانا"

ffmpeg -y \
  -i au2/l1.wav -i au2/l2.wav -i au2/l3.wav -i au2/l4.wav -i au2/l5.wav -i au2/l6.wav -i au2/l7.wav \
  -filter_complex "
    anoisesrc=d=15:c=pink:a=0.02,lowpass=f=2000[room];
    sine=frequency=73:duration=4.4,volume=0.05,afade=t=out:st=3.6:d=0.8[tension];
    sine=frequency=98:duration=9,volume=0.05[p1];
    sine=frequency=147:duration=9,volume=0.035[p2];
    [p1][p2]amix=inputs=2,tremolo=f=0.2:d=0.35,lowpass=f=700,afade=t=in:d=1,afade=t=out:st=8:d=1,adelay=6000|6000[bed];
    anoisesrc=d=0.55:c=pink:a=0.55,highpass=f=250,afade=t=in:d=0.08,afade=t=out:st=0.28:d=0.27,adelay=5600|5600[whoosh];
    sine=frequency=1320:duration=0.22,afade=t=out:st=0.05:d=0.17,adelay=10000|10000,volume=0.5[ding];
    sine=frequency=784:duration=0.5,afade=t=out:st=0.1:d=0.4,adelay=12900|12900,volume=0.4[chime1];
    sine=frequency=1175:duration=0.5,afade=t=out:st=0.1:d=0.4,adelay=13050|13050,volume=0.32[chime2];
    [0:a]adelay=150|150,volume=1.7[v1];
    [1:a]adelay=2300|2300,volume=1.7[v2];
    [2:a]adelay=4450|4450,volume=1.7[v3];
    [3:a]adelay=6200|6200,volume=1.7[v4];
    [4:a]adelay=8850|8850,volume=1.7[v5];
    [5:a]adelay=11050|11050,volume=1.7[v6];
    [6:a]adelay=12950|12950,volume=1.85[v7];
    [room][tension][bed][whoosh][ding][chime1][chime2][v1][v2][v3][v4][v5][v6][v7]
      amix=inputs=14:duration=longest:normalize=0,
      acompressor=threshold=0.12:ratio=3,alimiter=limit=0.95,atrim=0:15,asetpts=N/SR/TB[a]
  " -map "[a]" -ar 48000 -ac 2 au2/master.wav 2>&1 | tail -1

ffmpeg -y -i silent_v2.mp4 -i au2/master.wav -c:v copy -c:a aac -b:a 192k -shortest \
  ../docs/ad/cp_15s_ar_v2.mp4 2>&1 | tail -1
echo "=== DONE ==="
ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name -of default=noprint_wrappers=1 ../docs/ad/cp_15s_ar_v2.mp4
