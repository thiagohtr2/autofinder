revoke execute on function public.my_role() from public, anon;
grant execute on function public.my_role() to authenticated;
revoke execute on function public.track_price_change() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
