-- =============================================================================
-- Make the dashboard's numbers real:
--   1. weeks roll forward automatically by real date (no more 3 fixed weeks)
--   2. trainers can save their own weekly numbers
--   3. the seeded fake sessions / show rates / wins are cleared out
-- Run AFTER 0002_client_management.sql.
-- =============================================================================

-- ---- 1. trainers may report their own week ---------------------------------
create policy weekly_stats_insert on weekly_stats for insert to authenticated
  with check (is_owner() or trainer_id = auth_trainer_id());

create policy weekly_stats_update on weekly_stats for update to authenticated
  using (is_owner() or trainer_id = auth_trainer_id())
  with check (is_owner() or trainer_id = auth_trainer_id());

-- ---- 2. real, rolling weeks -------------------------------------------------
-- Wipe the three hardcoded sample weeks and everything hanging off them.
delete from weeks;

-- Generate Monday-start weeks for a wide window (2 years back → 3 years ahead).
-- The app only ever shows weeks whose start_date has already arrived, so the
-- current week is always index 0 and future rows stay hidden until they land.
insert into weeks (idx, start_date, label, short_label)
select
  row_number() over (order by wk.mon) - 1 as idx,
  wk.mon                                  as start_date,
  'Week of ' || to_char(wk.mon, 'Mon FMDD') || ' – ' || to_char(wk.sun, 'Mon FMDD') as label,
  case
    when to_char(wk.mon, 'Mon') = to_char(wk.sun, 'Mon')
      then to_char(wk.mon, 'Mon FMDD') || '–' || to_char(wk.sun, 'FMDD')
    else to_char(wk.mon, 'Mon FMDD') || '–' || to_char(wk.sun, 'Mon FMDD')
  end                                     as short_label
from (
  select d::date as mon, (d::date + 6) as sun
  from generate_series(
    date_trunc('week', now() - interval '2 years'),
    date_trunc('week', now() + interval '3 years'),
    interval '1 week'
  ) as d
) as wk
on conflict (idx) do nothing;

-- ---- 3. no fabricated numbers ----------------------------------------------
-- weekly_stats and wins referenced the deleted sample weeks, so they're already
-- gone via cascade. This is belt-and-braces in case anything survived.
delete from weekly_stats;
delete from wins;

-- Sanity check: how many weeks exist, and which one is "current"?
-- select count(*) from weeks;
-- select label from weeks where start_date <= current_date order by start_date desc limit 1;
