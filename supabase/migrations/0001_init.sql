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
