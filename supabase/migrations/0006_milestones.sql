-- =============================================================================
-- Due tracking: the two-week check-in and the week-8 re-test. A client has a
-- start date; check-ins fall every 14 days from the start (or from the last
-- one done), re-tests every 56 days. Nothing is pre-generated: the app works
-- out what is due from the start date and the milestones already recorded.
-- Run AFTER 0005.
-- =============================================================================

alter table clients add column if not exists started_on date;

create table if not exists client_milestones (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references clients (id) on delete cascade,
  trainer_id text not null references trainers (id) on delete cascade,
  kind       text not null check (kind in ('checkin', 'retest')),
  due_on     date,                                  -- what it was due when marked (for the record)
  done_on    date not null,
  note       text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists client_milestones_client on client_milestones (client_id, kind, done_on desc);

alter table client_milestones enable row level security;

drop policy if exists client_milestones_select on client_milestones;
drop policy if exists client_milestones_insert on client_milestones;
drop policy if exists client_milestones_delete on client_milestones;

create policy client_milestones_select on client_milestones for select to authenticated
  using (is_owner() or trainer_id = auth_trainer_id());

create policy client_milestones_insert on client_milestones for insert to authenticated
  with check (
    (is_owner() or trainer_id = auth_trainer_id())
    and exists (select 1 from clients c where c.id = client_milestones.client_id and c.trainer_id = client_milestones.trainer_id)
  );

create policy client_milestones_delete on client_milestones for delete to authenticated
  using (is_owner() or trainer_id = auth_trainer_id());
