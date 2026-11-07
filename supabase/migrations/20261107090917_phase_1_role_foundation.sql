create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'regulatory_affairs', 'reviewer')),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.user_roles enable row level security;

drop policy if exists "Users can read their own roles" on public.user_roles;
create policy "Users can read their own roles"
on public.user_roles for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;
