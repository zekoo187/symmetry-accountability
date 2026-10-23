-- =============================================================================
-- Session cards: the per-session record a coach fills at the end of every
-- session (the paper card, typed in). Owners see every card; a trainer sees
-- and writes only their own. Card photos live in a private storage bucket
-- under <trainer_id>/<card_id>.jpg. Run AFTER 0004.
-- =============================================================================

create table if not exists session_cards (
  id           uuid primary key default gen_random_uuid(),
  trainer_id   text not null references trainers (id) on delete cascade,
  client_id    uuid not null references clients (id) on delete cascade,
  session_date date not null,
  outcome      text not null default 'completed'
               check (outcome in ('completed', 'no_show', 'cancelled')),
  -- start of session
  on_time      boolean,
  readiness    int check (readiness between 1 and 5),
  bodyweight   numeric(6, 1),
  sleep_h      numeric(4, 1),
  pain         text not null default 'none' check (pain in ('none', 'modified', 'flag')),
  pain_where   text not null default '',
  -- habits since last session
  days_since   int check (days_since between 0 and 31),
  home_days    int check (home_days between 0 and 31),
  habits       jsonb not null default '{}'::jsonb,   -- {"calories": 2, "protein": 1, ...} days hit
  weekly       jsonb not null default '{}'::jsonb,   -- {"eating_out": true, "alcohol": true, "cardio": false}
  -- the work
  exercises    text not null default '',             -- one line each: "Back squat 5x5 185 lb"
  rpe          int check (rpe between 1 and 10),
  grade        text check (grade in ('low', 'medium', 'high', 'mastered')),
  win          text not null default '',
  next_booked  boolean,
  next_date    date,
  -- evidence and notes
  photo_path   text,                                 -- storage object path in bucket "cards"
  notes        text not null default '',
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists session_cards_trainer_date on session_cards (trainer_id, session_date desc);
create index if not exists session_cards_client_date on session_cards (client_id, session_date desc);

create or replace function session_cards_touch() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists session_cards_touch on session_cards;
create trigger session_cards_touch before update on session_cards
  for each row execute function session_cards_touch();

alter table session_cards enable row level security;

drop policy if exists session_cards_select on session_cards;
drop policy if exists session_cards_insert on session_cards;
drop policy if exists session_cards_update on session_cards;
drop policy if exists session_cards_delete on session_cards;

create policy session_cards_select on session_cards for select to authenticated
  using (is_owner() or trainer_id = auth_trainer_id());

create policy session_cards_insert on session_cards for insert to authenticated
  with check (
    (is_owner() or trainer_id = auth_trainer_id())
    and exists (select 1 from clients c where c.id = session_cards.client_id and c.trainer_id = session_cards.trainer_id)
  );

create policy session_cards_update on session_cards for update to authenticated
  using (is_owner() or trainer_id = auth_trainer_id())
  with check (is_owner() or trainer_id = auth_trainer_id());

create policy session_cards_delete on session_cards for delete to authenticated
  using (is_owner() or trainer_id = auth_trainer_id());

-- ---- card photos: private bucket, one folder per trainer ---------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cards', 'cards', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists cards_photos_select on storage.objects;
drop policy if exists cards_photos_insert on storage.objects;
drop policy if exists cards_photos_update on storage.objects;
drop policy if exists cards_photos_delete on storage.objects;

create policy cards_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'cards' and (is_owner() or (storage.foldername(name))[1] = auth_trainer_id()));

create policy cards_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'cards' and (is_owner() or (storage.foldername(name))[1] = auth_trainer_id()));

create policy cards_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'cards' and (is_owner() or (storage.foldername(name))[1] = auth_trainer_id()));

create policy cards_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cards' and (is_owner() or (storage.foldername(name))[1] = auth_trainer_id()));
