-- =============================================================================
-- Three additions trainers now log:
--   1. per-client retention status (active / at-risk / lost)
--   2. new clients brought in this week
--   3. a weekly action checklist
-- No new RLS policies needed — the existing clients/weekly_stats update+insert
-- policies are row-level, so trainers can already write these columns on their
-- own rows. Run AFTER 0003.
-- =============================================================================

alter table clients
  add column if not exists retention text not null default 'active'
  check (retention in ('active', 'at_risk', 'lost'));

alter table weekly_stats
  add column if not exists new_clients int not null default 0;

alter table weekly_stats
  add column if not exists checklist jsonb not null default '{}'::jsonb;
