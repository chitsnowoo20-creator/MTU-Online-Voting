-- Enums + shared conventions.
--
-- Error codes raised by the RPCs in later migrations (5-char SQLSTATEs, so the
-- app layer can branch on `code` instead of matching message strings):
--
--   EV001  election is not OPEN / outside its window
--   EV002  caller is not an approved voter
--   EV003  candidate does not belong to the category
--   EV004  caller has already voted in this category
--   EV005  caller was verified after this election's verification deadline
--   EV010  forbidden (missing role)
--   EV011  illegal lifecycle transition
--   EV012  publication blocked by an unresolved tie
--   EV013  election is not complete enough for this transition
--   EV020  duplicate identity (URN / staff username already anchored)
--   EV021  malformed identity input
--   EV030  verification submission not in a submittable/decidable state

create type member_type as enum ('STUDENT', 'STAFF');

create type voter_status as enum ('UNVERIFIED', 'PENDING', 'APPROVED', 'REJECTED');

create type app_role as enum ('REVIEWER', 'ELECTION_OFFICER', 'ADMIN');

create type election_state as enum (
  'DRAFT',
  'CANDIDATES_LOCKED',
  'OPEN',
  'CLOSED',
  'PUBLISHED'
);
