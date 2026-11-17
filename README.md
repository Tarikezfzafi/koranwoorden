# Koranwoorden

Leer de woorden van de Koran in context: per soera, met dagelijkse herhaling, streaks en oefeningen Arabisch ⇄ Nederlands.

## Op je telefoon (offline)

De app is een PWA: zet hem online (bv. GitHub Pages) en open de link op je telefoon.
- **iPhone:** Safari → deelknop → *Zet op beginscherm*
- **Android:** Chrome → menu ⋮ → *App installeren*

Daarna werkt alles offline (alle 114 soera's zitten in de cache). Voortgang staat op de telefoon zelf (localStorage + IndexedDB-kopie). Maak via **Meer → Back-up opslaan / delen** af en toe een back-up naar iCloud/Drive. Na een update van code of data: verhoog `VERSION` in `app/sw.js`.

## Openen op de computer

Dubbelklik `app/index.html` (werkt offline; alleen audio en het Arabische lettertype hebben internet nodig).

Of start een lokale server vanuit deze map:

```bash
python3 -m http.server 8765 -d app
```

en open http://localhost:8765. Let op: voortgang wordt per browser én per adres (bestand of localhost) opgeslagen. Kies één manier, en maak via **Instellingen → Exporteer back-up** regelmatig een back-up.

## Leermethode in de app

- **Meest voorkomend eerst.** Nieuwe woorden komen op frequentie (of uit je focus-soera, ook op frequentie). Voortgang voor top 100 / 300 / 1000 staat op Vandaag. Knop **✓ Ken ik overal** haalt een woord voorgoed uit de herhaling (telt als begrepen, terug te draaien op de woordpagina).
- **Wortel centraal.** Elk woord toont de wortel met kernbetekenis en de familie. Tabblad **Wortels**: alle 1651 wortels op frequentie, per wortel *Leer deze familie* en *Oefen familie*.
- **Actief ophalen.** Standaard typ je: Nederlandse betekenis bij een Arabisch woord, of het Arabische woord bij een Nederlandse betekenis (met schermtoetsenbord), plus wortel-vragen. Bij synoniemen: *Ik had het toch goed*.
- **Woordvormen.** Vraagtype *Woordvorm*: typ de wortel van de vorm uit het vers, daarna ontleding (voorvoegsel · stam met tijd/persoon/vorm I–X · achtervoegsel) en zelfbeoordeling.
- **Schrijven.** Na elke ronde een schrijfopdracht voor je lastigste en nieuwe woorden (wortel, vormen, vers overschrijven, eigen vertaling, vorm ontleden).
- **Lezen.** Na elke ronde *Lees nu wat je net leerde*: verzen met je nieuwe woorden, interlineair (betekenis onder onbekende woorden, verborgen onder bekende). Ook per soera: tabblad *Leesmodus*.
- **Kort en elke dag.** Rondes van ±5 minuten, dagdoel, streak, ❄ bevriezing per 7 dagen streak, herinnering in je agenda (.ics), statistiek over 30 dagen.

## Arabische studiebronnen

| Bron | Wat | In de app |
|---|---|---|
| التفسير الميسر (King Fahd Complex) | korte, eenvoudige tafsir, alle 6236 verzen | onder elk vers, verspagina |
| تفسير السعدي (تيسير الكريم الرحمن) | uitgebreidere tafsir, alle verzen | verspagina |
| إعراب القرآن وبيانه — محيي الدين درويش | volledige i'rab (اللغة · الإعراب · البلاغة · الفوائد), 6219 verzen | verspagina + per woord het bijbehorende stuk |
| The Quranic Treebank (MIT) | i'rab per woord in het Arabisch (فاعل، مفعول به، مضاف إليه …) met regerend woord | per woord, i'rab-oefenvraag |
| غريب القرآن (السراج، ابن الهائم، تذكرة الأريب، كلمات القرآن) | betekenis van moeilijke woorden per vers | bij elk woord in context |
| المفردات في غريب القرآن (الراغب) | Koranwoordenboek per wortel (1500 van 1651 wortels) | woord- en wortelpagina |
| مقاييس اللغة (ابن فارس) | grondidee (الأصل) per wortel, fragment (1527 wortels) | woord- en wortelpagina |
| Lane's Arabic-English Lexicon (GPL) | volledig artikel per wortel (1628 wortels) | woord- en wortelpagina |

Tafsir, Darwish, gharib en al-Mufradāt komen via de officiële downloadbestanden van [Quranpedia.net](https://api.quranpedia.net/dumps) (gebruik in apps toegestaan). De Nederlandse versvertaling staat standaard ingeklapt; de Arabische bronnen gaan voor.

Opnieuw bouwen:

```bash
tools/download_sources.sh bron
```

```bash
python3 tools/sources.py bron
```

Verhoog daarna `SOURCES` in `app/sw.js`, zodat telefoons de nieuwe bronnen ophalen.

## Wat zit erin

- **Vandaag**: dagelijkse herhaling (spaced repetition, SM-2-variant), dagdoel, streak, weekoverzicht, tekstdekking ("je herkent X% van de Koran").
- **Soera's**: alle 114 soera's. Per soera de unieke grondwoorden (lemma's) in volgorde van voorkomen, de tekst met vertaling (tik op een woord), "Leer nieuwe woorden", "Oefen deze soera" en een focus-soera voor je dagelijkse nieuwe woorden.
- **Oefenen**: nieuwe woorden eerst als introductie (met vers, audio en context), daarna meerkeuze of flashcards, richting Arabisch → Nederlands, Nederlands → Arabisch of gemengd. Fout beantwoorde woorden komen in dezelfde sessie terug.
- **Woorddetail**: dichtstbijzijnde Nederlandse betekenis, wortel, woordsoort, contextuele vertalingen, alle plekken in de soera en voorbeelden elders, plus links naar Lane/Hans Wehr (ejtaal), Almaany, Quranic Corpus, tafsir.net en Tafsir al-Muyassar.
- **Onderzoeksvlag**
  - ⚠ *onderzoek nodig*: de vertaling dekt de Arabische lading maar deels (bijv. دين، تقوى، رب، كفر، روح). Met een notitie.
  - ◐ *let op context*: de betekenis verschuift per vers (automatisch bepaald uit de spreiding van de woord-voor-woordvertalingen, of handmatig).
  - Woorden die maar één keer voorkomen krijgen een notitie dat de betekenis uit die ene context volgt.

## Bronnen

| Wat | Bron |
|---|---|
| Arabische tekst (Uthmani), woord-voor-woord (EN), transliteratie, audio | [quran.com API v4](https://api.quran.com) |
| Nederlandse versvertaling | Malak Faris Abdalsalaam (via quran.com, id 235) |
| Wortel, lemma, woordsoort | [Quranic Arabic Corpus](https://corpus.quran.com) morfologie |
| Nederlandse grondbetekenissen + vlaggen | `tools/nl/*.tsv` (handmatig opgesteld, aanvulbaar) |

De Nederlandse grondbetekenissen zijn een leerhulp, geen fatwa of tafsir. Bij ⚠ altijd een lexicon en tafsir raadplegen.

## Data opnieuw bouwen / betekenissen aanpassen

1. Pas een betekenis aan in `tools/nl/*.tsv` (`id <TAB> betekenis [<TAB> vlag <TAB> notitie]`, id = regelnummer in `tools/lemmas.tsv`, vlag 2 = onderzoek, 1 = context).
2. Download de bron (eenmalig) en bouw:

```bash
tools/download.sh bron
```

```bash
python3 tools/build.py bron
```
