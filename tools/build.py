"""Stap 2: bouw de datafiles voor de app (app/data/*.js).

Gebruik:
    python3 tools/build.py <bronmap>

<bronmap> bevat: chapters.json, c1.json .. c114.json (quran.com API v4) en morph.txt
(Quranic Arabic Corpus morfologie). Zie tools/download.sh.

Nederlandse lemma-betekenissen komen uit tools/nl/*.tsv:
    id <TAB> nederlandse betekenis [<TAB> vlag [<TAB> notitie]]
id = regelnummer (0-based) in tools/lemmas.tsv. vlag: 2 = onderzoek nodig, 1 = context-afhankelijk.
"""
import json, os, re, sys, collections, glob

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1]
APP = os.path.join(HERE, '..', 'app', 'data')
os.makedirs(APP, exist_ok=True)

# ---------- morfologie
morph = collections.defaultdict(list)
for line in open(os.path.join(SRC, 'morph.txt'), encoding='utf-8'):
    loc, form, pos, feats = line.rstrip('\n').split('\t')
    s, a, w, seg = map(int, loc.split(':'))
    f = feats.split('|')
    d = {'form': form, 'pos': pos, 'tags': [x for x in f if ':' not in x]}
    for x in f:
        if ':' in x:
            k, v = x.split(':', 1); d[k] = v
    morph[(s, a, w)].append(d)

def main_seg(segs):
    core = [x for x in segs if 'PREF' not in x['tags'] and 'SUFF' not in x['tags']]
    if not core: core = segs
    for x in core:
        if x['pos'] in ('N', 'V'): return x
    return core[0]

PERSONS = {'1S','1P','2MS','2FS','2D','2MD','2FD','2MP','2FP','3MS','3FS','3D','3MD','3FD','3MP','3FP'}
STEMTAGS = ('PERF','IMPF','IMPV','PASS','ACT_PCPL','PASS_PCPL','VN','PN','ADJ','M','F','MS','FS','MD','FD','MP','FP','NOM','ACC','GEN','INDEF','D','P')
def morph_code(segs, main):
    """Compacte woordopbouw: lijst van [vorm, code]. Codes: p<lemma> voorvoegsel, s<POS>|tags stam,
    x<persoon> voornaamwoord-achtervoegsel (bezit/object), v<persoon> onderwerpsuitgang werkwoord, e overig."""
    out = []
    stem_person = None
    for x in segs:
        if x is main:
            tags = [t for t in x['tags'] if t in STEMTAGS or t in PERSONS]
            if 'VF' in x: tags.append('VF' + x['VF'])
            for t in x['tags']:
                if t in PERSONS: stem_person = t
            out.append([x['form'], 's' + x['pos'] + '|' + ','.join(tags)])
        elif 'PREF' in x['tags']:
            out.append([x['form'], 'p' + x.get('LEM', x['form'])])
        elif 'SUFF' in x['tags'] and 'PRON' in x['tags']:
            per = next((t for t in x['tags'] if t in PERSONS), '')
            if main['pos'] == 'V' and per == stem_person and not any(o[1][0] == 'v' for o in out):
                out.append([x['form'], 'v' + per])
            else:
                out.append([x['form'], 'x' + per])
        else:
            out.append([x['form'], 'e'])
    return out[0][1] if len(out) == 1 else out  # enkel segment: alleen de code

# ---------- lemma-index (vast, uit lemmas.tsv)
lem_rows = [l.rstrip('\n').split('\t') for l in open(os.path.join(HERE, 'lemmas.tsv'), encoding='utf-8')]
key2id = {}
for r in lem_rows:
    i, lem, root, pos = int(r[0]), r[1], r[2], r[3].split('/')[0]
    key2id[lem + '|' + root + '|' + pos] = i

# ---------- Nederlandse betekenissen
nl = {}
for fn in sorted(glob.glob(os.path.join(HERE, 'nl', '*.tsv'))):
    for line in open(fn, encoding='utf-8'):
        line = line.rstrip('\n')
        if not line or line.startswith('#'): continue
        p = line.split('\t')
        nl[int(p[0])] = (p[1].strip(), int(p[2]) if len(p) > 2 and p[2].strip() else 0, p[3].strip() if len(p) > 3 else '')

# ---------- verzamel
STRIP = re.compile(r'^(?:(?:and|then|so|but|indeed|verily|surely|certainly|or|that|o|nay|yet|while|when|if|for|to|of|in|on|by|with|from|the|a|an|is|are|was|were|be|will|shall|do|did|not|no)\b\s*)+', re.I)
def norm_gloss(g):
    g = re.sub(r'\([^)]*\)|\[[^\]]*\]', ' ', g.lower())
    g = re.sub(r'[^a-z\' -]', ' ', g)
    g = STRIP.sub('', g.strip())
    g = re.sub(r'\b(you|we|they|he|she|it|i|them|him|her|us|me|your|our|their|his|its|my|those|who)\b', ' ', g)
    g = re.sub(r'\s+', ' ', g).strip()
    g = re.sub(r'\b(have|has|had|been|being|made to|became|become)\b', ' ', g)
    # grove stam: eerste 3 letters per woord (made/make, believe/believed vallen samen)
    return ' '.join(x[:3] for x in g.split())

lem_info = [{'n': 0, 'en': collections.Counter(), 'enn': collections.Counter(), 'sur': set(), 'occ': []} for _ in lem_rows]
POSNL = {'N': 'naamwoord', 'V': 'werkwoord', 'P': 'partikel'}

chapters = json.load(open(os.path.join(SRC, 'chapters.json'), encoding='utf-8'))['chapters']
surah_meta = []
for ch in chapters:
    c = ch['id']
    d = json.load(open(os.path.join(SRC, f'c{c}.json'), encoding='utf-8'))
    verses = []
    lemset = collections.OrderedDict()
    for v in d['verses']:
        a = v['verse_number']
        nltxt = v['translations'][0]['text'] if v.get('translations') else ''
        nltxt = re.sub(r'<[^>]+>', '', nltxt).strip()
        ws = []
        for w in v['words']:
            if w['char_type_name'] != 'word': continue
            segs = morph[(c, a, w['position'])]
            m = main_seg(segs)
            key = m.get('LEM', m['form']) + '|' + m.get('ROOT', '') + '|' + m['pos']
            lid = key2id[key]
            en = (w['translation']['text'] or '').strip()
            tr = (w['transliteration']['text'] or '').strip()
            ws.append([w['text_uthmani'], en, tr, lid, morph_code(segs, m)])
            L = lem_info[lid]
            L['n'] += 1; L['sur'].add(c); L['en'][en] += 1
            ng = norm_gloss(en)
            if ng: L['enn'][ng] += 1
            L['occ'].append(f'{c}:{a}:{w["position"]}')
            lemset[lid] = lemset.get(lid, 0) + 1
        verses.append([nltxt, ws])
    out = {'id': c, 'v': verses}
    with open(os.path.join(APP, f's{c}.js'), 'w', encoding='utf-8') as f:
        f.write('QW.loaded(' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ');\n')
    surah_meta.append([c, ch['name_simple'], ch['name_arabic'], ch['translated_name']['name'],
                       ch['verses_count'], ch['revelation_place'][0], len(lemset), sum(lemset.values()), list(lemset.keys())])

# ---------- lemma-tabel met onderzoeksvlag
lemmas = []
missing_nl = 0
for r, L in zip(lem_rows, lem_info):
    i, lem, root, posfull = int(r[0]), r[1], r[2], r[3]
    pos = posfull.split('/')[0]; sub = posfull.split('/')[1] if '/' in posfull else ''
    top_en = [g for g, _ in L['en'].most_common(5)]
    # meest voorkomende 'schone' glossen
    tot = sum(L['enn'].values()) or 1
    distinct_keys = [g for g, k in L['enn'].most_common() if k / tot >= 0.08]
    # toon per sleutel de meest voorkomende echte Engelse glos
    distinct = []
    for key in distinct_keys:
        for g, _ in L['en'].most_common():
            if norm_gloss(g) == key:
                distinct.append(re.sub(r'^(and|then|so|indeed|and indeed)\s+', '', g, flags=re.I)); break
    nlm, flag, note = nl.get(i, ('', 0, ''))
    auto = []
    if not nlm: missing_nl += 1
    if L['n'] == 1:
        auto.append('Komt maar één keer voor in de Koran: betekenis volgt uit deze ene context, check een lexicon.')
    func = pos == 'P' or any(t in sub for t in ('PRON', 'DEM', 'REL'))
    varies = not func and len(distinct) >= 3 and L['n'] >= 4
    if varies:
        auto.append('Vertaling wisselt per context (' + ', '.join(distinct[:4]) + ').')
    if func:
        auto.append('Functiewoord: de betekenis hangt af van de zinsbouw.')
    level = flag
    if level == 0 and varies: level = 1
    lemmas.append([lem, root, pos, sub, L['n'], nlm, level, note, ' · '.join(auto), top_en[:4], len(L['sur'])])

# ---------- wortelindex: wortel -> [kernbetekenis, lemma-ids (op frequentie), totaal]
roots = {}
for i, l in enumerate(lemmas):
    if l[1]: roots.setdefault(l[1], []).append(i)
root_tab = {}
for r, ids in roots.items():
    ids.sort(key=lambda i: -lemmas[i][4])
    verbs = [i for i in ids if lemmas[i][2] == 'V' and 'VF1' in lemmas[i][3]]
    kern_id = verbs[0] if verbs else ids[0]
    root_tab[r] = [lemmas[kern_id][5], kern_id, ids, sum(lemmas[i][4] for i in ids)]
meta = {'surahs': surah_meta, 'lemmas': lemmas, 'pos': POSNL, 'roots': root_tab}
with open(os.path.join(APP, 'meta.js'), 'w', encoding='utf-8') as f:
    f.write('QW.meta=' + json.dumps(meta, ensure_ascii=False, separators=(',', ':')) + ';\n')
with open(os.path.join(APP, 'occ.js'), 'w', encoding='utf-8') as f:
    f.write('QW.occ=' + json.dumps([' '.join(L['occ']) for L in lem_info], separators=(',', ':')) + ';\n')
print('klaar. lemma\'s zonder NL:', missing_nl, 'van', len(lemmas))
