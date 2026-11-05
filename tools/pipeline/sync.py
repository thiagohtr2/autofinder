"""Plan idempotent writes: compare freshly built docs (out/) with what was last pushed (pushed/).
python3 sync.py plan   -> writes /home/claude/o/plan_N.json batches (<=50) with if_version for updates
python3 sync.py commit -> after the batches succeed: copy out/ -> pushed/, bump versions.json, log change_log entry
Only new or changed documents are written, so re-running a lote never duplicates or rewrites unchanged data."""
import json, os, glob, shutil, sys, hashlib
D = os.path.dirname(os.path.abspath(__file__))
OUT, PUSHED, STAGE = os.path.join(D, 'out'), os.path.join(D, 'pushed'), '/home/claude/o'
VF = os.path.join(D, 'versions.json')
ORDER = ['versions', 'models', 'brands', 'sources', 'import_jobs', 'meta', 'catalog']  # catalog last: page switches only when data is complete

def load(p):
    return json.load(open(p)) if os.path.exists(p) else None

def changed():
    out = []
    for col in ORDER:
        for f in sorted(glob.glob(os.path.join(OUT, col, '*.json'))):
            doc = os.path.basename(f)[:-5]
            new, old = load(f), load(os.path.join(PUSHED, col, doc + '.json'))
            if old is not None:
                strip = lambda d: {k: v for k, v in d.items() if k not in ('updated_at', 'created_at')}
                if strip(new) == strip(old): continue
            out.append((col, doc, f, old is not None))
    # documents pushed before but no longer built (version/model dropped by a refresh lot) -> delete
    for col in ['versions', 'models', 'brands', 'catalog']:
        for f in sorted(glob.glob(os.path.join(PUSHED, col, '*.json'))):
            doc = os.path.basename(f)[:-5]
            if not os.path.exists(os.path.join(OUT, col, doc + '.json')): out.append((col, doc, None, True))
    return out

if __name__ == '__main__':
    vers = load(VF) or {}
    cmd = sys.argv[1]
    ch = changed()
    if cmd == 'plan':
        for p in glob.glob(os.path.join(STAGE, 'plan_*.json')): os.remove(p)
        writes = []
        for col, doc, f, exists in ch:
            if f is None:
                writes.append({'op': 'delete', 'collection': col, 'doc_id': doc, 'if_version': vers.get(f'{col}/{doc}', 1)}); continue
            dst = os.path.join(STAGE, col, doc + '.json'); os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copy(f, dst)
            w = {'op': 'set', 'collection': col, 'doc_id': doc, 'file_path': f'o/{col}/{doc}.json'}
            if exists: w['if_version'] = vers.get(f'{col}/{doc}', 1)
            writes.append(w)
        # keep catalog in its own final batch
        cat = [w for w in writes if w['collection'] == 'catalog']; rest = [w for w in writes if w['collection'] != 'catalog']
        batches = [rest[i:i + 50] for i in range(0, len(rest), 50)] + [cat[i:i + 50] for i in range(0, len(cat), 50)]
        for i, b in enumerate(batches): json.dump(b, open(os.path.join(STAGE, f'plan_{i}.json'), 'w'), separators=(',', ':'))
        print('changed', len(ch), 'new', sum(1 for c in ch if not c[3]), 'updates', sum(1 for c in ch if c[3] and c[2]), 'deletes', sum(1 for c in ch if c[2] is None), 'batches', len(batches))
    elif cmd == 'commit':
        for col, doc, f, exists in ch:
            if f is None:
                os.remove(os.path.join(PUSHED, col, doc + '.json')); vers.pop(f'{col}/{doc}', None); continue
            os.makedirs(os.path.join(PUSHED, col), exist_ok=True); shutil.copy(f, os.path.join(PUSHED, col, doc + '.json'))
            k = f'{col}/{doc}'; vers[k] = vers.get(k, 0) + 1 if exists else 1
        json.dump(vers, open(VF, 'w'), indent=0)
        print('committed', len(ch))
