-- =============================================================
-- Symmetry Fitness — one-shot setup (schema + RLS + seed data)
-- Paste this whole file into the Supabase SQL Editor and Run.
-- =============================================================

-- =============================================================================
-- Symmetry Fitness — Accountability dashboard schema
-- Owner sees every trainer; a trainer sees only their own clients & stats.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---- profiles: one row per auth user, carries role + trainer mapping --------
create table if not exists profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         text not null default 'trainer' check (role in ('owner', 'trainer')),
  trainer_id   text,                         -- non-null for trainers (FK added below)
  display_name text not null default '',
  email        text not null default '',
  created_at   timestamptz not null default now()
);

-- ---- trainers (stable roster) ----------------------------------------------
create table if not exists trainers (
  id           text primary key,             -- 'PA', 'RO', ...
  name         text not null,
  initials     text not null,
  discipline   text not null,                -- 'Strength', 'HIIT', ...
  avatar_color text not null
);

alter table profiles
  add constraint profiles_trainer_fk
  foreign key (trainer_id) references trainers (id) on delete set null;

-- ---- clients ---------------------------------------------------------------
create table if not exists clients (
  id         uuid primary key default gen_random_uuid(),
  trainer_id text not null references trainers (id) on delete cascade,
  name       text not null,
  unique (trainer_id, name)
);

-- ---- weeks (shared metadata; idx 0 = most recent) --------------------------
create table if not exists weeks (
  id          uuid primary key default gen_random_uuid(),
  idx         int not null unique,
  label       text not null,                 -- 'Week of Jul 6 – Jul 12'
  short_label text not null,                 -- 'Jul 6–12'
  start_date  date
);

-- ---- weekly_stats (one row per trainer per week) ---------------------------
create table if not exists weekly_stats (
  id               uuid primary key default gen_random_uuid(),
  trainer_id       text not null references trainers (id) on delete cascade,
  week_id          uuid not null references weeks (id) on delete cascade,
  sessions         int not null default 0,
  scheduled        int not null default 0,
  showed           int not null default 0,
  no_shows         int not null default 0,
  cancels          int not null default 0,
  next_week_booked int not null default 0,
  status           text not null default 'track' check (status in ('track', 'risk', 'behind')),
  sparkline_points text not null default '',
  note             text not null default '',
  unique (trainer_id, week_id)
);

-- ---- checkins (per client per week) ----------------------------------------
create table if not exists checkins (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references clients (id) on delete cascade,
  week_id        uuid not null references weeks (id) on delete cascade,
  hydration_done boolean not null default false,
  weighin_done   boolean not null default false,
  win_text       text,
  unique (client_id, week_id)
);

-- ---- wins (celebrated highlights per week) ---------------------------------
create table if not exists wins (
  id       uuid primary key default gen_random_uuid(),
  week_id  uuid not null references weeks (id) on delete cascade,
  position int not null default 0,
  stat     text not null,
  text     text not null
);

-- ---- nudges (reminder log) -------------------------------------------------
create table if not exists nudges (
  id         uuid primary key default gen_random_uuid(),
  trainer_id text not null references trainers (id) on delete cascade,
  week_id    uuid not null references weeks (id) on delete cascade,
  sent_at    timestamptz not null default now(),
  unique (trainer_id, week_id)
);

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- SECURITY DEFINER helpers avoid recursive policy evaluation on `profiles`.
create or replace function auth_role() returns text
  language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function auth_trainer_id() returns text
  language sql stable security definer set search_path = public as $$
  select trainer_id from profiles where id = auth.uid()
$$;

create or replace function is_owner() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() = 'owner', false)
$$;

alter table profiles     enable row level security;
alter table trainers     enable row level security;
alter table clients      enable row level security;
alter table weeks        enable row level security;
alter table weekly_stats enable row level security;
alter table checkins     enable row level security;
alter table wins         enable row level security;
alter table nudges       enable row level security;

-- profiles: read your own row; owners read all.
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or is_owner());

-- trainers: owners all; a trainer sees their own trainer record.
create policy trainers_select on trainers for select to authenticated
  using (is_owner() or id = auth_trainer_id());

-- clients: owners all; trainer sees own clients.
create policy clients_select on clients for select to authenticated
  using (is_owner() or trainer_id = auth_trainer_id());

-- weeks + wins: shared reference data, readable by any signed-in user.
create policy weeks_select on weeks for select to authenticated using (true);
create policy wins_select  on wins  for select to authenticated using (true);

-- weekly_stats: owners all; trainer sees own.
create policy weekly_stats_select on weekly_stats for select to authenticated
  using (is_owner() or trainer_id = auth_trainer_id());

-- checkins: owners all; trainer sees + edits their own clients' check-ins.
create policy checkins_select on checkins for select to authenticated
  using (
    is_owner()
    or exists (
      select 1 from clients c
      where c.id = checkins.client_id and c.trainer_id = auth_trainer_id()
    )
  );

create policy checkins_update on checkins for update to authenticated
  using (
    is_owner()
    or exists (
      select 1 from clients c
      where c.id = checkins.client_id and c.trainer_id = auth_trainer_id()
    )
  )
  with check (
    is_owner()
    or exists (
      select 1 from clients c
      where c.id = checkins.client_id and c.trainer_id = auth_trainer_id()
    )
  );

-- nudges: owners see + create all; trainers can see their own reminders.
create policy nudges_select on nudges for select to authenticated
  using (is_owner() or trainer_id = auth_trainer_id());

create policy nudges_insert on nudges for insert to authenticated
  with check (is_owner());


-- =============================================================================
-- Seed data — mirrors src/data/seed.ts so the DB starts identical to demo mode.
-- Safe to re-run: inserts are guarded with ON CONFLICT DO NOTHING.
-- Run AFTER 0001_init.sql. Does NOT create auth users — see README for that.
-- =============================================================================

-- ---- trainers --------------------------------------------------------------
insert into trainers (id, name, initials, discipline, avatar_color) values
  ('PA','Paola','PA','Strength','#4C6EF5'),
  ('RO','Roma','RO','HIIT','#E2603A'),
  ('NA','Natalia','NA','Mobility','#C98A16'),
  ('SA','Santiago','SA','Strength','#2E7D5B'),
  ('IV','Ivan','IV','Boxing','#B0574A'),
  ('SM','Simona','SM','Pilates','#9A6DB8')
on conflict (id) do nothing;

-- ---- weeks (idx 0 = most recent) -------------------------------------------
insert into weeks (idx, label, short_label, start_date) values
  (0,'Week of Jul 6 – Jul 12','Jul 6–12','2026-07-06'),
  (1,'Week of Jun 29 – Jul 5','Jun 29–Jul 5','2026-06-29'),
  (2,'Week of Jun 22 – Jun 28','Jun 22–28','2026-06-22')
on conflict (idx) do nothing;

-- ---- clients (distinct roster per trainer) ---------------------------------
insert into clients (trainer_id, name) values
  ('PA','Mia R.'),('PA','Tom B.'),('PA','Dana K.'),
  ('RO','Kim S.'),('RO','Val D.'),('RO','Otis P.'),
  ('NA','Leo P.'),('NA','Sara M.'),('NA','Nia F.'),
  ('SA','Ana G.'),('SA','Ben H.'),('SA','Ced L.'),
  ('IV','Jay T.'),('IV','Ella V.'),('IV','Rob C.'),
  ('SM','Pia N.'),('SM','Gus A.'),('SM','Ivy R.')
on conflict (trainer_id, name) do nothing;

-- ---- weekly_stats ----------------------------------------------------------
insert into weekly_stats
  (trainer_id, week_id, sessions, scheduled, showed, no_shows, cancels, next_week_booked, status, sparkline_points, note)
select v.trainer_id, w.id, v.sessions, v.scheduled, v.showed, v.no_shows, v.cancels, v.next_week_booked, v.status, v.points, v.note
from (values
  -- week 0
  ('PA',0,22,24,22,0,2,24,'track','0,13 11,10 23,8 34,5 46,3','Every client hydrated and weighed in. Model week.'),
  ('RO',0,18,20,18,1,1,20,'track','0,11 11,10 23,9 34,7 46,6','Solid. Nudge Val on the weekly weigh-in.'),
  ('NA',0,12,18,12,4,2,15,'risk','0,7 11,8 23,9 34,11 46,13','Show rate dropped to 67% and most check-ins are missing. Check in with her.'),
  ('SA',0,25,26,25,0,1,26,'track','0,15 11,11 23,8 34,5 46,1','Top performer this week — fully booked ahead.'),
  ('IV',0,8,16,8,5,3,10,'behind','0,4 11,7 23,10 34,13 46,16','Half of sessions were no-shows or cancels and check-ins are stalled. Needs a reminder today.'),
  ('SM',0,20,21,20,1,0,21,'track','0,12 11,10 23,9 34,7 46,6','Consistent, clients all logging.'),
  -- week 1
  ('PA',1,20,22,20,1,1,24,'track','0,12 11,10 23,9 34,7 46,5','Strong.'),
  ('RO',1,17,18,17,1,0,20,'track','0,11 11,10 23,10 34,8 46,7','Clean week.'),
  ('NA',1,15,17,15,1,1,16,'track','0,10 11,9 23,9 34,8 46,7','Was steady — watch this week’s dip.'),
  ('SA',1,24,25,24,0,1,26,'track','0,13 11,10 23,8 34,5 46,3','Reliable.'),
  ('IV',1,12,15,12,2,1,14,'risk','0,8 11,8 23,9 34,10 46,11','Slipping — flag early.'),
  ('SM',1,19,20,19,1,0,21,'track','0,11 11,10 23,9 34,8 46,7','Great.'),
  -- week 2
  ('PA',2,18,20,18,1,1,22,'track','0,12 11,11 23,10 34,8 46,7','Ramping up.'),
  ('RO',2,16,17,16,1,0,18,'track','0,11 11,11 23,9 34,9 46,8','Good.'),
  ('NA',2,14,15,14,1,0,17,'track','0,10 11,10 23,9 34,9 46,8','Solid start.'),
  ('SA',2,22,23,22,0,1,25,'track','0,12 11,10 23,9 34,7 46,5','Ahead of plan.'),
  ('IV',2,13,14,13,1,0,15,'track','0,10 11,10 23,9 34,9 46,8','Doing fine here.'),
  ('SM',2,18,19,18,1,0,20,'track','0,11 11,10 23,9 34,9 46,8','Consistent.')
) as v(trainer_id, widx, sessions, scheduled, showed, no_shows, cancels, next_week_booked, status, points, note)
join weeks w on w.idx = v.widx
on conflict (trainer_id, week_id) do nothing;

-- ---- checkins --------------------------------------------------------------
insert into checkins (client_id, week_id, hydration_done, weighin_done, win_text)
select c.id, w.id, v.h, v.k, v.win
from (values
  -- week 0
  ('PA','Mia R.',0,true,true,null),('PA','Tom B.',0,true,true,'−2 lb'),('PA','Dana K.',0,true,true,null),
  ('RO','Kim S.',0,true,true,null),('RO','Val D.',0,true,false,null),('RO','Otis P.',0,true,true,null),
  ('NA','Leo P.',0,false,false,null),('NA','Sara M.',0,true,false,null),('NA','Nia F.',0,false,false,null),
  ('SA','Ana G.',0,true,true,'−4 lb'),('SA','Ben H.',0,true,true,null),('SA','Ced L.',0,true,true,null),
  ('IV','Jay T.',0,false,false,null),('IV','Ella V.',0,true,false,null),('IV','Rob C.',0,false,false,null),
  ('SM','Pia N.',0,true,true,null),('SM','Gus A.',0,true,true,'PR deadlift'),('SM','Ivy R.',0,true,true,null),
  -- week 1
  ('PA','Mia R.',1,true,true,null),('PA','Tom B.',1,true,true,null),('PA','Dana K.',1,true,false,null),
  ('RO','Kim S.',1,true,true,null),('RO','Val D.',1,true,true,null),('RO','Otis P.',1,true,true,null),
  ('NA','Leo P.',1,true,true,null),('NA','Sara M.',1,true,false,null),('NA','Nia F.',1,true,true,null),
  ('SA','Ana G.',1,true,true,null),('SA','Ben H.',1,true,true,null),('SA','Ced L.',1,true,true,null),
  ('IV','Jay T.',1,true,false,null),('IV','Ella V.',1,true,true,null),('IV','Rob C.',1,false,false,null),
  ('SM','Pia N.',1,true,true,null),('SM','Gus A.',1,true,true,'−3 lb'),('SM','Ivy R.',1,true,true,null),
  -- week 2
  ('PA','Mia R.',2,true,true,null),('PA','Tom B.',2,true,true,null),
  ('RO','Kim S.',2,true,true,null),('RO','Otis P.',2,true,true,null),
  ('NA','Leo P.',2,true,true,null),('NA','Nia F.',2,true,true,null),
  ('SA','Ana G.',2,true,true,null),('SA','Ben H.',2,true,true,null),
  ('IV','Ella V.',2,true,true,null),('IV','Rob C.',2,true,true,null),
  ('SM','Pia N.',2,true,true,null),('SM','Ivy R.',2,true,true,null)
) as v(trainer_id, cname, widx, h, k, win)
join clients c on c.trainer_id = v.trainer_id and c.name = v.cname
join weeks w on w.idx = v.widx
on conflict (client_id, week_id) do nothing;

-- ---- wins ------------------------------------------------------------------
insert into wins (week_id, position, stat, text)
select w.id, v.pos, v.stat, v.text
from (values
  (0,0,'−4 lb','Santiago’s client Ana hit a 4 lb loss 🎉'),
  (0,1,'100%','Paola: every client logged their weekly weigh-in'),
  (0,2,'26','Santiago fully booked for next week'),
  (1,0,'−3 lb','Simona’s client Gus down 3 lb before his meet'),
  (1,1,'92%','Team show rate up 6 points on last week'),
  (2,0,'✓','First week every trainer sent all daily check-ins')
) as v(widx, pos, stat, text)
join weeks w on w.idx = v.widx;
