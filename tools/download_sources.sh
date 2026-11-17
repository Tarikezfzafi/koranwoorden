#!/bin/bash
# Download de studiebronnen naar een map (standaard ./bron). Daarna: python3 tools/sources.py bron
set -e
D="${1:-bron}"; mkdir -p "$D/lane"; cd "$D"
Q=https://api.quranpedia.net/dumps
for f in tafsir-book-2012 tafsir-book-3 tafsir-book-64 meanings syntax; do
  [ -s "$f.json.gz" ] || curl -sL "$Q/$f.json.gz" -o "$f.json.gz"
done
[ -s b353.json ] || curl -sL "https://quranpedia.net/books-contents/book-353.json" -o b353.json
[ -s maqayis.json ] || curl -sL "https://raw.githubusercontent.com/hhiyassat/Maqaiys-roots/main/output/maqayis_all_roots.json" -o maqayis.json
if [ ! -s lane/lexicon.sqlite ]; then
  curl -sL "https://raw.githubusercontent.com/laneslexicon/LexiconDatabase/master/lexicon.sqlite.zip" -o lane/lexicon.sqlite.zip
  (cd lane && unzip -o -q lexicon.sqlite.zip)
fi
echo "klaar"
