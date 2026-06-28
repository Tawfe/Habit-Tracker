# Architecture

## Overview
A thin React Native client talks directly to Supabase (Postgres + Auth) for
CRUD, guarded by Row Level Security. Trusted server logic (matchmaking, the
missed-checkin sweep, push fan-out) lives in Supabase Edge Functions.

```
┌──────────────────────────┐         ┌───────────────────────────────┐
│  React Native app         │  HTTPS  │  Supabase                     │
│  - auth (Zustand)         │ ──────► │  - Postgres + RLS             │
│  - habits/checkins/partner│         │  - Auth                       │
│  - ecosystem detection    │         │  - Edge Functions:            │
└──────────┬───────────────┘         │     register-device           │
           │ push token              │     join-match-queue          │
           ▼                         │     missed-checkin-sweep ◄─cron│
   APNs / FCM / HMS  ◄───────────────┤  - _shared/push/router        │
                                     └───────────────────────────────┘
```

## Why the "missed check-in" job must be server-side
A phone that is asleep or offline cannot detect that **another** user did
nothing. Absence-of-event detection requires a always-on component with a clock.
So the sweep runs on a schedule in the backend, reads each user's local day, and
pushes the *partner* when a check-in is missing.

## Timezones
"Missed by end of day" is per the **subject's** local day, not the server's.
`profiles.timezone` (IANA) is the source of truth; the sweep uses
`Intl.DateTimeFormat` with that zone to compute the local date and hour, and
only nags after `NAG_HOUR_LOCAL`.

## Data access & security
- All tables have **RLS**. Users see only their own rows, except:
  - a user can read their **active partner's** `checkins` and `profile`
    (via the `is_my_partner()` security-definer function) — this powers the
    accountability view.
- Edge Functions that must bypass RLS use the **service role** key
  (`_shared/supabase.ts → adminClient()`); functions acting for a user use the
  caller's JWT (`userClient()`).
- The cron sweep is protected by a shared `CRON_SECRET` header (cron has no JWT).

## Matching (v1)
FIFO: `join-match-queue` pairs the longest-waiting other user and creates a
`pending` partnership; both accept → `active`. Unique partial indexes guarantee
one non-ended partnership per user. Upgrade path: add `prefs` scoring
(timezone proximity, habit overlap, activity level) in the same function.

## Dedupe
`notifications_log` has a unique `(user_id, kind, ref_date)`; the sweep inserts
before sending and treats a unique violation as "already notified", so partners
are never nagged twice for the same day.

## Extension points
- **Realtime**: subscribe to the partner's `checkins` with Supabase Realtime to
  show live status.
- **Streaks**: derive from `checkins` (consecutive days) — add a materialized
  view or compute client-side.
- **Reminders to self**: schedule local notifications on-device (no server
  needed) in addition to the partner nudge.
- **Provider abstraction**: `_shared/push/router.ts` is the seam if you later
  switch to a unified provider.
