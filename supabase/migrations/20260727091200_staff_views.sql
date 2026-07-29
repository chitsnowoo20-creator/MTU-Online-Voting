-- Views for the two staff screens that need an email address.
--
-- `auth.users` is not readable by `authenticated`, and it should not become so.
-- These are security-definer views with the role check written into the view
-- body, so a caller without the role gets an empty result rather than an error.
-- Neither one touches `votes` or `ballot_issued`.

-- Reviewer queue (design reference screen 08 / 09).
create view verification_queue with (security_invoker = off) as
select
  s.id            as submission_id,
  s.profile_id,
  p.full_name,
  u.email,
  s.id_card_path,
  s.submitted_at
from verification_submissions s
join profiles p on p.id = s.profile_id
join auth.users u on u.id = s.profile_id
where s.status = 'PENDING'
  and is_reviewer();

grant select on verification_queue to authenticated;

-- Admin role management (design reference screen 15). Roles are aggregated so
-- the screen can render one row per user with a checkbox per role.
create view admin_user_directory with (security_invoker = off) as
select
  p.id as profile_id,
  p.full_name,
  u.email,
  p.member_type,
  p.voter_status,
  coalesce(
    (select array_agg(r.role order by r.role) from user_roles r where r.profile_id = p.id),
    '{}'::app_role[]
  ) as roles,
  p.created_at
from profiles p
join auth.users u on u.id = p.id
where is_admin();

grant select on admin_user_directory to authenticated;
