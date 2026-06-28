# Backend (Supabase)

## Layout
```
supabase/
  config.toml
  migrations/0001_init.sql          schema + RLS + triggers
  migrations/0002_schedule.sql      pg_cron schedule for the sweep
  functions/
    register-device/                store a device push token (user JWT)
    join-match-queue/               FIFO partner matching (service role)
    missed-checkin-sweep/           scheduled → pushes partners (CRON_SECRET)
    _shared/
      supabase.ts                   admin / user client helpers
      push/                         apns.ts fcm.ts hms.ts router.ts types.ts
```

## Setup
```bash
supabase link --project-ref <ref>
supabase db push                      # apply migrations
supabase functions deploy register-device
supabase functions deploy join-match-queue
supabase functions deploy missed-checkin-sweep --no-verify-jwt
```
`--no-verify-jwt` on the sweep because cron calls it with `CRON_SECRET`, not a
user JWT. `register-device` and `join-match-queue` keep JWT verification ON.

## Secrets
```bash
supabase secrets set \
  FCM_SERVICE_ACCOUNT="$(cat fcm-sa.json)" \
  APNS_KEY_ID=... APNS_TEAM_ID=... APNS_BUNDLE_ID=com.yourco.habittracker \
  APNS_PRIVATE_KEY="$(cat AuthKey_XXXX.p8)" APNS_HOST=api.push.apple.com \
  HMS_APP_ID=... HMS_APP_SECRET=... \
  CRON_SECRET="$(openssl rand -hex 32)"
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected
into functions automatically.

## Scheduling the sweep
`migrations/0002_schedule.sql` uses **pg_cron** + **pg_net** to call the
function hourly. Set the two settings it references first:
```sql
alter database postgres set app.settings.cron_secret = 'YOUR_CRON_SECRET';
alter database postgres set app.settings.functions_url = 'https://<ref>.functions.supabase.co';
```
Then re-run the migration (or the `cron.schedule` statement). Hourly is enough
because each user is only nagged once per local day after their deadline.

## Local testing
```bash
supabase start
supabase functions serve missed-checkin-sweep --no-verify-jwt
curl -X POST localhost:54321/functions/v1/missed-checkin-sweep \
  -H "x-cron-secret: test"
```
