-- Identity core: profiles, departments, roles, role helpers.
--
-- Invariant 5: RLS is enabled on every table and every table gets explicit
-- policies. Invariant 3/4: privileged writes never get direct grants; the
-- default Supabase grants to `anon` / `authenticated` are revoked and only the
-- narrow column grants below are handed back.

-- ---------------------------------------------------------------- profiles --

create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text not null,
  member_type  member_type,                                  -- null until verified
  voter_status voter_status not null default 'UNVERIFIED',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index profiles_voter_status_idx on profiles (voter_status);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Supabase Auth owns email + password; this mirrors the row into our schema.
-- `full_name` comes from the sign-up metadata.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Unnamed user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------- departments --

create table departments (
  code   text primary key,          -- 'CE', 'CEIT', ...
  name   text not null,
  active boolean not null default true
);

-- ---------------------------------------------------------------- user_roles --

create table user_roles (
  profile_id uuid not null references profiles (id) on delete cascade,
  role       app_role not null,
  granted_by uuid references profiles (id),
  granted_at timestamptz not null default now(),
  primary key (profile_id, role)
);

-- SECURITY DEFINER so policies can call these without recursing into
-- user_roles' own RLS.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles where profile_id = auth.uid() and role = 'ADMIN'
  );
$$;

create or replace function is_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles where profile_id = auth.uid() and role = 'REVIEWER'
  );
$$;

create or replace function is_officer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from user_roles
    where profile_id = auth.uid() and role = 'ELECTION_OFFICER'
  );
$$;

create or replace function is_approved_voter()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and voter_status = 'APPROVED'
  );
$$;

grant execute on function is_admin(), is_reviewer(), is_officer(), is_approved_voter()
  to authenticated;

-- ---------------------------------------------------------------------- RLS --

alter table profiles enable row level security;
alter table departments enable row level security;
alter table user_roles enable row level security;

revoke all on profiles, departments, user_roles from anon, authenticated;

-- profiles: read your own row; reviewers see the pending queue; admins see all.
grant select on profiles to authenticated;
-- Column-level grant is what keeps `voter_status` / `member_type` out of the
-- user's hands — RLS cannot restrict per column (invariant 10).
grant update (full_name) on profiles to authenticated;

create policy profiles_select_own on profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_select_pending_for_reviewer on profiles
  for select to authenticated
  using (is_reviewer() and voter_status = 'PENDING');

create policy profiles_select_all_for_admin on profiles
  for select to authenticated
  using (is_admin());

create policy profiles_update_own on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- departments: readable by anyone (candidate cards on the public results page
-- show a department); writable only by admins.
grant select on departments to anon, authenticated;
grant insert, update, delete on departments to authenticated;

create policy departments_select_active on departments
  for select to anon, authenticated
  using (active or is_admin());

create policy departments_write_admin on departments
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- user_roles: read your own grants; admins manage everything.
grant select, insert, delete on user_roles to authenticated;

create policy user_roles_select_own on user_roles
  for select to authenticated
  using (profile_id = auth.uid());

create policy user_roles_select_admin on user_roles
  for select to authenticated
  using (is_admin());

create policy user_roles_write_admin on user_roles
  for all to authenticated
  using (is_admin())
  with check (is_admin() and granted_by = auth.uid());
