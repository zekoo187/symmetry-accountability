-- =============================================================================
-- Let trainers build their own client roster, and clear the sample clients.
-- Run AFTER 0001_init.sql.
-- =============================================================================

-- Trainers may add / rename / remove clients on their own roster (owner: any).
create policy clients_insert on clients for insert to authenticated
  with check (is_owner() or trainer_id = auth_trainer_id());

create policy clients_update on clients for update to authenticated
  using (is_owner() or trainer_id = auth_trainer_id())
  with check (is_owner() or trainer_id = auth_trainer_id());

create policy clients_delete on clients for delete to authenticated
  using (is_owner() or trainer_id = auth_trainer_id());

-- A newly added client has no check-in row yet, so the first toggle INSERTs one.
create policy checkins_insert on checkins for insert to authenticated
  with check (
    is_owner()
    or exists (
      select 1 from clients c
      where c.id = checkins.client_id and c.trainer_id = auth_trainer_id()
    )
  );

-- Remove the sample clients; their check-in rows cascade away with them.
delete from clients;
