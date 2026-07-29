-- Seed data: the frozen department preset, plus notes for bootstrapping the
-- first Admin. Re-run safe (`supabase db reset` replays this).

insert into departments (code, name) values
  ('CE',   'Civil Engineering'),
  ('Arch', 'Architecture'),
  ('EP',   'Engineering Physics'),
  ('EC',   'Electronic Engineering'),
  ('CEIT', 'Computer Engineering & Information Technology'),
  ('ME',   'Mechanical Engineering'),
  -- TODO(maintainer): SCHEMA.md leaves 'NE' as '?'. Confirm the full name with
  -- the team before this reaches a screen — it is shown on candidate cards.
  ('NE',   'NE — full name to be confirmed'),
  ('BioT', 'Biotechnology'),
  ('ChE',  'Chemical Engineering'),
  ('MC',   'Mechatronic Engineering')
on conflict (code) do nothing;

-- ------------------------------------------------------- first Admin grant --
-- Roles are granted by an Admin, which leaves the first one to be seeded by
-- hand. Register the account through the app, confirm the email, then run this
-- against the database (SQL editor or psql — it needs to bypass RLS):
--
--   insert into user_roles (profile_id, role)
--   select u.id, 'ADMIN'
--   from auth.users u
--   where u.email = 'admin@example.edu'
--   on conflict do nothing;
--
-- The audit trigger records it with a null actor, i.e. "system" — which is
-- exactly what a bootstrap grant is.
