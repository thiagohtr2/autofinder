// Importação única dos dados do giroauto. Exige JWT válido do projeto E um token temporário (hash em public.import_tokens).
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const UPSERT: Record<string, string | null> = {
  media: "id", brands: "id", models: "id", sources: "id", versions: "id",
  version_sources: "version_id,source_id", radar_runs: "id", radar_items: "id", site_meta: "key",
  import_jobs: "id", legacy_votes: "legacy_user_id,car_id", legacy_records: "collection,doc_id",
  alerts: null, news: null, change_log: null,
};
const BUCKETS = new Set(["car-photos", "brand-logos"]);

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const token = req.headers.get("x-import-token") || "";
  if (!token) return json({ error: "no token" }, 401);
  const { data: tok } = await sb.from("import_tokens").select("expires_at").eq("token_sha256", await sha256(token)).maybeSingle();
  if (!tok || new Date(tok.expires_at) < new Date()) return json({ error: "invalid token" }, 401);

  const body = await req.json();
  try {
    if (body.action === "upsert") {
      const t = String(body.table);
      if (!(t in UPSERT)) return json({ error: "table not allowed" }, 400);
      const rows = body.rows as Record<string, unknown>[];
      const q = UPSERT[t] ? sb.from(t).upsert(rows, { onConflict: UPSERT[t]! }) : sb.from(t).insert(rows);
      const { error } = await q;
      if (error) return json({ error: error.message, details: error.details }, 400);
      return json({ ok: true, n: rows.length });
    }
    if (body.action === "truncate") {
      const t = String(body.table);
      if (!["alerts", "news", "change_log"].includes(t)) return json({ error: "not allowed" }, 400);
      const { error } = await sb.from(t).delete().gte("id", 0);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }
    if (body.action === "link") {
      const t = String(body.table), col = String(body.column);
      if (!((t === "brands" && col === "logo_media_id") || (t === "models" && col === "photo_media_id"))) return json({ error: "not allowed" }, 400);
      for (const r of body.rows as { id: string; value: string }[]) {
        const { error } = await sb.from(t).update({ [col]: r.value }).eq("id", r.id);
        if (error) return json({ error: error.message, id: r.id }, 400);
      }
      return json({ ok: true, n: body.rows.length });
    }
    if (body.action === "upload") {
      if (!BUCKETS.has(body.bucket)) return json({ error: "bucket not allowed" }, 400);
      const bytes = Uint8Array.from(atob(body.base64), (c) => c.charCodeAt(0));
      const { error } = await sb.storage.from(body.bucket).upload(body.path, bytes, { contentType: body.contentType || "image/png", upsert: true });
      if (error) return json({ error: error.message }, 400);
      if (body.media_id) await sb.from("media").update({ uploaded_at: new Date().toISOString() }).eq("id", body.media_id);
      return json({ ok: true, bytes: bytes.length });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
