-- Identity verification: the pending submission and the durable identity anchor.

-- ----------------------------------------------------------- voter_identity --
-- Written only on approval, after the card image is gone. This is where the
-- one-person-one-account guarantee actually lives.

create table voter_identity (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null unique references profiles (id) on delete cascade,
  member_type     member_type not null,
  urn_normalized  text,          -- students: 'MANATA40883'
  staff_username  text,          -- staff:    'dr_aung_aung_ceit'
  department_code text references departments (code),
  reviewed_by     uuid not null references profiles (id),
  reviewed_at     timestamptz not null default now(),

  constraint identity_shape check (
    (
      member_type = 'STUDENT'
      and urn_normalized is not null
      and staff_username is null
    )
    or (
      member_type = 'STAFF'
      and staff_username is not null
      and department_code is not null
      and urn_normalized is null
    )
  ),

  -- Re-check the normalised shapes at the storage layer; zod and the review RPC
  -- check them too, but this is the one that cannot be bypassed.
  constraint urn_normalized_shape check (
    urn_normalized is null or urn_normalized ~ '^MANATA[0-9]{5}$'
  ),
  constraint staff_username_shape check (
    staff_username is null or staff_username ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
  )
);

create unique index uq_urn on voter_identity (urn_normalized)
  where urn_normalized is not null;

create unique index uq_staff_username on voter_identity (staff_username)
  where staff_username is not null;

-- ------------------------------------------------- verification_submissions --

create table verification_submissions (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references profiles (id) on delete cascade,
  id_card_path     text,                                 -- storage path; nulled on decision
  status           voter_status not null default 'PENDING',
  rejection_reason text,                                 -- required when rejecting
  submitted_at     timestamptz not null default now(),
  decided_at       timestamptz,
  decided_by       uuid references profiles (id),

  constraint submission_status_shape check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  constraint decided_has_no_image check (status = 'PENDING' or id_card_path is null),
  constraint rejected_has_reason check (
    status <> 'REJECTED' or nullif(trim(rejection_reason), '') is not null
  )
);

-- At most one open submission per person.
create unique index uq_one_pending_submission
  on verification_submissions (profile_id)
  where status = 'PENDING';

create index verification_submissions_pending_idx
  on verification_submissions (submitted_at)
  where status = 'PENDING';

-- ---------------------------------------------------------------------- RLS --

alter table voter_identity enable row level security;
alter table verification_submissions enable row level security;

-- No write grants anywhere: `decide_review()` and `submit_verification()` are
-- the only writers (invariant 3).
revoke all on voter_identity, verification_submissions from anon, authenticated;
grant select on voter_identity, verification_submissions to authenticated;

create policy voter_identity_select_own on voter_identity
  for select to authenticated
  using (profile_id = auth.uid());

create policy voter_identity_select_staff on voter_identity
  for select to authenticated
  using (is_reviewer() or is_admin());

create policy submissions_select_own on verification_submissions
  for select to authenticated
  using (profile_id = auth.uid());

-- Invariant 6: the card image pointer is visible to Reviewers, and only while
-- the submission is PENDING. After a decision `id_card_path` is null anyway.
create policy submissions_select_pending_for_reviewer on verification_submissions
  for select to authenticated
  using (is_reviewer() and status = 'PENDING');
