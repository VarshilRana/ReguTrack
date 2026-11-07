revoke all on table public.profiles from public, anon;
grant select, insert, update on table public.profiles to authenticated;

revoke all on table public.user_roles from public, anon, authenticated;
grant select on table public.user_roles to authenticated;
