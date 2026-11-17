"""Stap 1: combineer quran.com woorden + Quranic Arabic Corpus morfologie tot een lemma-lijst."""
import json, re, sys, collections, os
SRC = sys.argv[1]          # map met c1..c114.json, chapters.json, morph.txt
OUT = sys.argv[2]          # map voor tussenresultaten

# --- morfologie: per woord (s,a,w) de segmenten
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

lemmas = {}   # key -> info
words_out = {}
for c in range(1, 115):
    d = json.load(open(os.path.join(SRC, f'c{c}.json'), encoding='utf-8'))
    for v in d['verses']:
        a = v['verse_number']
        ws = [w for w in v['words'] if w['char_type_name'] == 'word']
        for w in ws:
            segs = morph.get((c, a, w['position']))
            if not segs:
                print('geen morfologie', c, a, w['position'], file=sys.stderr); continue
            m = main_seg(segs)
            lem = m.get('LEM', m['form'])
            pos = m['pos']
            key = lem + '|' + m.get('ROOT', '') + '|' + pos
            L = lemmas.setdefault(key, {'lem': lem, 'root': m.get('ROOT', ''), 'pos': pos,
                                        'tags': collections.Counter(), 'n': 0, 'en': collections.Counter(), 'surahs': set()})
            L['n'] += 1; L['surahs'].add(c)
            L['en'][(w['translation']['text'] or '').strip()] += 1
            for t in m['tags']:
                if t in ('PN','ACT_PCPL','PASS_PCPL','VN','ADJ','REL','DEM','NEG','CONJ','INTG','COND','LOC','T','PRON','P'): L['tags'][t] += 1
            if 'VF' in m: L['tags']['VF' + m['VF']] += 1

items = sorted(lemmas.values(), key=lambda L: -L['n'])
print('lemmas:', len(items), 'met n>=2:', sum(1 for L in items if L['n'] >= 2), file=sys.stderr)
os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, 'lemmas.tsv'), 'w', encoding='utf-8') as f:
    for i, L in enumerate(items):
        en = '; '.join(g for g, _ in L['en'].most_common(4))
        tg = ','.join(t for t, _ in L['tags'].most_common(2))
        f.write(f"{i}\t{L['lem']}\t{L['root']}\t{L['pos']}{('/'+tg) if tg else ''}\t{L['n']}\t{len(L['en'])}\t{en}\n")
