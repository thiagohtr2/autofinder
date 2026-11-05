"""Envia o payload (build_payload.py) e as imagens para o Supabase pela função import-data.

Uso: python3 run_import.py <pasta payload> <pasta media> <arquivo com token>
Variáveis: SUPABASE_URL, SUPABASE_ANON_KEY
"""
import json, os, sys, base64, time, urllib.request, urllib.error

PAY, MEDIA, TOKF = sys.argv[1], sys.argv[2], sys.argv[3]
URL = os.environ['SUPABASE_URL'].rstrip('/') + '/functions/v1/import-data'
ANON = os.environ['SUPABASE_ANON_KEY']
TOKEN = open(TOKF).read().strip()
ONLY = set(os.environ.get('ONLY', '').split(',')) - {''}

def call(body, tries=4):
    data = json.dumps(body, ensure_ascii=False).encode()
    for t in range(tries):
        req = urllib.request.Request(URL, data=data, method='POST', headers={
            'Content-Type': 'application/json', 'Authorization': f'Bearer {ANON}', 'apikey': ANON, 'x-import-token': TOKEN})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:500]
            if e.code < 500: raise SystemExit(f'ERRO {e.code}: {msg}')
            time.sleep(2 * (t + 1))
        except Exception as e:
            time.sleep(2 * (t + 1))
    raise SystemExit('falhou depois de várias tentativas')

order = json.load(open(os.path.join(PAY, 'order.json')))
for t in order:
    if ONLY and t not in ONLY: continue
    rows = json.load(open(os.path.join(PAY, f'{t}.json')))
    if t in ('alerts', 'news', 'change_log'):
        call({'action': 'truncate', 'table': t})
    if t in ('brand_links', 'model_links'):
        tab, col = ('brands', 'logo_media_id') if t == 'brand_links' else ('models', 'photo_media_id')
        r = call({'action': 'link', 'table': tab, 'column': col, 'rows': [{'id': x['id'], 'value': x[col]} for x in rows]})
        print(t, r); continue
    step = 100 if t != 'legacy_records' else 60
    for i in range(0, len(rows), step):
        r = call({'action': 'upsert', 'table': t, 'rows': rows[i:i + step]})
    print(t, len(rows), 'ok')

if not ONLY or 'upload' in ONLY:
    media = json.load(open(os.path.join(PAY, 'media.json')))
    for n, m in enumerate(media, 1):
        src_name = m['legacy_asset_id']
        folder = 'car-photos' if m['bucket'] == 'car-photos' else 'brand-logos'
        # arquivos locais estão nomeados pelo dono original (slug do modelo / slug da marca sem hífen)
        cand = [os.path.join(MEDIA, folder, m['storage_path']), os.path.join(MEDIA, folder, m['owner_id'].replace('-', '') + '.png')]
        f = next((c for c in cand if os.path.exists(c)), None)
        if not f: print('SEM ARQUIVO', m['owner_id']); continue
        b64 = base64.b64encode(open(f, 'rb').read()).decode()
        call({'action': 'upload', 'bucket': m['bucket'], 'path': m['storage_path'], 'contentType': 'image/png', 'base64': b64, 'media_id': m['id']})
        if n % 20 == 0: print('imagens', n, '/', len(media))
    print('imagens ok', len(media))
