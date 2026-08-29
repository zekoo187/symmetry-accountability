-- =============================================================================
-- ONE-OFF: remove departed trainers Ivan (IV) and Simona (SM) from the LIVE DB.
-- They left Symmetry. Paste this WHOLE block into the Supabase SQL Editor → Run.
-- Safe: wrapped in a transaction; deleting the trainer row cascades to their
-- clients, check-ins, weekly stats, and nudges automatically.
-- Run order matters: delete their login accounts FIRST (while we can still find
-- them via profiles.trainer_id), THEN delete the trainer rows.
-- =============================================================================

begin;

-- 1) Delete their login accounts. profiles.id -> auth.users(id) ON DELETE CASCADE,
--    so their profiles rows go with them.
delete from auth.users
where id in (select id from profiles where trainer_id in ('IV', 'SM'));

-- 2) Delete the two trainer roster rows.
--    clients / weekly_stats / nudges all reference trainers(id) ON DELETE CASCADE,
--    and checkins reference clients ON DELETE CASCADE — so all their data clears.
delete from trainers where id in ('IV', 'SM');

-- 3) Remove the one legacy "wins" row that names Simona (the wins table is unused
--    by the app now, but tidy it anyway).
delete from wins where text ilike '%Simona%';

commit;

-- ---- verify (optional): all three should return 0 rows ----------------------
-- select * from trainers where id in ('IV','SM');
-- select * from profiles where trainer_id in ('IV','SM');
-- select * from clients  where trainer_id in ('IV','SM');
