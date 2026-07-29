-- Schema + RPC test suite.
--
-- Runs inside a single transaction and ends with ROLLBACK, so it is safe to run
-- against any database that has the migrations applied:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/invariants.test.sql
--
-- Any failure raises and aborts. A clean run prints ALL TESTS PASSED.
--
-- Role switching: `set role authenticated` + a uid. auth.uid() reads the JWT
-- claims on Supabase; the local harness reads `test.uid`. Both are set so the
-- file runs in either place.

\set ON_ERROR_STOP on
\timing off

begin;

create schema tests;
grant usage on schema tests to anon, authenticated;

create or replace function tests.act_as(p_uid uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('test.uid', coalesce(p_uid::text, ''), true);
  perform set_config(
    'request.jwt.claims',
    case when p_uid is null then '' else json_build_object('sub', p_uid)::text end,
    true
  );
end;
$$;

create or replace function tests.ok(p_condition boolean, p_what text)
returns void
language plpgsql
as $$
begin
  if p_condition is not true then
    raise exception 'TEST FAIL: %', p_what;
  end if;
end;
$$;

-- psql does not interpolate :vars inside dollar-quoted blocks, so ids produced
-- mid-test are parked here instead of in psql variables.
create table tests.ids (key text primary key, val text);
grant select, insert on tests.ids to anon, authenticated;

create or replace function tests.id(p_key text)
returns uuid language sql stable as $$
  select val::uuid from tests.ids where key = p_key;
$$;

create or replace function tests.txt(p_key text)
returns text language sql stable as $$
  select val from tests.ids where key = p_key;
$$;

-- ============================================================== fixtures ====

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@campus.edu',    now(), '{"full_name":"Ada Admin"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'reviewer@campus.edu', now(), '{"full_name":"Mya Reeve"}'),
  ('00000000-0000-0000-0000-0000000000a3', 'officer@campus.edu',  now(), '{"full_name":"Ola Ford"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'voter1@gmail.com',    now(), '{"full_name":"Aye Aye"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'voter2@gmail.com',    now(), '{"full_name":"Bo Bo"}'),
  ('00000000-0000-0000-0000-0000000000b3', 'staff1@campus.edu',   now(), '{"full_name":"Dr. Aung Aung"}'),
  ('00000000-0000-0000-0000-0000000000b4', 'staff2@campus.edu',   now(), '{"full_name":"Dr. Aung Aung"}'),
  ('00000000-0000-0000-0000-0000000000b5', 'unconfirmed@x.com',   null,  '{"full_name":"Not Confirmed"}');

\echo '== profiles are mirrored from auth.users by trigger'
do $$
begin
  perform tests.ok(
    (select count(*) from profiles) = 8,
    'handle_new_user() should have created 8 profiles'
  );
  perform tests.ok(
    (select full_name from profiles where id = '00000000-0000-0000-0000-0000000000b3') = 'Dr. Aung Aung',
    'full_name should come from sign-up metadata'
  );
  perform tests.ok(
    (select bool_and(voter_status = 'UNVERIFIED') from profiles),
    'every new profile starts UNVERIFIED'
  );
end;
$$;

-- Bootstrap roles the way seed.sql documents (system grant, no actor).
insert into user_roles (profile_id, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'ADMIN'),
  ('00000000-0000-0000-0000-0000000000a2', 'REVIEWER'),
  ('00000000-0000-0000-0000-0000000000a3', 'ELECTION_OFFICER');

\echo '== role grants are audited'
do $$
begin
  perform tests.ok(
    (select count(*) from audit_log where action = 'USER_ROLES_INSERT') = 3,
    'each role grant writes an audit row'
  );
end;
$$;

-- ====================================================== verification flow ====

\echo '== email confirmation gates verification (FR-3)'
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-0000000000b5');
do $$
begin
  begin
    perform submit_verification('00000000-0000-0000-0000-0000000000b5/card.jpg');
    raise exception 'TEST FAIL: unconfirmed email should not reach verification';
  exception when sqlstate 'EV030' then null;
  end;
end;
$$;

\echo '== an upload path must sit under the caller''s own prefix'
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
do $$
begin
  begin
    perform submit_verification('00000000-0000-0000-0000-0000000000b2/card.jpg');
    raise exception 'TEST FAIL: cross-user upload path should be rejected';
  exception when sqlstate 'EV021' then null;
  end;
end;
$$;

\echo '== submitting moves the profile to PENDING'
insert into tests.ids values ('sub1', submit_verification('00000000-0000-0000-0000-0000000000b1/card.jpg')::text);
do $$
begin
  perform tests.ok(
    (select voter_status from profiles where id = '00000000-0000-0000-0000-0000000000b1') = 'PENDING',
    'submit_verification sets voter_status = PENDING'
  );
  begin
    perform submit_verification('00000000-0000-0000-0000-0000000000b1/again.jpg');
    raise exception 'TEST FAIL: a second submission while PENDING should be refused';
  exception when sqlstate 'EV030' then null;
  end;
end;
$$;

select tests.act_as('00000000-0000-0000-0000-0000000000b2');
insert into tests.ids values ('sub2', submit_verification('00000000-0000-0000-0000-0000000000b2/card.jpg')::text);
select tests.act_as('00000000-0000-0000-0000-0000000000b3');
insert into tests.ids values ('sub3', submit_verification('00000000-0000-0000-0000-0000000000b3/card.jpg')::text);
select tests.act_as('00000000-0000-0000-0000-0000000000b4');
insert into tests.ids values ('sub4', submit_verification('00000000-0000-0000-0000-0000000000b4/card.jpg')::text);

\echo '== only a Reviewer may decide'
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
do $$
begin
  begin
    perform decide_review(tests.id('sub2'), true, 'STUDENT', 'MaNaTa-40883');
    raise exception 'TEST FAIL: a voter should not be able to decide a review';
  exception when sqlstate 'EV010' then null;
  end;
end;
$$;

\echo '== a Reviewer sees the pending queue, a voter does not'
select tests.act_as('00000000-0000-0000-0000-0000000000a2');
do $$
begin
  perform tests.ok(
    (select count(*) from verification_submissions where status = 'PENDING') = 4,
    'reviewer sees all pending submissions'
  );
end;
$$;
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
do $$
begin
  perform tests.ok(
    (select count(*) from verification_submissions) = 1,
    'a voter sees only their own submission'
  );
end;
$$;

\echo '== the reviewer queue exposes emails to reviewers and to nobody else'
select tests.act_as('00000000-0000-0000-0000-0000000000a2');
do $$
begin
  perform tests.ok(
    (select count(*) from verification_queue) = 4,
    'a reviewer sees the pending queue with emails'
  );
  perform tests.ok(
    (select email from verification_queue
      where profile_id = '00000000-0000-0000-0000-0000000000b1') = 'voter1@gmail.com',
    'the queue carries the submitter email'
  );
end;
$$;
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
do $$
begin
  perform tests.ok(
    (select count(*) from verification_queue) = 0,
    'a voter sees nothing in the reviewer queue'
  );
  perform tests.ok(
    (select count(*) from admin_user_directory) = 0,
    'a voter sees nothing in the admin directory'
  );
end;
$$;
select tests.act_as('00000000-0000-0000-0000-0000000000a2');

\echo '== URN is normalised, and a malformed one is refused'
select tests.act_as('00000000-0000-0000-0000-0000000000a2');
do $$
begin
  begin
    perform decide_review(tests.id('sub1'), true, 'STUDENT', 'ABC-123');
    raise exception 'TEST FAIL: malformed URN should be refused';
  exception when sqlstate 'EV021' then null;
  end;
end;
$$;

insert into tests.ids values ('path1', decide_review(tests.id('sub1'), true, 'STUDENT', 'MaNaTa-40883'));

-- Read these back as the owner: once decided, the row correctly drops out of
-- the Reviewer's own view of the queue.
reset role;
do $$
begin
  perform tests.ok(
    (select urn_normalized from voter_identity
      where profile_id = '00000000-0000-0000-0000-0000000000b1') = 'MANATA40883',
    'URN is stored uppercased and dash-stripped'
  );
  perform tests.ok(
    (select voter_status from profiles where id = '00000000-0000-0000-0000-0000000000b1') = 'APPROVED',
    'approval sets voter_status = APPROVED'
  );
  perform tests.ok(
    (select id_card_path is null and status = 'APPROVED'
       from verification_submissions where id = tests.id('sub1')),
    'the card image pointer is cleared on decision (invariant 6)'
  );
  perform tests.ok(
    tests.txt('path1') = '00000000-0000-0000-0000-0000000000b1/card.jpg',
    'decide_review returns the storage path so the Server Action can delete the object'
  );
  perform tests.ok(
    (select count(*) from audit_log where action = 'VERIFY_APPROVE') = 1,
    'an approval is audited (invariant 8)'
  );
end;
$$;

\echo '== the same URN cannot be anchored twice (FR-6)'
set role authenticated;
do $$
begin
  begin
    perform decide_review(tests.id('sub2'), true, 'STUDENT', 'manata-40883');
    raise exception 'TEST FAIL: duplicate URN should be refused';
  exception when sqlstate 'EV020' then null;
  end;
  perform tests.ok(
    (select voter_status from profiles where id = '00000000-0000-0000-0000-0000000000b2') = 'PENDING',
    'a failed approval leaves the profile untouched'
  );
end;
$$;

select decide_review(tests.id('sub2'), true, 'STUDENT', 'MaNaTa-40884');

\echo '== staff usernames are generated, and collisions get a suffix'
select decide_review(tests.id('sub3'), true, 'STAFF', null, null, 'CEIT');
select decide_review(tests.id('sub4'), true, 'STAFF', null, null, 'CEIT');
do $$
begin
  perform tests.ok(
    (select staff_username from voter_identity
      where profile_id = '00000000-0000-0000-0000-0000000000b3') = 'dr_aung_aung_ceit',
    'staff username is lowercased, underscored, department-suffixed'
  );
  perform tests.ok(
    (select staff_username from voter_identity
      where profile_id = '00000000-0000-0000-0000-0000000000b4') = 'dr_aung_aung_ceit_2',
    'same name + same department gets a trailing _2'
  );
end;
$$;

\echo '== rejection needs a reason, and is recorded'
reset role;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values ('00000000-0000-0000-0000-0000000000b6', 'blurry@x.com', now(), '{"full_name":"Blur Ry"}');
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-0000000000b6');
insert into tests.ids values ('sub6', submit_verification('00000000-0000-0000-0000-0000000000b6/card.jpg')::text);
select tests.act_as('00000000-0000-0000-0000-0000000000a2');
do $$
begin
  begin
    perform decide_review(tests.id('sub6'), false);
    raise exception 'TEST FAIL: rejection without a reason should be refused';
  exception when sqlstate 'EV021' then null;
  end;
end;
$$;
select decide_review(tests.id('sub6'), false, null, null, null, null, 'The photo was too blurry to read.');
reset role;
do $$
begin
  perform tests.ok(
    (select voter_status from profiles where id = '00000000-0000-0000-0000-0000000000b6') = 'REJECTED',
    'rejection sets voter_status = REJECTED'
  );
  perform tests.ok(
    (select rejection_reason from verification_submissions where id = tests.id('sub6'))
      = 'The photo was too blurry to read.',
    'the reason is stored for the voter to read'
  );
end;
$$;

\echo '== a rejected voter may submit again'
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-0000000000b6');
select submit_verification('00000000-0000-0000-0000-0000000000b6/better.jpg');

-- ======================================================== election setup ====

\echo '== only an Officer may create an election'
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
do $$
begin
  begin
    insert into elections (name, created_by)
    values ('Rogue election', '00000000-0000-0000-0000-0000000000b1');
    raise exception 'TEST FAIL: a voter should not be able to create an election';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select tests.act_as('00000000-0000-0000-0000-0000000000a3');
insert into elections (id, name, created_by, opens_at, closes_at, verification_deadline)
values (
  '00000000-0000-0000-0000-00000000e001',
  'Freshers'' Coronation 2026',
  '00000000-0000-0000-0000-0000000000a3',
  now() - interval '1 hour',
  now() + interval '1 hour',
  now() - interval '90 minutes'
);

insert into categories (id, election_id, name, display_order) values
  ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000e001', 'Male', 0),
  ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-00000000e001', 'Female', 1);

insert into awards (category_id, rank, label) values
  ('00000000-0000-0000-0000-00000000c001', 1, 'King'),
  ('00000000-0000-0000-0000-00000000c002', 1, 'Queen');

\echo '== locking is blocked until every category has candidates'
do $$
begin
  begin
    perform transition_election('00000000-0000-0000-0000-00000000e001', 'CANDIDATES_LOCKED');
    raise exception 'TEST FAIL: locking an empty ballot should be refused';
  exception when sqlstate 'EV013' then null;
  end;
end;
$$;

insert into candidates (id, category_id, display_name, photo_path, department_code) values
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000c001', 'Tunde A', 'p/1.jpg', 'CEIT'),
  ('00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-00000000c001', 'Musa O',  'p/2.jpg', 'ME'),
  ('00000000-0000-0000-0000-00000000d003', '00000000-0000-0000-0000-00000000c002', 'Sanda W', 'p/3.jpg', 'CE');

\echo '== an illegal jump through the lifecycle is refused'
do $$
begin
  begin
    perform transition_election('00000000-0000-0000-0000-00000000e001', 'OPEN');
    raise exception 'TEST FAIL: DRAFT -> OPEN should be refused';
  exception when sqlstate 'EV011' then null;
  end;
end;
$$;

\echo '== a Reviewer cannot drive the lifecycle (separation of duties)'
select tests.act_as('00000000-0000-0000-0000-0000000000a2');
do $$
begin
  begin
    perform transition_election('00000000-0000-0000-0000-00000000e001', 'CANDIDATES_LOCKED');
    raise exception 'TEST FAIL: a reviewer should not be able to transition an election';
  exception when sqlstate 'EV010' then null;
  end;
end;
$$;

select tests.act_as('00000000-0000-0000-0000-0000000000a3');
select transition_election('00000000-0000-0000-0000-00000000e001', 'CANDIDATES_LOCKED');

\echo '== structural edits are illegal once candidates are locked (FR-13)'
do $$
begin
  begin
    insert into candidates (category_id, display_name, photo_path)
    values ('00000000-0000-0000-0000-00000000c001', 'Late Entry', 'p/9.jpg');
    raise exception 'TEST FAIL: candidates should be frozen after locking';
  exception when insufficient_privilege then null;
  end;
end;
$$;

\echo '== state cannot be moved by a direct UPDATE'
do $$
begin
  begin
    update elections set state = 'OPEN' where id = '00000000-0000-0000-0000-00000000e001';
    raise exception 'TEST FAIL: elections.state should have no UPDATE grant';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select transition_election('00000000-0000-0000-0000-00000000e001', 'OPEN');

-- ============================================================== voting ======

-- Both students were approved during this transaction, i.e. after the
-- election's verification deadline. Back-date them so the eligible path is
-- exercised too; the staff accounts stay "late" on purpose.
reset role;
update voter_identity set reviewed_at = now() - interval '2 hours'
where profile_id in (
  '00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-0000000000b2'
);
set role authenticated;

\echo '== an unapproved user cannot vote'
select tests.act_as('00000000-0000-0000-0000-0000000000b6');
do $$
begin
  begin
    perform cast_vote('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000d001');
    raise exception 'TEST FAIL: an unapproved user should not be able to vote';
  exception when sqlstate 'EV002' then null;
  end;
end;
$$;

\echo '== approval after the verification deadline does not confer eligibility (FR-8)'
select tests.act_as('00000000-0000-0000-0000-0000000000b3');
do $$
begin
  begin
    perform cast_vote('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000d001');
    raise exception 'TEST FAIL: late verification should not be eligible';
  exception when sqlstate 'EV005' then null;
  end;
end;
$$;

\echo '== a candidate from another category is refused'
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
do $$
begin
  begin
    perform cast_vote('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000d003');
    raise exception 'TEST FAIL: cross-category candidate should be refused';
  exception when sqlstate 'EV003' then null;
  end;
end;
$$;

\echo '== a valid vote writes both halves of the pair'
select cast_vote('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000d001');
do $$
begin
  perform tests.ok(
    (select count(*) from ballot_issued where voter_id = '00000000-0000-0000-0000-0000000000b1') = 1,
    'the voter can see their own ballot_issued row'
  );
end;
$$;

\echo '== voting twice in the same category is refused (FR-17)'
do $$
begin
  begin
    perform cast_vote('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000d002');
    raise exception 'TEST FAIL: a second vote in the same category should be refused';
  exception when sqlstate 'EV004' then null;
  end;
end;
$$;

\echo '== but the other category is still open to them (FR-14)'
select cast_vote('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-00000000d003');

select tests.act_as('00000000-0000-0000-0000-0000000000b2');
select cast_vote('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000d002');

\echo '== nobody can read votes, and nobody can read another voter''s ballot'
do $$
begin
  begin
    perform 1 from votes limit 1;
    raise exception 'TEST FAIL: votes must not be selectable (invariant 7)';
  exception when insufficient_privilege then null;
  end;

  perform tests.ok(
    (select count(*) from ballot_issued) = 1,
    'a voter sees only their own ballot_issued rows'
  );
end;
$$;

\echo '== no tally is visible before publication (FR-19)'
do $$
begin
  perform tests.ok(
    (select count(*) from election_results) = 0,
    'election_results is empty while the election is not PUBLISHED'
  );
end;
$$;

\echo '== casting a vote writes no audit row (secrecy over auditability, by design)'
do $$
begin
  perform tests.ok(
    (select count(*) from audit_log where action ilike '%VOTE%') = 0,
    'no audit row may tie an actor to a vote'
  );
end;
$$;

-- ======================================================== close & publish ====

select tests.act_as('00000000-0000-0000-0000-0000000000a3');
select transition_election('00000000-0000-0000-0000-00000000e001', 'CLOSED');

\echo '== a tie blocks publication (FR-20)'
do $$
begin
  perform tests.ok(
    has_unresolved_tie('00000000-0000-0000-0000-00000000e001'),
    'Male is tied 1-1 at rank 1, so a tie should be detected'
  );
  begin
    perform transition_election('00000000-0000-0000-0000-00000000e001', 'PUBLISHED');
    raise exception 'TEST FAIL: publication should be blocked by an unresolved tie';
  exception when sqlstate 'EV012' then null;
  end;
end;
$$;

\echo '== recording a resolution unblocks it'
insert into tie_resolutions (election_id, category_id, resolved_by, justification, resolution)
values (
  '00000000-0000-0000-0000-00000000e001',
  '00000000-0000-0000-0000-00000000c001',
  '00000000-0000-0000-0000-0000000000a3',
  'Coin toss witnessed by the organising committee.',
  '{"00000000-0000-0000-0000-00000000d001": 1}'::jsonb
);
select transition_election('00000000-0000-0000-0000-00000000e001', 'PUBLISHED');

\echo '== results are public once published (FR-21)'
reset role;
set role anon;
do $$
begin
  perform tests.ok(
    (select count(*) from election_results) = 3,
    'every candidate appears in the published results'
  );
  perform tests.ok(
    (select vote_count from election_results
      where candidate_id = '00000000-0000-0000-0000-00000000d001') = 1,
    'the tally matches the votes cast'
  );
  perform tests.ok(
    (select result_rank from election_results
      where candidate_id = '00000000-0000-0000-0000-00000000d003') = 1,
    'the sole Female candidate ranks 1'
  );
  begin
    perform 1 from votes limit 1;
    raise exception 'TEST FAIL: votes must stay unreadable even after publication';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- ============================================== audit + structural checks ====

\echo '== the audit log is append-only (NFR-4)'
reset role;
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
do $$
begin
  perform tests.ok(
    (select count(*) from audit_log where action = 'ELECTION_TRANSITION') = 4,
    'every lifecycle step is logged'
  );
  begin
    update audit_log set action = 'TAMPERED' where id = (select min(id) from audit_log);
    raise exception 'TEST FAIL: audit_log should reject UPDATE';
  exception when sqlstate 'EV010' then null; when insufficient_privilege then null;
  end;
  begin
    delete from audit_log where id = (select min(id) from audit_log);
    raise exception 'TEST FAIL: audit_log should reject DELETE';
  exception when sqlstate 'EV010' then null; when insufficient_privilege then null;
  end;
end;
$$;

\echo '== a non-admin cannot read the audit log'
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
do $$
begin
  perform tests.ok(
    (select count(*) from audit_log) = 0,
    'the audit log is admin-only'
  );
end;
$$;

reset role;

\echo '== structural invariants (AGENTS.md 1, 2, 5)'
do $$
declare
  v_bad text;
begin
  perform tests.ok(
    not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'votes'
        and column_name in ('voter_id', 'profile_id', 'ballot_id', 'ballot_issued_id',
                            'created_at', 'cast_at', 'updated_at')
    ),
    'votes must carry no voter reference and no fine-grained timestamp'
  );

  perform tests.ok(
    (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'votes' and column_name = 'cast_on') = 'date',
    'votes.cast_on must stay a date'
  );

  perform tests.ok(
    not exists (
      select 1
      from information_schema.table_constraints tc
      join information_schema.constraint_column_usage ccu
        on ccu.constraint_name = tc.constraint_name
      where tc.table_name = 'votes'
        and tc.constraint_type = 'FOREIGN KEY'
        and ccu.table_name = 'ballot_issued'
    ),
    'votes must have no foreign key to ballot_issued'
  );

  perform tests.ok(
    not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'candidates'
        and column_name in ('profile_id', 'user_id')
    ),
    'candidates must not link to a user account'
  );

  select string_agg(c.relname, ', ') into v_bad
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  perform tests.ok(v_bad is null, 'RLS must be enabled on every table; missing on: ' || coalesce(v_bad, ''));

  -- Every table with RLS on needs at least one policy, or it is silently closed
  -- to everyone. `votes` is the deliberate exception.
  select string_agg(c.relname, ', ') into v_bad
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
    and c.relname <> 'votes'
    and not exists (select 1 from pg_policy p where p.polrelid = c.oid);
  perform tests.ok(v_bad is null, 'these tables have RLS but no policy: ' || coalesce(v_bad, ''));

  perform tests.ok(
    not exists (
      select 1 from information_schema.role_table_grants
      where table_schema = 'public' and table_name in ('votes', 'ballot_issued', 'voter_identity')
        and grantee in ('anon', 'authenticated')
        and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
    ),
    'the vote and identity tables must have no direct write grants (invariant 3)'
  );
end;
$$;

\echo ''
\echo 'ALL TESTS PASSED'

rollback;
