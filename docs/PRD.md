# PRD — University King & Queen Voting System

**Version:** 1.0
**Stack:** Next.js (App Router) + Supabase (Auth, Postgres, Storage, RLS, RPC)
**Status:** Approved for build. Domain decisions are frozen; see the design brief for the reasoning behind each.

---

## 1. Summary

A secure web application for electing a King, Queen, and associated titles at a university freshers' welcome event. Roughly 1,000 voters. The system must guarantee one vote per person, keep every ballot secret, and produce a result that can be audited if disputed.

---

## 2. Goals & Non-Goals

### Goals
- One person, one vote, enforced against **university identity**, not email.
- **Ballot secrecy** — no one, including administrators, can link a person to their vote.
- **Auditability** — every administrative action is logged and reviewable.
- Configurable titles and categories, entered fresh per election.
- A public result, published only after the election closes.

### Non-Goals (v1)
- Vote receipts / voter-verifiable ballots.
- Automated OCR of ID cards (review is manual).
- Multi-round runoff voting.
- Live result streaming.
- Storing any national-ID (NRC) data.

---

## 3. Roles

| Role | Capabilities |
|---|---|
| **Voter** | Register, verify identity, cast one ballot per category once approved. Every approved user is a voter. |
| **Reviewer** | Approve/reject verification submissions; set member type; record identity. Cannot create or run elections. |
| **Election Officer** | Create elections, add candidates, open/close/publish, resolve ties. Cannot approve voters. |
| **Admin** | Assign roles, manage the department list, read the audit log. |

**Separation of duties:** the person who approves voters must not be the person who opens and closes voting. Where staffing forces overlap, the audit log is the compensating control.

---

## 4. Identity & Eligibility

Accounts may use an email from **any domain**; email only proves control of a mailbox. Two independent states gate participation:

- `email_confirmed` — set by Supabase Auth.
- `voter_status` — `UNVERIFIED → PENDING → APPROVED / REJECTED`, set by a Reviewer.

Only `APPROVED` users may vote. Email confirmation alone grants nothing.

### Member types

`member_type` records only **how a verified user's identity is anchored** — students by URN, staff by username. Both may vote.

| `member_type` | May vote | Identity anchor |
|---|---|---|
| `STUDENT` | Yes | University Registration Number |
| `STAFF` | Yes | Reviewer-generated username |

**Candidates are not users** (see §5.3). They are standalone cards the Election Officer creates, so "who may compete" is the officer's curation decision, not a function of account type. The earlier "teachers can't compete" intent is met simply by the officer not adding them; it is no longer machine-enforced.

### Identity anchor by type

- **Student → University Registration Number (URN).** Format `MaNaTa-00000`. Normalised to uppercase, dash-stripped (`MANATA40883`). **Unique** on the normalised form — this is what blocks a student registering twice.
- **Staff → reviewer-generated username.** Derived from full name (`Dr. Aung Aung` → `dr_aung_aung`), always suffixed with a department code (`dr_aung_aung_CEIT`). The **physical staff card, reviewed by hand, is the anti-duplication anchor**; the username is a handle. Same-name-same-department clashes get a trailing number (`_2`). Department codes come from a fixed preset: `CE, Arch, EP, EC, CEIT, ME, NE, BioT, ChE, MC` (extensible by an Admin).

---

## 5. Functional Requirements

### 5.1 Registration & email confirmation
- FR-1: A user registers with email + password (any domain).
- FR-2: Supabase sends a confirmation link/code (built-in feature; custom SMTP configured for production).
- FR-3: Until confirmed, the user cannot proceed to verification.

### 5.2 Identity verification
- FR-4: A confirmed user uploads a photo of their student/staff ID card, moving `voter_status` to `PENDING`.
- FR-5: A Reviewer views the pending submission, sets `member_type`, and records the URN (student) or generates the username (staff).
- FR-6: The system rejects an already-approved student URN via a unique constraint.
- FR-7: On decision, `voter_status` becomes `APPROVED` or `REJECTED`; the card image is **deleted**; only the identity record, decision, reviewer, and timestamp are retained.
- FR-8: Submissions after an election's `verification_deadline` are not processed for that election.

### 5.3 Election setup
- FR-9: An Election Officer creates an election with a name and (optionally at draft time) `opens_at`, `closes_at`, `verification_deadline`.
- FR-10: The officer adds one or more **categories** (free-text names, e.g. "Male", "Female").
- FR-11: Each category has one or more **awards**, each a `(rank, label)` pair (e.g. rank 1 → "King", rank 2 → "Prince"). Labels are free text, entered per election.
- FR-12: The officer adds **candidates** to each category as standalone cards: photo (required), display name (required), a short free-text tagline/bio, and department. A candidate is **not** a user account and need not be registered in the system. Each candidate belongs to exactly one category.
- FR-13: Structural edits are permitted only in `DRAFT`.

### 5.4 Voting
- FR-14: An approved voter casts **one vote per category**. With two categories (e.g. Male, Female), each voter casts two votes in total, one per category.
- FR-15: Any approved voter may vote for any candidate card. Because candidates are not accounts, "self-voting" is not a concept the system reasons about.
- FR-16: Votes are accepted only while the election is `OPEN` (between `opens_at` and `closes_at`).
- FR-17: The vote endpoint is idempotent — a retried or double-tapped request cannot double-count.
- FR-18: All eligibility and state checks are enforced server-side.

### 5.5 Results
- FR-19: No tally — running or final — is visible before the election is `PUBLISHED`.
- FR-20: When `CLOSED`, the Officer resolves any tie manually, recording a justification.
- FR-21: On `PUBLISHED`, results are shown publicly: per category, candidates ranked, each rank mapped to its award label.

### 5.6 Administration
- FR-22: Admins assign/revoke roles.
- FR-23: Admins manage the department preset list.
- FR-24: The audit log is append-only and readable by Admins.

---

## 6. Non-Functional Requirements

- **NFR-1 (Secrecy):** the vote store holds no reference to the voter; the "has-voted" store holds no reference to the choice. The two cannot be joined by key, and timestamp precision must not allow correlation.
- **NFR-2 (Integrity):** casting a ballot and recording it are one atomic transaction.
- **NFR-3 (Least privilege):** the Supabase service-role key never reaches the client; Row Level Security is the default guard, not an afterthought.
- **NFR-4 (Auditability):** every state transition, verification decision, candidate change, role change, and tie resolution is logged with actor and timestamp.
- **NFR-5 (Availability):** the system tolerates ~1,000 users signing up and voting within a short window; email sending must not silently rate-limit.
- **NFR-6 (Privacy):** ID-card images are treated as sensitive PII — encrypted at rest, access-restricted, deleted after a decision.
- **NFR-7 (Data retention):** a scheduled job enforces image deletion; the policy is documented and actually runs.

---

## 7. Key User Flows

**Voter:** register → confirm email → upload ID → (wait for review) → once approved, open the active election → vote in each category → see results after close.

**Reviewer:** open review queue → inspect card image → set member type + identity → approve/reject → image auto-deleted.

**Election Officer:** create election → add categories → add awards (rank→label) → add candidates → lock candidates → open → (voting happens) → close → resolve ties if any → publish.

---

## 8. Election Lifecycle (states)

`DRAFT → CANDIDATES_LOCKED → OPEN → CLOSED → PUBLISHED`

Each state constrains what operations are legal; enforced server-side. See ARCHITECTURE.md §5.

---

## 9. Success Criteria

- No voter can cast more than one ballot per category.
- No stored data links a voter to a choice.
- A full administrative history is reconstructable from the audit log.
- The result is published only after close and matches the recorded votes.
