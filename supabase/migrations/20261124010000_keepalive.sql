-- Free-tier Supabase projects pause after ~7 days without activity, which
-- takes sign-in and cloud backup down with them. A scheduled GitHub Action
-- (.github/workflows/supabase-keepalive.yml) calls this every few days.
--
-- It records each ping so the call is a real database write, not just a
-- cached read, and keeps only the last 30 rows. Callable with the publishable
-- key; it exposes nothing but its own timestamps.

create table if not exists public.keepalive_pings (
  id bigint generated always as identity primary key,
  pinged_at timestamptz not null default now()
);

alter table public.keepalive_pings enable row level security;

create or replace function public.keepalive()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  stamp timestamptz;
begin
  insert into public.keepalive_pings default values returning pinged_at into stamp;
  delete from public.keepalive_pings
  where id < (select min(id) from (select id from public.keepalive_pings order by id desc limit 30) recent);
  return stamp;
end;
$$;

revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
