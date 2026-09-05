# UI shell rework

*Tuesday, 1 September 2026 · 19:43 (UTC+06:30)*

Restructured the signed-in screens from single centred cards into a proper
dashboard shell, then removed the navigation duplication that turned up once
the layout made it visible.

## The shell

`src/components/ui/dashboard-page.tsx` — a new `DashboardPage` component.

A page-level header (eyebrow, title, subtitle, status chip, actions) sits
*outside* any card, above a body that is either one wide column or a main
column plus a 320px right rail. Pass no `rail` and the grid collapses to a
single column, so a screen with nothing secondary to say does not carry an
empty box.

Screens moved onto it: `/`, `/account`, `/verify`, `/vote`, `/review`.

## The signed-in home

`HomeDashboard` existed but was never imported — `/` served the marketing page
to everyone, and it is the one route outside `AppFrame`, so the nav's **Home**
row threw a signed-in user out of the app chrome. `/` now branches: signed out
keeps the marketing page unchanged, signed in gets the dashboard inside the
chrome.

It shows the published election's winners (photo, award label, votes), a
per-category record of your own ballot, and turnout. All three respect the
schema's guarantees: `ballot_issued` returns only your own rows and records
*that* you voted, never *what*; `election_results` filters on
`state = 'PUBLISHED'` inside the view, so no count is reachable before
publication.

## Navigation

- One collapse control. The header button and a rail-footer "Collapse" did the
  same thing; the header keeps its position whether the rail is open or shut.
- Active rows drew a `border-l-2` *and* an inset shadow — two left rules on a
  rounded pill. Now the filled pill alone.
- Labels animate with the rail instead of appearing at full opacity while it
  is still widening, and the section heading collapses its height rather than
  unmounting and shoving the footer down a frame.
- Rows are 40px; the footer is one bordered block instead of three.
- Collapsed width matches the header toggle, so the border under it runs
  straight down the rail's edge.
- Reviewer's icon was three bars — the hamburger. Replaced with an ID card,
  which is what a reviewer looks at. Voter moved from a house to a ballot.

## One page width

Every screen now uses the same 1120px container. Capped containers recentre
when the rail collapses while full-width ones only move on the left, so mixed
widths meant each page slid differently. `StaffPage`'s `width` prop became
`contentWidth`, which caps the *content* — forms stay narrow under a
full-width header instead of narrowing the page around them.

## Removed duplication

Each of these restated a row that was already on screen in the nav:

- "Quick links" (Your status / Results) on the home dashboard
- "Staff access" and Sign out on `/account`
- A second **Results** button beside a CTA already pointing at `/results`
- The three link cards on `/admin`
- "← Admin" and "← Elections" back links

Breadcrumbs naming a specific election were kept — the nav cannot tell you
*which* election you are inside.

## Admin overview

`/admin` was three hardcoded links to nav rows. It now reports state: account
and department counts, how many voters await review, who holds each staff role,
and recent audit entries. The guidance that used to sit on those cards moved to
the pages it describes — notably "voting rights are not granted here" now reads
on `/admin/roles`, where a role is about to be granted.

## Mobile and tablet

Verified at 375px and 768px against every screen. No horizontal overflow
anywhere; `document.scrollWidth` matches the viewport on all of them.

- Every interactive control now meets the 44px touch minimum. Nav rows are
  44px below `lg` and stay 40px on the mouse-driven desktop rail; the same
  applies to the department row actions.
- Mobile list rows on `/elections` and `/review` are tappable in full. The
  links inside them were 17–19px tall.
- The audit filter cells are `<label>` elements wrapping their control, so the
  whole 64px cell focuses the input rather than only the 25px field. On mobile
  the two dates share a row and the button goes full width, instead of the
  fixed 176px cells wrapping one per line.
- The header brand link filled 20px of a 56px header; it now fills the height.
- `log` and `status` had inner subpaths wound the same direction as their outer
  shape. Fill is nonzero, so those "lines" filled instead of cutting out and
  `log` rendered as a featureless rectangle in the mobile bar. Winding reversed.

## Smaller fixes

- Audit filters: labels inside each control, native select chrome replaced,
  focus on the whole field.
- Department row actions had a hit target the width of the word; they now have
  padding and a hover fill.
- The dashboard's third stat tile read "voting —" for published elections; it
  shows turnout instead.
- Sign out in the rail carried `w-full` alongside `mx-2`, pushing it 8px wider
  than the rail and knocking its icon out of line with every row above it.
