/* giroauto: camada de dados sobre o Supabase.
 *
 * O site foi escrito para um banco de documentos, com claude.use("db"),
 * claude.use("user") e claude.use("assets"). Este arquivo oferece essa mesma
 * interface e traduz cada chamada para as tabelas do Supabase.
 *
 * A chave abaixo é pública por natureza: quem protege os dados são as regras de
 * acesso (RLS) do banco. Nunca coloque aqui a chave service_role.
 */
(() => {
  const SUPABASE_URL = "https://ljgcvxadsekaicffztbi.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2N2eGFkc2VrYWljZmZ6dGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3OTYyNjMsImV4cCI6MjEwOTM3MjI2M30._lZd1-cALOXrnR3nI0rwwWkfIAXYZ_qmVHJ7s3Ka2BM";
  const PAGE_SIZE = 1000;
  const REFRESH_MS = 60000; // curtidas e comentários de outras pessoas aparecem sem recarregar
  const SNAPSHOT_METADATA = { fromCache: false };
  const EXTENSIONS = { "image/png": "png", "image/webp": "webp", "image/jpeg": "jpg", "image/avif": "avif", "image/svg+xml": "svg" };
  const IMAGE_KINDS = {
    photos: { kind: "model_photo", bucket: "car-photos", table: "models", column: "photo_media_id" },
    logos: { kind: "brand_logo", bucket: "brand-logos", table: "brands", column: "logo_media_id" },
  };
  const IMAGE_WIDTHS = { "car-photos": 900, "brand-logos": 160 };
  const RAW_TABLES = new Set(["brands", "models", "versions", "sources", "radar_runs"]);
  const RADAR_COLUMNS = ["status", "applied_at", "applied_log", "applied_brand", "applied_model"];
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ---------- utilidades

  // o site reconhece a falta de permissão pelo código "permission_denied"
  const toError = (error) => Object.assign(new Error(error.message), { code: error.code === "42501" ? "permission_denied" : error.code });

  async function run(query) {
    const { data, error } = await query;
    if (error) throw toError(error);
    return data;
  }

  async function selectAll(table, columns, order, filter = (query) => query) {
    const rows = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const page = await run(filter(sb.from(table).select(columns)).order(order).range(from, from + PAGE_SIZE - 1));
      rows.push(...page);
      if (page.length < PAGE_SIZE) return rows;
    }
  }

  const docOf = (id, data) => ({ id, exists: data != null, data: () => data });
  const snapshotOf = (docs) => ({ docs, empty: docs.length === 0, metadata: SNAPSHOT_METADATA });
  const dateOrNull = (value) => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);
  const withoutUndefined = (row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value === undefined ? null : value]));
  const brandSlug = (name) => name.normalize("NFKD").replace(/[^\w]/g, "").toLowerCase();

  function randomAssetId() {
    return [...crypto.getRandomValues(new Uint8Array(16))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  // ---------- sessão

  let currentUser = null;
  let isAdmin = false;

  const ready = (async () => {
    const { data } = await sb.auth.getSession();
    currentUser = (data.session && data.session.user) || null;
    if (!currentUser) return;
    const profile = await run(sb.from("profiles").select("role").eq("id", currentUser.id).maybeSingle());
    isAdmin = !!profile && profile.role === "admin";
  })().catch(() => {});

  const userApi = {
    id: async () => (currentUser ? currentUser.id : null),
    canEdit: () => isAdmin,
    async profiles(ids) {
      const valid = ids.filter((id) => UUID.test(id));
      if (!valid.length) return {};
      const rows = await run(sb.from("profiles").select("id,display_name").in("id", valid));
      return Object.fromEntries(rows.map((row) => [row.id, { name: row.display_name }]));
    },
  };

  window.giroAuth = {
    current: () => (currentUser ? { email: currentUser.email, isAdmin } : null),
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw toError(error);
    },
    async signOut() {
      const { error } = await sb.auth.signOut();
      if (error) throw toError(error);
    },
  };

  // ---------- imagens

  // o site identifica cada imagem por um id de 32 caracteres, guardado em media.legacy_asset_id
  const assetsById = new Map();
  const pendingUploads = new Map();
  let imagesLoading = null;

  window.blobUrl = (assetId) => {
    const asset = assetsById.get(assetId);
    return asset ? asset.url : "";
  };

  // as fotos originais têm cerca de 1 MB; no ar, o CDN de imagens do Netlify entrega versões reduzidas
  function imageUrl(bucket, path) {
    const original = sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    if (["localhost", "127.0.0.1"].includes(location.hostname) || path.endsWith(".svg")) return original;
    return `/.netlify/images?url=${encodeURIComponent(original)}&w=${IMAGE_WIDTHS[bucket]}&q=75`;
  }

  function loadImages() {
    if (imagesLoading) return imagesLoading;
    imagesLoading = Promise.all([
      selectAll("media", "id,kind,owner_id,bucket,storage_path,legacy_asset_id,ai_generated,uploaded_at", "id", (query) => query.eq("is_current", true)),
      selectAll("brands", "id,name", "id"),
    ]).then(([media, brands]) => {
      media.forEach((item) => assetsById.set(item.legacy_asset_id, { ...item, url: imageUrl(item.bucket, item.storage_path) }));
      return {
        media,
        slugByBrandId: new Map(brands.map((brand) => [brand.id, brandSlug(brand.name)])),
        brandIdBySlug: new Map(brands.map((brand) => [brandSlug(brand.name), brand.id])),
      };
    });
    imagesLoading.catch(() => { imagesLoading = null; });
    return imagesLoading;
  }

  const imageData = (item) => ({ asset: item.legacy_asset_id, at: Date.parse(item.uploaded_at) || 0, ai: item.ai_generated });

  async function readPhotos() {
    const { media } = await loadImages();
    return media.filter((item) => item.kind === "model_photo").map((item) => docOf(item.owner_id, imageData(item)));
  }

  async function readLogos() {
    const { media, slugByBrandId } = await loadImages();
    return media.filter((item) => item.kind === "brand_logo" && slugByBrandId.has(item.owner_id))
      .map((item) => docOf(slugByBrandId.get(item.owner_id), imageData(item)));
  }

  async function imageOwner(collectionName, docId) {
    if (collectionName === "photos") return docId;
    const owner = (await loadImages()).brandIdBySlug.get(docId);
    if (!owner) throw new Error(`Marca não encontrada: ${docId}`);
    return owner;
  }

  // o arquivo só sobe aqui, quando já se sabe de que carro ou marca ele é
  async function saveImage(collectionName, docId, data) {
    const config = IMAGE_KINDS[collectionName];
    const file = pendingUploads.get(data.asset);
    if (!file) throw new Error("Arquivo da imagem não encontrado.");
    const owner = await imageOwner(collectionName, docId);
    const path = `${owner}-${data.asset.slice(0, 8)}.${EXTENSIONS[file.type] || "png"}`;
    await run(sb.storage.from(config.bucket).upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false }));
    await run(sb.from("media").update({ is_current: false }).match({ kind: config.kind, owner_id: owner, is_current: true }));
    const media = await run(sb.from("media").insert({
      kind: config.kind,
      owner_id: owner,
      bucket: config.bucket,
      storage_path: path,
      mime_type: file.type,
      bytes: file.size,
      ai_generated: data.ai === true,
      is_current: true,
      legacy_asset_id: data.asset,
      uploaded_at: new Date(data.at || Date.now()).toISOString(),
    }).select("id").single());
    await run(sb.from(config.table).update({ [config.column]: media.id }).eq("id", owner));
    pendingUploads.delete(data.asset);
  }

  async function removeImage(collectionName, docId) {
    const config = IMAGE_KINDS[collectionName];
    const owner = await imageOwner(collectionName, docId);
    await run(sb.from("media").update({ is_current: false }).match({ kind: config.kind, owner_id: owner, is_current: true }));
    await run(sb.from(config.table).update({ [config.column]: null }).eq("id", owner));
  }

  const assetsApi = {
    async upload(file) {
      const id = randomAssetId();
      pendingUploads.set(id, file);
      return { id };
    },
    async delete(assetId) {
      const asset = assetsById.get(assetId);
      if (!asset) return;
      await run(sb.storage.from(asset.bucket).remove([asset.storage_path]));
      await run(sb.from("media").delete().eq("id", asset.id));
      assetsById.delete(assetId);
    },
  };

  // ---------- curtidas

  let myVotes = new Set();

  async function readVotes() {
    const [counts, people, mine] = await Promise.all([
      run(sb.rpc("vote_counts")),
      run(sb.rpc("vote_people")),
      currentUser ? run(sb.from("votes").select("version_id").eq("user_id", currentUser.id)) : [],
    ]);
    myVotes = new Set(mine.map((row) => row.version_id));
    return {
      counts: Object.fromEntries(counts.map((row) => [row.version_id, Number(row.votes)])),
      people: Number(people),
      mine: [...myVotes],
      metadata: SNAPSHOT_METADATA,
    };
  }

  async function saveVotes(cars) {
    const next = new Set(cars);
    const added = [...next].filter((id) => !myVotes.has(id));
    const removed = [...myVotes].filter((id) => !next.has(id));
    if (added.length) await run(sb.from("votes").insert(added.map((version_id) => ({ user_id: currentUser.id, version_id }))));
    if (removed.length) await run(sb.from("votes").delete().eq("user_id", currentUser.id).in("version_id", removed));
    myVotes = next;
  }

  // ---------- comentários

  // o site guarda os comentários por pessoa e regrava a lista inteira a cada mudança
  const commentIdsByUser = new Map();
  const commentRowIds = new Map(); // id criado no navegador -> id da linha no banco

  async function readComments() {
    const rows = await selectAll("comments", "id,user_id,legacy_user_id,model_id,version_id,body,created_at", "created_at", (query) => query.is("deleted_at", null));
    const itemsByUser = new Map();
    commentIdsByUser.clear();
    rows.forEach((row) => {
      const uid = row.user_id || row.legacy_user_id || "removido";
      if (!itemsByUser.has(uid)) {
        itemsByUser.set(uid, []);
        commentIdsByUser.set(uid, new Set());
      }
      itemsByUser.get(uid).push({ id: row.id, mid: row.model_id, ...(row.version_id ? { vid: row.version_id } : {}), text: row.body, ts: row.created_at });
      commentIdsByUser.get(uid).add(row.id);
    });
    return [...itemsByUser].map(([uid, items]) => docOf(uid, { items }));
  }

  async function saveComments(uid, items) {
    const known = commentIdsByUser.get(uid) || new Set();
    const resolved = items.map((item) => ({ ...item, rowId: commentRowIds.get(item.id) || item.id }));
    const kept = new Set(resolved.map((item) => item.rowId));
    const removed = [...known].filter((id) => !kept.has(id));
    for (const item of resolved.filter((candidate) => !known.has(candidate.rowId))) {
      const row = await run(sb.from("comments").insert({ user_id: uid, model_id: item.mid, version_id: item.vid || null, body: item.text }).select("id").single());
      commentRowIds.set(item.id, row.id);
      known.add(row.id);
    }
    if (removed.length) await run(sb.from("comments").delete().in("id", removed));
    removed.forEach((id) => known.delete(id));
    commentIdsByUser.set(uid, known);
  }

  // ---------- catálogo, notícias e alertas

  function catalogDocs(rows) {
    const byBrand = new Map();
    rows.forEach((row) => {
      if (!byBrand.has(row.brand_id)) byBrand.set(row.brand_id, { brand: row.brand, brand_id: row.brand_id, rows: [] });
      byBrand.get(row.brand_id).rows.push(row.catalog_row);
    });
    return [...byBrand.values()].map((doc) => docOf(doc.brand_id, doc));
  }

  const readCatalog = async (filter = (query) => query) => catalogDocs(
    await selectAll("versions", "brand_id,brand,catalog_row", "id", (query) => filter(query.not("catalog_row", "is", null))),
  );

  async function saveCatalog(brandId, doc) {
    const rows = doc.rows.map((row) => withoutUndefined({
      id: row.i,
      brand_id: doc.brand_id || brandId,
      brand: doc.brand,
      model_id: row.m,
      model: row.mn,
      version: row.v || "",
      catalog_row: row,
      new_since: dateOrNull(row.nv),
      updated_since: dateOrNull(row.up),
    }));
    if (rows.length) await run(sb.from("versions").upsert(rows, { onConflict: "id" }));
  }

  async function readItemsByModel(table, columns, toItem) {
    const rows = await selectAll(table, `model_id,${columns}`, "id");
    const byModel = new Map();
    rows.forEach((row) => {
      if (!byModel.has(row.model_id)) byModel.set(row.model_id, []);
      byModel.get(row.model_id).push(toItem(row));
    });
    return [...byModel].map(([modelId, items]) => docOf(modelId, { items }));
  }

  const readNews = () => readItemsByModel("news", "title,summary,source,url,date,extra", ({ model_id, extra, ...item }) => ({ ...item, ...extra }));
  const readAlerts = () => readItemsByModel("alerts", "kind,title,summary,affects,source,url,date", ({ model_id, ...item }) => item);

  // ---------- marcas, modelos e versões

  function versionRow(version) {
    const powertrain = version.powertrain || {};
    const price = version.price || {};
    const origin = version.origin || {};
    return withoutUndefined({
      id: version.id,
      brand_id: version.brand_id,
      model_id: version.model_id,
      brand: version.brand,
      model: version.model,
      version: version.version || "",
      display_name: version.display_name,
      model_year: version.model_year,
      status: version.status || "on_sale",
      body: version.body,
      price: price.value,
      price_kind: price.kind,
      price_ref_month: price.ref_month,
      price_promo: price.promo,
      price_validity: price.validity,
      price_source_id: price.source_id,
      engine_desc: powertrain.engine_desc,
      fuel: powertrain.fuel,
      fuel_raw: powertrain.fuel_raw,
      propulsion: powertrain.propulsion,
      power_cv: powertrain.power_cv,
      power_cv_status: powertrain.power_cv_status,
      torque_kgfm: powertrain.torque_kgfm,
      displacement_l: powertrain.displacement_l,
      transmission: powertrain.transmission,
      transmission_raw: powertrain.transmission_raw,
      drive: powertrain.drive,
      turbo: powertrain.turbo,
      brand_country: origin.brand_country,
      manufactured_in: origin.manufactured_in,
      national: origin.national,
      highlights: version.highlights || [],
      specs: version.specs || {},
      quality: version.quality || {},
      notes: version.notes,
      source_ids: version.sources || [],
      image_refs: version.images || [],
      radar_item_id: version.radar,
      raw: version,
    });
  }

  async function saveVersion(id, doc) {
    const version = { ...doc, id };
    // o radar grava a versão antes do modelo e da marca, mas o banco exige que eles existam
    await run(sb.from("brands").upsert({ id: version.brand_id, name: version.brand || version.brand_id }, { onConflict: "id", ignoreDuplicates: true }));
    await run(sb.from("models").upsert({ id: version.model_id, brand_id: version.brand_id, name: version.model || version.model_id }, { onConflict: "id", ignoreDuplicates: true }));
    await run(sb.from("versions").upsert(versionRow(version), { onConflict: "id" }));
    const sourceIds = [...new Set(version.sources || [])];
    if (!sourceIds.length) return;
    const existing = await run(sb.from("sources").select("id").in("id", sourceIds));
    if (existing.length) {
      await run(sb.from("version_sources").upsert(existing.map((source) => ({ version_id: id, source_id: source.id })), { onConflict: "version_id,source_id", ignoreDuplicates: true }));
    }
  }

  const saveModel = (id, doc) => run(sb.from("models").upsert(withoutUndefined({
    id,
    brand_id: doc.brand_id,
    name: doc.name,
    body: doc.body,
    status: doc.status || "on_sale",
    price_min: doc.price_min,
    price_max: doc.price_max,
    raw: { ...doc, id },
  }), { onConflict: "id" }));

  const saveBrand = (id, doc) => run(sb.from("brands").upsert(withoutUndefined({
    id,
    name: doc.name,
    group_name: doc.group,
    country: doc.country,
    status: doc.status || "on_sale",
    raw: { ...doc, id },
  }), { onConflict: "id" }));

  // ---------- radar, configurações e registro de mudanças

  async function readRadar() {
    const rows = await selectAll("radar_items", `id,raw,${RADAR_COLUMNS.join(",")}`, "id");
    return rows.map(({ id, raw, status, ...applied }) => docOf(id, { ...raw, status, ...(applied.applied_at ? applied : {}) }));
  }

  async function updateRadarItem(id, patch) {
    const row = await run(sb.from("radar_items").select("raw").eq("id", id).single());
    const columns = Object.fromEntries(RADAR_COLUMNS.filter((column) => column in patch).map((column) => [column, patch[column]]));
    await run(sb.from("radar_items").update({ ...columns, raw: { ...row.raw, ...patch } }).eq("id", id));
  }

  async function getMeta(key) {
    const row = await run(sb.from("site_meta").select("value").eq("key", key).maybeSingle());
    if (!row) return docOf(key, null);
    return docOf(key, key === "brand_sites" ? { sites: row.value } : row.value);
  }

  const saveChangeLog = (data) => run(sb.from("change_log").insert(withoutUndefined({
    at: data.at,
    actor: data.by,
    radar_item_id: data.item,
    model_id: data.model,
    payload: data,
  })));

  // ---------- coleções

  const SNAPSHOT_READERS = {
    catalog: readCatalog,
    news: readNews,
    alerts: readAlerts,
    comments: readComments,
    photos: readPhotos,
    logos: readLogos,
    radar: readRadar,
  };

  async function readSnapshot(name) {
    if (name === "votes") return readVotes();
    if (SNAPSHOT_READERS[name]) return snapshotOf(await SNAPSHOT_READERS[name]());
    if (RAW_TABLES.has(name)) {
      const rows = await selectAll(name, "id,raw", "id");
      return snapshotOf(rows.map((row) => docOf(row.id, row.raw)));
    }
    throw new Error(`Coleção sem leitura: ${name}`);
  }

  async function getDocument(name, id) {
    if (RAW_TABLES.has(name)) {
      const row = await run(sb.from(name).select("raw").eq("id", id).maybeSingle());
      return docOf(id, row ? row.raw : null);
    }
    if (name === "meta") return getMeta(id);
    if (name === "catalog") {
      const [doc] = await readCatalog((query) => query.eq("brand_id", id));
      return doc || docOf(id, null);
    }
    throw new Error(`Coleção sem leitura de documento: ${name}`);
  }

  const WRITERS = {
    votes: (id, data) => saveVotes(data.cars),
    comments: (id, data) => saveComments(id, data.items),
    photos: (id, data) => saveImage("photos", id, data),
    logos: (id, data) => saveImage("logos", id, data),
    meta: (id, data) => run(sb.from("site_meta").upsert({ key: id, value: data }, { onConflict: "key" })),
    versions: saveVersion,
    models: saveModel,
    brands: saveBrand,
    catalog: saveCatalog,
    change_log: (id, data) => saveChangeLog(data),
  };

  const subscribers = new Map();

  async function refresh(name) {
    const list = subscribers.get(name);
    if (!list || !list.length) return;
    try {
      const snapshot = await readSnapshot(name);
      list.forEach((subscriber) => subscriber.next(snapshot));
    } catch (error) {
      list.forEach((subscriber) => subscriber.error && subscriber.error(error));
    }
  }

  function afterWrite(name) {
    if (IMAGE_KINDS[name]) imagesLoading = null;
    // a curtida já aparece na hora na tela; a recontagem vem na próxima atualização
    if (name !== "votes") refresh(name);
  }

  function collection(name) {
    return {
      onSnapshot(next, error) {
        if (!subscribers.has(name)) subscribers.set(name, []);
        const subscriber = { next, error };
        subscribers.get(name).push(subscriber);
        readSnapshot(name).then(next, (failure) => error && error(failure));
        return () => subscribers.set(name, subscribers.get(name).filter((item) => item !== subscriber));
      },
      doc(id) {
        return {
          get: () => getDocument(name, id),
          async set(data) {
            if (!WRITERS[name]) throw new Error(`Coleção sem gravação: ${name}`);
            await WRITERS[name](id, data);
            afterWrite(name);
          },
          async update(patch) {
            if (name !== "radar") throw new Error(`Coleção sem atualização: ${name}`);
            await updateRadarItem(id, patch);
            afterWrite(name);
          },
          async delete() {
            if (!IMAGE_KINDS[name]) throw new Error(`Coleção sem exclusão: ${name}`);
            await removeImage(name, id);
            afterWrite(name);
          },
        };
      },
    };
  }

  setInterval(() => {
    if (document.visibilityState !== "visible") return;
    refresh("votes");
    refresh("comments");
  }, REFRESH_MS);

  window.claude = {
    async use(name) {
      await ready;
      if (name === "db") return { collection };
      if (name === "user") return userApi;
      if (name === "assets") return isAdmin ? assetsApi : null;
      return null;
    },
  };
})();
