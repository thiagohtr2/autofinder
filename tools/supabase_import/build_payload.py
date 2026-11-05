"""Monta as linhas de cada tabela do Supabase a partir da exportação em data/.

Uso: python3 build_payload.py <pasta data> <manifest de imagens> <saida> [pasta com votes/comments privados]
Gera <saida>/<tabela>.json (lista de linhas) e <saida>/order.json (ordem de carga).
"""
import json, os, re, sys, uuid, glob

DATA, MANIFEST, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
PRIV = sys.argv[4] if len(sys.argv) > 4 else None
os.makedirs(OUT, exist_ok=True)
L = lambda c: json.load(open(os.path.join(DATA, f'{c}.json')))

brands, models, versions, catalog = L('brands'), L('models'), L('versions'), L('catalog')
sources, alerts, news = L('sources'), L('alerts'), L('news')
photos, logos, meta = L('photos'), L('logos'), L('meta')
radar, runs = L('radar'), L('radar_runs')
manifest = json.load(open(MANIFEST))

# sites oficiais (mesma lista usada no site)
html = open(os.path.join(os.path.dirname(DATA), 'public', 'index.html'), encoding='utf-8').read()
SITES = json.loads(re.search(r'const SITES_BASE=(\{.*?\});', html).group(1))
slug = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())

def date_or_none(s):
    return s if isinstance(s, str) and re.match(r'^\d{4}-\d{2}-\d{2}$', s) else None

T = {}

# ---------- mídia (ids gerados aqui para ligar marcas e modelos)
media, photo_id, logo_id = [], {}, {}
brand_by_slug = {b.replace('-', ''): b for b in brands}
for it in manifest:
    mid = str(uuid.uuid5(uuid.NAMESPACE_URL, f"giroauto:{it['kind']}:{it['owner']}:{it['legacy']}"))
    owner = it['owner'] if it['kind'] == 'model_photo' else brand_by_slug.get(it['owner'], it['owner'])
    path = f"{owner}.png"
    media.append(dict(id=mid, kind=it['kind'], owner_id=owner, bucket=it['bucket'], storage_path=path,
                      mime_type='image/png', bytes=it['bytes'], ai_generated=it['ai'], is_current=True,
                      legacy_asset_id=it['legacy']))
    (photo_id if it['kind'] == 'model_photo' else logo_id)[owner] = mid
T['media'] = media

T['brands'] = [dict(id=k, name=b['name'], group_name=b.get('group'), country=b.get('country'),
                    site_url=SITES.get(slug(b['name'])) or SITES.get(k.replace('-', '')),
                    status=b.get('status') or 'on_sale', logo_media_id=None, raw=b) for k, b in brands.items()]

T['models'] = [dict(id=k, brand_id=m['brand_id'], name=m['name'], body=m.get('body'), status=m.get('status') or 'on_sale',
                    price_min=m.get('price_min'), price_max=m.get('price_max'), photo_media_id=None, raw=m)
               for k, m in models.items()]

rows = {r['i']: r for d in catalog.values() for r in d['rows']}
V = []
for k, v in versions.items():
    pt, pr, og, r = v.get('powertrain') or {}, v.get('price') or {}, v.get('origin') or {}, rows.get(k, {})
    V.append(dict(
        id=k, brand_id=v['brand_id'], model_id=v['model_id'], brand=v.get('brand'), model=v.get('model'),
        version=v.get('version') or '', display_name=v.get('display_name'), model_year=v.get('model_year'),
        status=v.get('status') or 'on_sale', body=v.get('body'),
        price=pr.get('value'), price_kind=pr.get('kind'), price_ref_month=pr.get('ref_month'), price_promo=pr.get('promo'),
        price_validity=pr.get('validity'), price_source_id=pr.get('source_id'),
        engine_desc=pt.get('engine_desc'), fuel=pt.get('fuel'), fuel_raw=pt.get('fuel_raw'), propulsion=pt.get('propulsion'),
        power_cv=pt.get('power_cv'), power_cv_status=pt.get('power_cv_status'), torque_kgfm=pt.get('torque_kgfm'),
        displacement_l=pt.get('displacement_l'), transmission=pt.get('transmission'), transmission_raw=pt.get('transmission_raw'),
        drive=pt.get('drive'), turbo=pt.get('turbo'),
        brand_country=og.get('brand_country'), manufactured_in=og.get('manufactured_in'), national=og.get('national'),
        highlights=v.get('highlights') or [], specs=v.get('specs') or {}, quality=v.get('quality') or {},
        notes=v.get('notes'), source_ids=v.get('sources') or [], image_refs=v.get('images') or [],
        radar_item_id=r.get('rn') or v.get('radar'), new_since=date_or_none(r.get('nv')), updated_since=date_or_none(r.get('up')),
        raw=v, catalog_row=r or None, created_on=date_or_none(v.get('created_at'))))
T['versions'] = V

T['sources'] = [dict(id=k, name=s.get('name'), url=s.get('url'), type=s.get('type'),
                     consulted_at=date_or_none(s.get('consulted_at')), raw=s) for k, s in sources.items()]
T['version_sources'] = [dict(version_id=k, source_id=sid) for k, v in versions.items()
                        for sid in sorted(set(v.get('sources') or [])) if sid in sources]

T['alerts'] = [dict(model_id=k, kind=i.get('kind') or 'midia', title=i.get('title') or '', summary=i.get('summary'),
                    affects=i.get('affects'), source=i.get('source'), url=i.get('url'), date=date_or_none(i.get('date')))
               for k, d in alerts.items() for i in d.get('items', [])]
T['news'] = [dict(model_id=k, title=i.get('title') or '', summary=i.get('summary'), source=i.get('source'), url=i.get('url'),
                  date=date_or_none(i.get('date')),
                  extra={x: y for x, y in i.items() if x not in ('title', 'summary', 'source', 'url', 'date')})
             for k, d in news.items() for i in d.get('items', [])]

T['radar_runs'] = [dict(id=k, at=r.get('at'), summary=r.get('summary'), highlights=r.get('highlights') or [],
                        total=(r.get('counts') or {}).get('total'), essential=(r.get('counts') or {}).get('essential'), raw=r)
                   for k, r in runs.items()]
T['radar_items'] = [dict(id=k, run_id=i.get('run') if i.get('run') in runs else None, title=i.get('title') or '',
                         summary=i.get('summary'), kind=i.get('kind'), essential=bool(i.get('essential')), brand=i.get('brand'),
                         model=i.get('model'), model_id=i.get('model_id'), date=date_or_none(i.get('date')), source=i.get('source'),
                         url=i.get('url'), in_db=i.get('in_db'), action=i.get('action'), add_payload=i.get('add'),
                         status=i.get('status') if i.get('status') in ('novo', 'feito', 'ignorado') else 'novo',
                         applied_at=i.get('applied_at'), applied_log=i.get('applied_log'), applied_brand=i.get('applied_brand'),
                         applied_model=i.get('applied_model'), raw=i) for k, i in radar.items()]

T['site_meta'] = [dict(key=k, value=v) for k, v in meta.items()] + [dict(key='brand_sites', value=SITES)]

# ---------- dados privados (fora do repositório)
legacy = []
if PRIV:
    for f in glob.glob(os.path.join(PRIV, '*', '*.json')):
        col, doc = f.split(os.sep)[-2], os.path.basename(f)[:-5]
        d = json.load(open(f))
        legacy.append(dict(collection=col, doc_id=doc, data=d))
    T['legacy_votes'] = [dict(legacy_user_id=x['doc_id'], car_id=c, voted_at=None)
                         for x in legacy if x['collection'] == 'votes' for c in x['data'].get('cars', [])]
    T['change_log'] = [dict(at=None, actor=x['data'].get('by'), radar_item_id=x['data'].get('item'),
                            model_id=x['data'].get('model'), payload=x['data'])
                       for x in legacy if x['collection'] == 'change_log']
    T['import_jobs'] = [dict(id=x['doc_id'], data=x['data']) for x in legacy if x['collection'] == 'import_jobs']
    for row in T['change_log']:
        row['at'] = row['payload'].get('at')
    T['comments_legacy_note'] = []

# cópia bruta de TODOS os documentos, coleção por coleção
for f in sorted(glob.glob(os.path.join(DATA, '*.json'))):
    col = os.path.basename(f)[:-5]
    for doc, d in json.load(open(f)).items():
        legacy.append(dict(collection=col, doc_id=doc, data=d))
T['legacy_records'] = legacy
T.pop('comments_legacy_note', None)

# ligações de imagem
T['brand_links'] = [dict(id=k, logo_media_id=logo_id[k]) for k in brands if k in logo_id]
T['model_links'] = [dict(id=k, photo_media_id=photo_id[k]) for k in models if k in photo_id]

order = ['media', 'brands', 'models', 'sources', 'versions', 'version_sources', 'alerts', 'news', 'radar_runs',
         'radar_items', 'site_meta', 'import_jobs', 'change_log', 'legacy_votes', 'legacy_records', 'brand_links', 'model_links']
order = [t for t in order if t in T]
for t in order:
    json.dump(T[t], open(os.path.join(OUT, f'{t}.json'), 'w'), ensure_ascii=False)
json.dump(order, open(os.path.join(OUT, 'order.json'), 'w'))
print({t: len(T[t]) for t in order})
