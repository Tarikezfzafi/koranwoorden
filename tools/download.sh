#!/bin/bash
# Download brondata naar een map (standaard ./bron). Daarna: python3 tools/build.py bron
D="${1:-bron}"; mkdir -p "$D"; cd "$D"
curl -s "https://api.quran.com/api/v4/chapters?language=nl" -o chapters.json
for i in $(seq 1 114); do
  [ -s "c$i.json" ] || curl -s "https://api.quran.com/api/v4/verses/by_chapter/$i?words=true&word_fields=text_uthmani&translations=235&per_page=300&fields=text_uthmani" -o "c$i.json"
done
curl -sL "https://raw.githubusercontent.com/mustafa0x/quran-morphology/master/quran-morphology.txt" -o morph.txt
echo "klaar: $(ls c*.json | wc -l) soera's"
