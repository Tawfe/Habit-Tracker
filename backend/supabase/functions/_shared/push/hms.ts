import { PushMessage, PushProvider } from './types.ts';

/**
 * Huawei HMS Push Kit. Auth is OAuth2 client-credentials against the
 * AppGallery Connect OAuth endpoint.
 * Env:
 *   HMS_APP_ID, HMS_APP_SECRET — from AppGallery Connect (Push Kit)
 */
let cached: { token: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp > now + 60) return cached.token;

  const res = await fetch('https://oauth-login.cloud.huawei.com/oauth2/v3/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: req('HMS_APP_ID'),
      client_secret: req('HMS_APP_SECRET'),
    }),
  });
  if (!res.ok) throw new Error(`HMS token failed: ${await res.text()}`);
  const json = await res.json();
  cached = { token: json.access_token, exp: now + (json.expires_in ?? 3600) };
  return cached.token;
}

function req(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`${name} not set`);
  return v;
}

export const hmsProvider: PushProvider = {
  async send(token: string, msg: PushMessage) {
    const appId = req('HMS_APP_ID');
    const at = await accessToken();
    const res = await fetch(
      `https://push-api.cloud.huawei.com/v1/${appId}/messages:send`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${at}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          validate_only: false,
          message: {
            notification: { title: msg.title, body: msg.body },
            android: {
              notification: { title: msg.title, body: msg.body, click_action: { type: 3 } },
            },
            data: msg.data ? JSON.stringify(msg.data) : undefined,
            token: [token],
          },
        }),
      },
    );
    const json = await res.json().catch(() => ({}));
    // HMS returns 200 with code "80000000" on success.
    if (!res.ok || (json.code && json.code !== '80000000')) {
      throw new Error(`HMS send failed: ${JSON.stringify(json)}`);
    }
  },
};
