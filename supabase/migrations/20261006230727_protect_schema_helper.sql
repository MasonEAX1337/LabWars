-- Supabase may install this DDL event-trigger helper in public. Direct API
-- callers do not need execution rights; its event trigger still runs as owner.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
