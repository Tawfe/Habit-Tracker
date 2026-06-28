import { adminClient } from '../_shared/supabase.ts';
import { sendPush } from '../_shared/push/router.ts';
import type { Ecosystem } from '../_shared/push/types.ts';

/**
 * Scheduled job (run via pg_cron / Supabase scheduled function, e.g. hourly).
 *
 * For each active partnership, if a user has NOT checked in any habit on their
 * own local day (and their local time is past the nag deadline), push their
 * PARTNER: "your partner missed today — give them a nudge".
 *
 * Deduped per (user, day) via notifications_log so partners aren't spammed.
 *
 * Secure this function: set verify_jwt = true is NOT used (cron has no JWT);
 * instead require a shared secret header CRON_SECRET.
 */
const NAG_HOUR_LOCAL = 20; // 8pm in the *missing* user's timezone

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }

  const admin = adminClient();
  const nowUtc = new Date();

  // All active partnerships.
  const { data: partnerships, error } = await admin
    .from('partnerships')
    .select('user_a, user_b')
    .eq('status', 'active');
  if (error) return new Response(error.message, { status: 500 });

  let pushed = 0;

  for (const p of partnerships ?? []) {
    pushed += await checkMember(admin, p.user_a, p.user_b, nowUtc);
    pushed += await checkMember(admin, p.user_b, p.user_a, nowUtc);
  }

  return new Response(JSON.stringify({ ok: true, pushed }), {
    headers: { 'content-type': 'application/json' },
  });
});

/**
 * If `subject` has missed their check-in for their local today (and it's past
 * the deadline), notify `partner`. Returns 1 if a push was sent.
 */
async function checkMember(
  admin: ReturnType<typeof adminClient>,
  subject: string,
  partner: string,
  nowUtc: Date,
): Promise<number> {
  // Subject's timezone & local day.
  const { data: prof } = await admin
    .from('profiles')
    .select('timezone, display_name')
    .eq('id', subject)
    .single();
  const tz = prof?.timezone ?? 'UTC';

  const local = toLocal(nowUtc, tz);
  if (local.hour < NAG_HOUR_LOCAL) return 0; // too early to nag
  const day = local.date; // YYYY-MM-DD

  // Did subject have any active habit but no check-in today?
  const { count: habitCount } = await admin
    .from('habits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', subject)
    .eq('archived', false);
  if (!habitCount) return 0; // no habits -> nothing to miss

  const { count: checkinCount } = await admin
    .from('checkins')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', subject)
    .eq('date', day);
  if (checkinCount && checkinCount > 0) return 0; // they checked in

  // Dedupe: already nagged the partner about this subject+day?
  const { error: dupErr } = await admin.from('notifications_log').insert({
    user_id: partner,
    kind: `missed_checkin:${subject}`,
    ref_date: day,
  });
  if (dupErr) return 0; // unique violation -> already sent

  // Push every device the partner owns.
  const { data: devices } = await admin
    .from('devices')
    .select('ecosystem, push_token')
    .eq('user_id', partner);

  const name = prof?.display_name ?? 'Your partner';
  const msg = {
    title: 'Time for a nudge 👀',
    body: `${name} hasn't checked in today. Send some encouragement!`,
    data: { type: 'missed_checkin', subject },
  };

  let sent = 0;
  for (const d of devices ?? []) {
    try {
      await sendPush(d.ecosystem as Ecosystem, d.push_token, msg);
      sent = 1;
    } catch (e) {
      console.error('push failed', d.ecosystem, String(e));
    }
  }
  return sent;
}

/** Convert a UTC instant to {date: YYYY-MM-DD, hour} in an IANA timezone. */
function toLocal(utc: Date, tz: string): { date: string; hour: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(utc).map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour === '24' ? '0' : parts.hour),
  };
}
