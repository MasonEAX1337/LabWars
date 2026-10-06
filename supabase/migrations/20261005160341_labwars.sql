-- Install only in a dedicated Lab Wars project. No existing app tables are used.
create table public.labwars_rooms (
  code text primary key check (code ~ '^[A-Z2-9]{6}$'),
  revision bigint not null default 0,
  state jsonb not null,
  created_at timestamptz not null default now()
);
create table public.labwars_memberships (
  code text references public.labwars_rooms(code) on delete cascade,
  user_id uuid not null,
  primary key (code, user_id)
);
create index labwars_memberships_user on public.labwars_memberships(user_id, code);
create table public.labwars_room_signals (
  code text primary key references public.labwars_rooms(code) on delete cascade,
  revision bigint not null default 0
);
alter table public.labwars_rooms enable row level security;
alter table public.labwars_memberships enable row level security;
alter table public.labwars_room_signals enable row level security;
revoke all on public.labwars_rooms, public.labwars_memberships, public.labwars_room_signals from anon, authenticated;
grant all on public.labwars_rooms, public.labwars_memberships, public.labwars_room_signals to service_role;
grant select on public.labwars_memberships, public.labwars_room_signals to authenticated;
create policy own_memberships on public.labwars_memberships for select to authenticated using (user_id = (select auth.uid()));
create policy member_signals on public.labwars_room_signals for select to authenticated using (code in (select code from public.labwars_memberships where user_id = (select auth.uid())));

-- Service-only invoker RPCs: state + membership + signal updates are atomic.
create function public.labwars_create(p_code text, p_state jsonb) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.labwars_rooms(code, state) values(p_code, p_state) on conflict do nothing;
  if not found then return false; end if;
  insert into public.labwars_memberships(code, user_id)
    select p_code, (p->>'id')::uuid from jsonb_array_elements(p_state->'players') p where coalesce((p->>'bot')::boolean, false) = false;
  insert into public.labwars_room_signals(code) values(p_code);
  return true;
end; $$;
create function public.labwars_commit(p_code text, p_expected bigint, p_state jsonb) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  if (p_state->>'revision')::bigint <> p_expected + 1 then raise exception 'Invalid revision'; end if;
  update public.labwars_rooms set state = p_state, revision = p_expected + 1 where code = p_code and revision = p_expected;
  if not found then return false; end if;
  insert into public.labwars_memberships(code, user_id)
    select p_code, (p->>'id')::uuid from jsonb_array_elements(p_state->'players') p where coalesce((p->>'bot')::boolean, false) = false on conflict do nothing;
  update public.labwars_room_signals set revision = p_expected + 1 where code = p_code;
  return true;
end; $$;
revoke all on function public.labwars_create(text,jsonb), public.labwars_commit(text,bigint,jsonb) from public, anon, authenticated;
grant execute on function public.labwars_create(text,jsonb), public.labwars_commit(text,bigint,jsonb) to service_role;
alter publication supabase_realtime add table public.labwars_room_signals;

-- Maintenance: periodically delete rooms older than 48h. Cascades remove signals and memberships.
-- delete from public.labwars_rooms where created_at < now() - interval '48 hours';
