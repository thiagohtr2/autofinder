-- Agenda a função "avisos-preco" de hora em hora (minuto 17), pelo pg_cron + pg_net.
-- A chave usada é a pública do site (a mesma de public/supabase-adapter.js): a função só manda o que está na fila
-- e nunca repete um aviso, então chamá-la de novo não causa envio duplicado.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
select cron.schedule('avisos-preco', '17 * * * *', $cron$
  select net.http_post(
    url := 'https://ljgcvxadsekaicffztbi.supabase.co/functions/v1/avisos-preco',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2N2eGFkc2VrYWljZmZ6dGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3OTYyNjMsImV4cCI6MjEwOTM3MjI2M30._lZd1-cALOXrnR3nI0rwwWkfIAXYZ_qmVHJ7s3Ka2BM', 'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2N2eGFkc2VrYWljZmZ6dGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3OTYyNjMsImV4cCI6MjEwOTM3MjI2M30._lZd1-cALOXrnR3nI0rwwWkfIAXYZ_qmVHJ7s3Ka2BM'),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$cron$);
