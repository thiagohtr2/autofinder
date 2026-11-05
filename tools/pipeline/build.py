"""giroauto data builder (schema v1).
Reads lote files (lotes/*.json, same shape as versoes_*.json) plus the legacy page CARS,
normalizes them and writes one JSON file per document under out/<collection>/<id>.json.
Idempotent: ids are derived from brand/model/version slugs (legacy ids are kept so likes survive)."""
import json, re, os, glob, unicodedata, hashlib, sys, datetime
D = os.path.dirname(os.path.abspath(__file__))
TODAY = os.environ.get('GIRO_DATE', '2026-11-03')
OUT = os.path.join(D, 'out')

def slug(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:48]

BRANDS = json.load(open(os.path.join(D, 'brands_meta.json')))   # slug -> meta
LEGACY = json.load(open(os.path.join(D, 'legacy_ids.json')))     # "brand|model|version" -> id
BODY = json.load(open(os.path.join(D, 'model_body.json')))       # "brand|model" -> body

def fuel_norm(f):
    f = (f or '').lower()
    if 'plug' in f: return 'Híbrido plug-in', 'híbrido plug-in'
    if 'leve' in f or 'mhev' in f: return 'Flex', 'híbrido leve'
    if 'brid' in f: return 'Híbrido', 'híbrido'
    if 'létr' in f or 'letr' in f: return 'Elétrico', 'elétrico'
    if 'diesel' in f: return 'Diesel', 'combustão'
    if 'gasol' in f: return 'Gasolina', 'combustão'
    if 'etanol' in f: return 'Etanol', 'combustão'
    if 'flex' in f: return 'Flex', 'combustão'
    return None, None

def trans_norm(t):
    t = (t or '').lower()
    if not t: return None
    if 'manual' in t or re.search(r'\bmt\b', t): return 'Manual'
    if 'cvt' in t: return 'CVT'
    if 'dupla' in t or 'dct' in t or 'edc' in t: return 'Dupla embreagem'
    if 'dht' in t or 'redução' in t or 'reducao' in t: return 'Automático (elétrico/DHT)'
    return 'Automático'

def num(rx, s):
    m = re.search(rx, s or '', re.I)
    return float(m.group(1).replace(',', '.')) if m else None

def src_type(name, url):
    u = (url or '').lower(); n = (name or '').lower()
    if 'fipe' in n or 'tabelacarros' in u: return 'fipe'
    if any(k in u for k in ['renault.com.br', 'toyota.com.br', 'fiat.com.br', 'chevrolet.com.br', 'vw.com.br', 'honda.com.br', 'hyundai.com.br', 'ford.com.br', 'fromtheroad', 'jeep.com.br', 'byd.com', 'gwmmotors']): return 'oficial'
    return 'imprensa'

def build(lotes):
    docs = {k: {} for k in ['brands', 'models', 'versions', 'sources', 'catalog']}
    # refresh lots (r_*.json) replace every older entry of the brands they cover
    REFRESH = {slug(m['marca']) for f in lotes if os.path.basename(f).startswith('r_') for m in json.load(open(f))}
    for f in lotes:
        isr = os.path.basename(f).startswith('r_')
        for m in json.load(open(f)):
            bslug = slug(m['marca'])
            if bslug in REFRESH and not isr: continue
            if bslug not in BRANDS:
                print('MARCA SEM META', m['marca'], file=sys.stderr); continue
            bm = BRANDS[bslug]
            mslug = f"{bslug}-{slug(m['modelo'])}"
            body = m.get('carroceria') or BODY.get(f"{bslug}|{slug(m['modelo'])}")
            vers = [v for v in m.get('versoes', []) if v.get('versao')]
            for v in vers:
                key = f"{bslug}|{slug(m['modelo'])}|{slug(v['versao'])}"
                vid = LEGACY.get(key) or f"{mslug}-{slug(v['versao'])}"
                price = v.get('preco_reais')
                price = int(round(price)) if isinstance(price, (int, float)) and price > 20000 else None
                kind = 'fipe' if str(v.get('tipo', '')).lower() == 'fipe' else ('sugerido' if price else None)
                fuel, prop = fuel_norm(v.get('combustivel'))
                motor = (v.get('motor') or '').strip()
                url = v.get('fonte_url'); sname = (v.get('fonte_nome') or '').strip()
                sid = hashlib.sha1((url or sname or 'none').encode()).hexdigest()[:16]
                if url:
                    docs['sources'][sid] = {'url': url, 'name': sname, 'type': src_type(sname, url), 'consulted_at': v.get('consultado_em') or TODAY}
                text = (motor + ' ' + v['versao']).lower()
                turbo = True if re.search(r'turbo|tsi|\btb\b|t270|tgdi|\bgdi turbo', text) else None
                drive = 'Integral' if re.search(r'4x4|awd|4wd|4motion|quattro|xdrive', text) else None
                hl = [t for t in v.get('pontos_fortes', []) if t in ('eletrico','hibrido','potente','economico','turbo','x4','diesel','espaco','tech')]
                doc = {
                    'schema': 1, 'id': vid, 'brand_id': bslug, 'model_id': mslug,
                    'brand': bm['name'], 'model': m['modelo'].strip(), 'version': v['versao'].strip(),
                    'display_name': f"{bm['name']} {m['modelo'].strip()} {v['versao'].strip()}",
                    'model_year': int(v.get('ano_modelo') or m.get('ano_modelo') or 0) or None,
                    'status': v.get('status') or 'on_sale', 'body': body,
                    'origin': {'brand_country': bm.get('country'), 'manufactured_in': v.get('fabricado_em'), 'national': v.get('nacional')},
                    'price': {'value': price, 'kind': kind, 'ref_month': TODAY[:7], 'source_id': sid if url else None,
                              'validity': 'valid' if price else 'unknown', 'promo': v.get('preco_promocional')},
                    'price_k': round(price / 1000, 3) if price else None,
                    'powertrain': {'engine_desc': motor or None, 'fuel': fuel, 'fuel_raw': v.get('combustivel'), 'propulsion': prop,
                                   'power_cv': num(r'(\d+[\.,]?\d*)\s*cv', motor), 'power_cv_status': 'from_source_text' if num(r'(\d+[\.,]?\d*)\s*cv', motor) else 'unknown',
                                   'torque_kgfm': num(r'(\d+[\.,]?\d*)\s*kgfm', motor), 'displacement_l': num(r'\b(\d\.\d)\b', motor),
                                   'turbo': turbo, 'transmission': trans_norm(v.get('cambio')), 'transmission_raw': v.get('cambio'), 'drive': drive},
                    'highlights': hl,
                    'specs': {g: None for g in ['dimensions', 'performance', 'efficiency', 'battery', 'safety', 'technology', 'comfort', 'mechanical', 'warranty']},
                    'images': [], 'sources': [sid] if url else [],
                    'notes': v.get('observacao'),
                    'created_at': TODAY, 'updated_at': TODAY,
                }
                ess = {'price': price, 'model_year': doc['model_year'], 'body': body, 'fuel': fuel, 'transmission': doc['powertrain']['transmission'], 'power_cv': doc['powertrain']['power_cv'], 'source': url}
                miss = [k for k, x in ess.items() if not x]
                doc['quality'] = {'essential_filled': len(ess) - len(miss), 'essential_total': len(ess), 'missing': miss,
                                  'completeness_pct': round(100 * (len(ess) - len(miss)) / (len(ess) + 9)),  # 9 spec groups still null
                                  'confidence': 'oficial' if src_type(sname, url) == 'oficial' else ('fipe' if kind == 'fipe' else 'imprensa')}
                if vid in docs['versions']:
                    alt = f"{vid}-{slug(v.get('combustivel') or 'b')}"
                    if alt in docs['versions'] or docs['versions'][vid]['model_id'] != mslug:
                        print('DUPLICADA', vid, file=sys.stderr); continue
                    print('VERSAO HOMONIMA renomeada', vid, '->', alt, file=sys.stderr)
                    vid = alt; doc['id'] = vid
                docs['versions'][vid] = doc
            mdoc = docs['models'].setdefault(mslug, {'id': mslug, 'brand_id': bslug, 'name': m['modelo'].strip(), 'body': body, 'status': 'on_sale', 'versions': [], 'updated_at': TODAY})
            mdoc['versions'] = sorted(set(mdoc['versions']) | {x for x in docs['versions'] if docs['versions'][x]['model_id'] == mslug})
    for vid, d in docs['versions'].items():
        b = docs['brands'].setdefault(d['brand_id'], dict(BRANDS[d['brand_id']], id=d['brand_id'], status='on_sale', updated_at=TODAY, models=[], versions_count=0))
        if d['model_id'] not in b['models']: b['models'].append(d['model_id'])
        b['versions_count'] += 1
    for mid, md in docs['models'].items():
        ps = [docs['versions'][v]['price']['value'] for v in md['versions'] if docs['versions'][v]['price']['value']]
        md['price_min'], md['price_max'] = (min(ps), max(ps)) if ps else (None, None)
    # compact catalog: one doc per brand, used by the roulette page
    for bid, b in docs['brands'].items():
        rows = []
        for vid, d in sorted(docs['versions'].items(), key=lambda x: x[1]['price']['value'] or 0):
            if d['brand_id'] != bid: continue
            rows.append({'i': vid, 'm': d['model_id'], 'mn': d['model'], 'v': d['version'], 'y': d['model_year'], 'p': d['price']['value'],
                         'pk': d['price']['kind'], 'b': d['body'], 'f': d['powertrain']['fuel'], 'pr': d['powertrain']['propulsion'],
                         't': d['powertrain']['transmission'], 'cv': d['powertrain']['power_cv'], 'k': d['highlights'], 'st': d['status'],
                         'e': d['powertrain']['engine_desc']})
        docs['catalog'][bid] = {'brand': b['name'], 'brand_id': bid, 'rows': rows, 'updated_at': TODAY}
    return docs

if __name__ == '__main__':
    lotes = sorted(f for f in glob.glob(os.path.join(D, 'lotes', '*.json')) if os.path.basename(f) not in os.environ.get('SKIP','').split(','))
    docs = build(lotes)
    for col, items in docs.items():
        os.makedirs(os.path.join(OUT, col), exist_ok=True)
        for k, v in items.items():
            json.dump(v, open(os.path.join(OUT, col, f'{k}.json'), 'w'), ensure_ascii=False)
    print({k: len(v) for k, v in docs.items()})
