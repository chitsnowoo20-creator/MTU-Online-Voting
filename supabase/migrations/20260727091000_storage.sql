-- Storage buckets and their policies.
--
--   id-cards         private, per-user path, Reviewer-read only, deleted on decision
--   candidate-photos public read (they appear on the ballot), Officer write

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('id-cards', 'id-cards', false, 5 * 1024 * 1024,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('candidate-photos', 'candidate-photos', true, 5 * 1024 * 1024,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ------------------------------------------------------------- id-cards --
-- Invariant 6: access never widens beyond Reviewer. The uploader gets INSERT
-- and nothing else — not even a read-back of their own card.

create policy id_cards_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'id-cards'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy id_cards_select_reviewer on storage.objects
  for select to authenticated
  using (bucket_id = 'id-cards' and is_reviewer());

create policy id_cards_delete_reviewer on storage.objects
  for delete to authenticated
  using (bucket_id = 'id-cards' and is_reviewer());

-- ------------------------------------------------------ candidate-photos --

create policy candidate_photos_select_public on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'candidate-photos');

create policy candidate_photos_write_officer on storage.objects
  for insert to authenticated
  with check (bucket_id = 'candidate-photos' and is_officer());

create policy candidate_photos_update_officer on storage.objects
  for update to authenticated
  using (bucket_id = 'candidate-photos' and is_officer())
  with check (bucket_id = 'candidate-photos' and is_officer());

create policy candidate_photos_delete_officer on storage.objects
  for delete to authenticated
  using (bucket_id = 'candidate-photos' and is_officer());
