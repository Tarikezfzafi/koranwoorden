"""Stap 3: bouw studiebronnen voor de app (Arabisch eerst).

Gebruik:
    python3 tools/sources.py <bronmap>

<bronmap> bevat (zie tools/download_sources.sh):
  - Quranpedia-dumps:  tafsir-book-2012 (التفسير الميسر), tafsir-book-3 (تفسير السعدي),
    tafsir-book-64 (إعراب القرآن وبيانه، محيي الدين درويش), meanings (غريب القرآن), syntax (The Quranic Treebank)
  - b353.json   : المفردات في غريب القرآن (الراغب الأصفهاني), via Quranpedia
  - maqayis.json: مقاييس اللغة (ابن فارس), via github.com/hhiyassat/Maqaiys-roots
  - lane/lexicon.sqlite: Lane's Arabic-English Lexicon, via github.com/laneslexicon/LexiconDatabase (GPL-3.0)

Uitvoer in app/data/:
  v{n}.js   per soera: tafsir, gharib, i'rab (Darwish) en treebank per woord
  lx{k}.js  woordenboeken per beginletter van de wortel (Mufradat, Maqayis, Lane)
  lexidx.js wortel -> [bestand, heeft mufradat, heeft maqayis, heeft lane]
"""
import gzip, json, os, re, sqlite3, sys, collections, html as htmlmod

SRC = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'app', 'data')
meta = json.loads(open(os.path.join(OUT, 'meta.js'), encoding='utf-8').read()[8:-2])
ROOTS = list(meta['roots'].keys())

def gz(name): return json.load(gzip.open(os.path.join(SRC, name + '.json.gz')))

# ---------- HTML opschonen: alleen veilige, eenvoudige opmaak
ALLOWED = {'br', 'b', 'strong', 'i', 'em', 'p', 'span', 'table', 'tr', 'td', 'sup'}
def clean(h):
    h = re.sub(r'<div class="foot-notes">.*?</div>', '', h, flags=re.S)
    h = re.sub(r'<(script|style).*?</\1>', '', h, flags=re.S | re.I)
    def tag(m):
        close, name = m.group(1), m.group(2).lower()
        if name not in ALLOWED: return ''
        if name == 'span' and not close:
            cls = re.search(r'class="([^"]*)"', m.group(0))
            c = 'ayah' if cls and 'book-ayah' in cls.group(1) else 'num' if cls and 'text-danger' in cls.group(1) else ''
            return f'<span class="{c}">' if c else '<span>'
        if name == 'p' and not close: return '<p>'
        if name == 'table' and not close: return '<table class="poem">'
        return f'<{close}{name}>' if name != 'br' else '<br>'
    h = re.sub(r'<(/?)([a-zA-Z0-9]+)[^>]*>', tag, h)
    h = h.replace('\r', '').replace('\n', ' ')
    h = re.sub(r'(<br>\s*){3,}', '<br><br>', h)
    return re.sub(r'\s{2,}', ' ', h).strip()

def strip(h): return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', h)).strip()

# ---------- per soera
def by_ayah(name):
    out = collections.defaultdict(list)
    for x in gz(name)['ayahs']:
        out[(x['surah'], x['ayah'])] = x['content']
    return out

muyassar = by_ayah('tafsir-book-2012')
saadi = by_ayah('tafsir-book-3')
darwish = by_ayah('tafsir-book-64')
meanings = {(m['surah'], m['ayah']): m['meanings'] for m in gz('meanings')['data']}
syntax = {(s['surah'], s['ayah']): s['syntax'] for s in gz('syntax')['data']}
GH_BOOKS = {'السراج في بيان غريب القرآن': 'السراج', 'كلمات القرآن': 'كلمات القرآن', 'تذكرة الأريب في تفسير الغريب': 'تذكرة الأريب', 'التبيان في تفسير غريب القرآن': 'التبيان (ابن الهائم)'}

OFFSET, _o = {}, 0
for _s in meta['surahs']:
    OFFSET[_s[0]] = _o; _o += _s[4]

def grouped(store, n, count):
    """Blokken die over meerdere verzen gaan samenvoegen: [[verzen], html].
    Let op: Quranpedia's 'ayahs'-veld bevat globale versnummers (2:1 = 8)."""
    blocks, index, seen = [], {}, set()
    for a in range(1, count + 1):
        for c in store.get((n, a), []):
            glob = [int(x) for x in str(c.get('ayahs') or '').split(',') if x.strip().isdigit()]
            ay = [g - OFFSET[n] for g in glob if 1 <= g - OFFSET[n] <= count] or [a]
            key = (tuple(ay), c['text'][:300])
            if key in seen: continue
            seen.add(key)
            if tuple(ay) in index: blocks[index[tuple(ay)]][1] += '<br>' + clean(c['text'])
            else: index[tuple(ay)] = len(blocks); blocks.append([ay, clean(c['text'])])
    return blocks

mismatch = 0
for s in meta['surahs']:
    n, count = s[0], s[4]
    qwords = json.loads(open(os.path.join(OUT, f's{n}.js'), encoding='utf-8').read()[10:-3])['v']
    mu, gh, tb = [], [], []
    for a in range(1, count + 1):
        mu.append(clean(' '.join(c['text'] for c in muyassar.get((n, a), []))))
        g = []
        for b in meanings.get((n, a), []):
            src = GH_BOOKS.get(b['book_info']['name'], b['book_info']['name'])
            for w in b['words']:
                g.append([w['text'], clean(w['meaning']), src])
        gh.append(g)
        words = []
        for sen in (syntax.get((n, a)) or {}).get('sentences', []):
            for w in sen['words']:
                toks = []
                for t in w['tokens']:
                    hd = t.get('head') or {}
                    head = hd.get('word') if hd and hd.get('ayah') == a and hd.get('word') != w['number'] else 0
                    toks.append([t['text'], t.get('pos') or '', t.get('rel_ar') or '', head or 0, (t.get('constituent') or {}).get('label') or ''])
                words.append(toks)
        if len(words) != len(qwords[a - 1][1]): mismatch += 1
        tb.append(words)
    data = {'id': n, 'mu': mu, 'sa': grouped(saadi, n, count), 'ir': grouped(darwish, n, count), 'gh': gh, 'tb': tb}
    with open(os.path.join(OUT, f'v{n}.js'), 'w', encoding='utf-8') as f:
        f.write('QW.vloaded(' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ');\n')
print('soera-bestanden klaar; verzen met afwijkend woordenaantal in treebank:', mismatch)

# ---------- wortels koppelen
H = re.compile(r'[ً-ٰٟـ]')
def nz(s): return H.sub('', s).translate(str.maketrans({'أ': 'ء', 'إ': 'ء', 'آ': 'ء', 'ؤ': 'ء', 'ئ': 'ء', 'ى': 'ي', 'ٱ': 'ا'})).strip()
def variants(r):
    r = nz(r); out = {r}
    for x in list(out):
        if len(x) == 3 and x[1] == x[2]: out.add(x[:2]); out.add(x[:2] + 'ّ')
        if len(x) == 4 and x[:2] == x[2:]: out.add(x[:2])
    for x in list(out):
        if len(x) >= 3 and x[-1] in 'وي': out |= {x[:-1] + 'ا', x[:-1] + 'ي', x[:-1] + 'و'}
        if len(x) == 3 and x[1] in 'وي': out |= {x[0] + 'ا' + x[2], x[0] + 'و' + x[2], x[0] + 'ي' + x[2]}
    for x in list(out):
        if 'ء' in x: out.add(x.replace('ء', 'ا')); out.add(x.replace('ء', 'أ'))
    return out

# Lane
LANE = collections.defaultdict(list)
db = sqlite3.connect(os.path.join(SRC, 'lane', 'lexicon.sqlite'))
def lane_html(xml):
    x = re.sub(r'<itype>.*?</itype>', '', xml, flags=re.S)
    x = re.sub(r'<orth[^>]*>(.*?)</orth>', r'<b class="ar">\1</b>', x, flags=re.S)
    x = re.sub(r'<foreign[^>]*lang="ar"[^>]*>(.*?)</foreign>', r'<span class="ar">\1</span>', x, flags=re.S)
    x = re.sub(r'<ref[^>]*target="([^"]*)"[^>]*/>', r'<span class="ar">\1</span>', x)
    x = re.sub(r'<hi rend="ital">(.*?)</hi>', r'<i>\1</i>', x, flags=re.S)
    x = re.sub(r'<(?!/?(b|i|span)\b)[^>]+>', '', x)
    x = re.sub(r'<b class="ar">ذ</b>', '', x)
    return re.sub(r'\s+', ' ', x).strip()
for root, word, itype, xml in db.execute('select root, word, itype, xml from entry order by nodenum'):
    LANE[nz(root)].append(f'<p>{"<b>" + itype + ".</b> " if itype else ""}{lane_html(xml)}</p>')

# Mufradat: pagina's samenvoegen en splitsen op kopwoord
muf_raw = json.load(open(os.path.join(SRC, 'b353.json'), encoding='utf-8'))
heads = []
def walk(nodes):
    for c in nodes:
        if c.get('parent_id') and not c.get('children'): heads.append(c['name'].strip())
        walk(c.get('children') or [])
walk(muf_raw['chapters'])
text = '<br>'.join(re.sub(r'<div class="foot-notes">.*?</div>', '', p['text'], flags=re.S) for p in sorted(muf_raw['contents'], key=lambda p: p['id']))
lines = re.split(r'<br\s*/?>', text)
MUF, cur, hi = {}, None, 0
for ln in lines:
    plain = strip(htmlmod.unescape(ln)).strip()
    nxt = [h for h in heads[hi:hi + 4]]
    if plain in nxt:
        hi = heads.index(plain, hi) + 1; cur = plain; MUF.setdefault(nz(cur), []); continue
    if cur: MUF[nz(cur)].append(ln)
MUF = {k: clean('<br>'.join(v)) for k, v in MUF.items() if v}
print('Mufradat: kopwoorden', len(heads), 'gesplitst', len(MUF))

# Maqayis
MQ = {}
for r in json.load(open(os.path.join(SRC, 'maqayis.json'), encoding='utf-8'))['roots']:
    MQ.setdefault(nz(r['display']), [r.get('semantic_axes') or [], r.get('body_snippet') or ''])

LETTERS = 'ءابتثجحخدذرزسشصضطظعغفقكلمنهوي'
files = collections.defaultdict(dict)
idx, stats = {}, collections.Counter()
for r in ROOTS:
    v = variants(r)
    def pick(store):
        for x in [nz(r)] + sorted(v - {nz(r)}):
            if x in store: return store[x]
    mf, mq, ln = pick(MUF), pick(MQ), pick(LANE)
    first = nz(r)[0]; k = LETTERS.find(first) if first in LETTERS else 0
    e = {}
    if mf: e['mf'] = mf; stats['mufradat'] += 1
    if mq: e['mq'] = [mq[0], clean(mq[1].replace('\n', '<br>'))]; stats['maqayis'] += 1
    if ln: e['ln'] = ''.join(ln); stats['lane'] += 1
    if e:
        files[k][r] = e
        idx[r] = [k, int('mf' in e), int('mq' in e), int('ln' in e)]
for k, d in files.items():
    with open(os.path.join(OUT, f'lx{k}.js'), 'w', encoding='utf-8') as f:
        f.write('QW.lxloaded(' + str(k) + ',' + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ');\n')
with open(os.path.join(OUT, 'lexidx.js'), 'w', encoding='utf-8') as f:
    f.write('QW.lexidx=' + json.dumps(idx, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('wortels:', len(ROOTS), dict(stats))
