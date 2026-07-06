# -*- coding: utf-8 -*-
"""
國中英文題庫 內部版 建置腳本
來源：17_國中英語文法 專案的版權版 v1.0 master（真實翰林教材，僅內部使用）
輸出：本資料夾 index.html（自包含、密碼鎖、書系→unit 導覽、錯題本、內容講義）
※ 本檔含版權教材，不得進任何公開 repo。
"""
import json, os, hashlib, collections

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(HERE)
SRC  = os.path.join(os.path.dirname(PROJ), '17_國中英語文法')

MASTER = os.path.join(SRC, '_封存_舊OCR與版權資料', 'master_copyrighted_backup.json')
NOTES  = os.path.join(SRC, 'data', 'grammar_notes.json')

DEFAULT_PW = '1019'   # 使用者可在 App 設定內修改

# ---- 載入來源 ----
m = json.load(open(MASTER, encoding='utf-8'))
notes = json.load(open(NOTES, encoding='utf-8'))
questions = list(m['questions'])
passages  = list(m['passages'])
tax = m['taxonomy']

# ---- 合併補充資料（子代理視覺抽取的缺口書系）----
SUPP = os.path.join(PROJ, 'data_supplement')
if os.path.isdir(SUPP):
    for fn in sorted(os.listdir(SUPP)):
        if not fn.endswith('.json'):
            continue
        sd = json.load(open(os.path.join(SUPP, fn), encoding='utf-8'))
        questions.extend(sd.get('questions', []))
        passages.extend(sd.get('passages', []))
        print('  + 補充 %s：%d 題 / %d 文本' % (
            fn, len(sd.get('questions', [])), len(sd.get('passages', []))))

# 文法主題 label / 順序
gtopics = tax['grammarTopics']            # [{key,label,group}]
gt_label = {t['key']: t['label'] for t in gtopics}
gt_order = {t['key']: i for i, t in enumerate(gtopics)}
gt_group = {t['key']: t.get('group', '') for t in gtopics}

# ---- 書系定義（對映 E:\英語資料庫\國中英文 的 02/03 分類）----
# 文法：source -> 顯示名；閱讀：source -> 顯示名
GRAMMAR_SERIES = [
    ('文法特快車',   '文法特快車'),
    ('精熟文法-應用篇', '精熟文法句型—應用篇'),
    ('精熟文法-生活篇', '精熟文法句型—生活篇'),
    ('自編(AI生成)', '自編補充題（非版權）'),
]
READING_SERIES = [
    ('ASK素養閱讀', 'ASK素養閱讀'),
    ('克漏字閱讀理解', '克漏字閱讀理解'),
    ('情境式閱讀',   '情境式閱讀'),
    ('整合式閱讀 L1', '整合式閱讀 Level 1'),
    ('整合式閱讀 L2', '整合式閱讀 Level 2'),
    ('整合式閱讀 L3', '整合式閱讀 Level 3'),
    ('輕素養閱讀1',  '輕素養閱讀 1'),
    ('輕素養閱讀2',  '輕素養閱讀 2'),
    ('輕素養閱讀3',  '輕素養閱讀 3'),
    ('長文讀解',    '長文讀解 fun 輕鬆'),
]
# 閱讀文體 unit 顯示順序
GENRE_ORDER = ['文章', '書信', '對話', '圖表', '告示通知', '看圖填空', '記敘文章', '海報']

def genre_rank(g):
    return GENRE_ORDER.index(g) if g in GENRE_ORDER else 99

# ---- 精簡題目欄位（只留 App 需要的）----
def slimQ(x):
    o = {
        'id': x['id'],
        'stem': x.get('stem', ''),
        'options': x.get('options', []),
        'answer': x.get('answer', 0),
        'exp': x.get('explanation', '') or '',
        'diff': x.get('difficulty', ''),
    }
    if x.get('passageId'):
        o['pid'] = x['passageId']
    return o

qById = {x['id']: x for x in questions}

# ---- 建 passage 查表（source, unitGroup）----
passById = {}          # passageId -> passage
passByUG = {}          # (source, unitGroup) -> passageId
for p in passages:
    passById[p['passageId']] = {
        'id': p['passageId'],
        'text': p.get('text', ''),
        'genre': p.get('genre', ''),
        'level': p.get('level', ''),
    }
    passByUG[(p.get('source'), p.get('unitGroup'))] = p['passageId']

# ---- 組樹 ----
def build_cat(series_list, is_grammar):
    cats = []
    used_q = {}
    for src, name in series_list:
        sq = [x for x in questions if x.get('source') == src]
        if not sq:
            continue
        units = collections.OrderedDict()
        for x in sq:
            if is_grammar:
                ukey = x.get('topicKey') or 'misc'
                ulabel = gt_label.get(ukey, ukey)
            else:
                ukey = x.get('unit') or '其他'
                ulabel = ukey
            u = units.setdefault(ukey, {'key': ukey, 'name': ulabel, 'qids': [], 'pids': []})
            u['qids'].append(x['id'])
            if not is_grammar and x.get('passageId') and x['passageId'] not in u['pids']:
                u['pids'].append(x['passageId'])
            used_q[x['id']] = slimQ(x)
        # 排序 units
        ulist = list(units.values())
        if is_grammar:
            ulist.sort(key=lambda u: gt_order.get(u['key'], 999))
        else:
            ulist.sort(key=lambda u: (genre_rank(u['name']), -len(u['qids'])))
        for u in ulist:
            if not is_grammar:
                u['passages'] = u.get('pids', [])
            u.pop('pids', None)
        cats.append({'key': src, 'name': name, 'units': ulist, 'n': len(sq)})
    return cats, used_q

gram_cats, gq = build_cat(GRAMMAR_SERIES, True)
read_cats, rq = build_cat(READING_SERIES, False)

QDB = {}
QDB.update(gq)
QDB.update(rq)

# 只留有被引用的 passage
usedPids = set()
for c in read_cats:
    for u in c['units']:
        for pid in u.get('passages', []):
            usedPids.add(pid)
PDB = {pid: passById[pid] for pid in usedPids if pid in passById}

# 文法講義：topicKey -> note
NOTES = {k: notes[k] for k in notes}

DATA = {
    'ver': '1.0-internal',
    'grammar': gram_cats,
    'reading': read_cats,
    'Q': QDB,
    'P': PDB,
    'notes': NOTES,
}

# ---- 統計輸出 ----
def count_cat(cats):
    return sum(len(u['qids']) for c in cats for u in c['units'])
print('文法題:', count_cat(gram_cats), ' 書系:', len(gram_cats))
print('閱讀題:', count_cat(read_cats), ' 書系:', len(read_cats), ' passage:', len(PDB))
print('講義:', len(NOTES))

# ---- 產 index.html（密碼加密：PBKDF2 -> AES-256-GCM，透過 node encrypt.js）----
import subprocess, tempfile
tmp = os.path.join(tempfile.gettempdir(), '_gkq_data_plain.json')
open(tmp, 'w', encoding='utf-8').write(json.dumps(DATA, ensure_ascii=False))
tpl_path = os.path.join(HERE, 'template.html')
out_path = os.path.join(PROJ, 'index.html')
try:
    r = subprocess.run(['node', os.path.join(HERE, 'encrypt.js'),
                        tmp, tpl_path, out_path, DEFAULT_PW],
                       capture_output=True, text=True, encoding='utf-8')
    print(r.stdout.strip() or r.stderr.strip())
finally:
    if os.path.exists(tmp):
        os.remove(tmp)   # 明文暫存立即刪除
print('已產出 index.html（密碼 %s，資料已加密）(%d KB)' % (
    DEFAULT_PW, os.path.getsize(out_path) // 1024))
