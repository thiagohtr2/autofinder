# Carga inicial do Supabase (projeto autofinder)

Instruções para uma sessão do Claude com acesso a `*.supabase.co`, ao conector do Supabase e a este repositório.

1. Clonar este repositório (tem 139 MB de imagens em `media/`).
2. Testar a rede: `curl -sS -o /dev/null -w "%{http_code}" https://ljgcvxadsekaicffztbi.supabase.co/rest/v1/`. Se der 000/403, parar e avisar que `*.supabase.co` ainda não está liberado.
3. Gerar um token aleatório (`python3 -c "import secrets;print(secrets.token_urlsafe(32))"`), salvar em `/home/claude/.import_token` e gravar só o hash sha256 no banco com o conector do Supabase:
   `insert into public.import_tokens(token_sha256, note, expires_at) values ('<hash>', 'importação', now() + interval '3 hours');`
4. `python3 tools/supabase_import/build_payload.py data media/manifest.json /home/claude/payload`
5. `SUPABASE_URL=https://ljgcvxadsekaicffztbi.supabase.co SUPABASE_ANON_KEY=<chave anon do projeto> python3 tools/supabase_import/run_import.py /home/claude/payload media /home/claude/.import_token`
   (idempotente; se cair, rodar de novo; `ONLY=tabela` reenvia uma tabela só).
6. Conferir: brands 53, models 327, versions 831, sources 373, version_sources 831, media 230 (todas com `uploaded_at`), alerts 186, news 233, radar_runs 2, radar_items 14, site_meta 5, legacy_records 2086, storage `car-photos` 181 e `brand-logos` 49, modelos com foto 181, marcas com logo 49.
7. Apagar o token: `delete from public.import_tokens;` e o arquivo local.

Os dados privados (curtidas antigas, registro de mudanças e lotes de importação) já foram carregados direto no banco.
