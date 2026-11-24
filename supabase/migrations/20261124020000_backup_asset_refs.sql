-- Each backup lists the content-named cover/text objects it refers to
-- ({user_id}/assets/{sha256}.json.gz), so objects no kept backup uses can be
-- pruned. Older rows default to an empty list.
alter table public.backups
  add column if not exists asset_refs text[] not null default '{}';
