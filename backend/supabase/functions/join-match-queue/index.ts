import { adminClient, userClient, cors } from '../_shared/supabase.ts';

/**
 * Join the matchmaking queue. If someone else is already waiting, pair them
 * immediately and create a `partnerships` row (status 'pending').
 *
 * v1 matching = FIFO (longest-waiting first). Swap in interest/timezone
 * scoring later by reading match_queue.prefs.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'unauthenticated' }, 401);

  const supa = userClient(authHeader);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return json({ error: 'unauthenticated' }, 401);

  const admin = adminClient();

  // Already partnered?
  const { data: existing } = await admin
    .from('partnerships')
    .select('id')
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .neq('status', 'ended')
    .maybeSingle();
  if (existing) return json({ status: 'already_partnered' });

  // Find the longest-waiting other user.
  const { data: waiting } = await admin
    .from('match_queue')
    .select('user_id')
    .neq('user_id', user.id)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!waiting) {
    // Nobody waiting — enqueue self.
    await admin.from('match_queue').upsert({ user_id: user.id });
    return json({ status: 'queued' });
  }

  // Pair them.
  const partner = waiting.user_id;
  const { data: pair, error } = await admin
    .from('partnerships')
    .insert({ user_a: user.id, user_b: partner, status: 'pending' })
    .select()
    .single();
  if (error) return json({ error: error.message }, 400);

  await admin.from('match_queue').delete().in('user_id', [user.id, partner]);

  return json({ status: 'matched', partnership: pair });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  });
}
