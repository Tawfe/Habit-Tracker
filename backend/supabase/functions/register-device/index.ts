import { userClient, cors } from '../_shared/supabase.ts';

/**
 * Upsert the caller's push token. Idempotent on (user, token).
 * Body: { token: string, ecosystem: 'apns'|'fcm'|'hms', platform: 'ios'|'android'|'huawei' }
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'unauthenticated' }, 401);
  }

  const supa = userClient(authHeader);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return json({ error: 'unauthenticated' }, 401);

  const { token, ecosystem, platform } = await req.json();
  if (!token || !ecosystem || !platform) {
    return json({ error: 'token, ecosystem and platform are required' }, 400);
  }

  const { error } = await supa.from('devices').upsert(
    {
      user_id: user.id,
      push_token: token,
      ecosystem,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,push_token' },
  );
  if (error) return json({ error: error.message }, 400);

  return json({ ok: true });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  });
}
