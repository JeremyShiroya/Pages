-- Cloud backups for Pages accounts.
--
-- Layout in the private `backups` bucket (one folder per user, enforced by
-- the storage policies below):
--   {user_id}/snapshots/{backup_id}.json.gz   library + settings snapshot
--   {user_id}/content/{book_id}.json.gz       one book's extracted content
--                                             (only when "Include book files" is on)
--
-- Everything is gzip-compressed on the device before upload and decompressed
-- on the device after download. The server only ever stores opaque bytes.

create table if not exists public.backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  snapshot_path text not null,
  format_version integer not null default 1,
  -- Integrity: SHA-256 of the UNcompressed snapshot bytes. Restore recomputes
  -- it after decompression, so a corrupted or truncated download is rejected
  -- instead of half-restored.
  sha256 text not null,
  raw_bytes bigint not null check (raw_bytes >= 0),
  stored_bytes bigint not null check (stored_bytes >= 0),
  content_bytes bigint not null default 0 check (content_bytes >= 0),
  book_count integer not null default 0,
  annotation_count integer not null default 0,
  includes_content boolean not null default false,
  device_label text,
  app_version text
);

create index if not exists backups_user_created_idx
  on public.backups (user_id, created_at desc);

alter table public.backups enable row level security;

drop policy if exists "Users read their own backups" on public.backups;
create policy "Users read their own backups" on public.backups
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users create their own backups" on public.backups;
create policy "Users create their own backups" on public.backups
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own backups" on public.backups;
create policy "Users delete their own backups" on public.backups
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Private bucket. 50 MB per object is far above any single snapshot or book.
insert into storage.buckets (id, name, public, file_size_limit)
values ('backups', 'backups', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "Backup owners read" on storage.objects;
create policy "Backup owners read" on storage.objects
  for select to authenticated
  using (bucket_id = 'backups' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Backup owners write" on storage.objects;
create policy "Backup owners write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'backups' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Backup owners update" on storage.objects;
create policy "Backup owners update" on storage.objects
  for update to authenticated
  using (bucket_id = 'backups' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Backup owners delete" on storage.objects;
create policy "Backup owners delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'backups' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- In-app account deletion (required by Google Play for apps with accounts).
-- The client removes its storage objects through the Storage API first; this
-- then deletes the auth user, which cascades to public.backups.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
