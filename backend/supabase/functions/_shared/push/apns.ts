import { PushMessage, PushProvider } from './types.ts';

/**
 * APNs over HTTP/2 using token-based auth (.p8 key).
 * Env:
 *   APNS_KEY_ID, APNS_TEAM_ID  — from the Apple key
 *   APNS_PRIVATE_KEY           — contents of the .p8 (ES256)
 *   APNS_BUNDLE_ID             — your app's bundle id (apns-topic)
 *   APNS_HOST                  — api.push.apple.com (prod) or api.sandbox.push.apple.com (dev)
 */
let cachedJwt: { token: string; exp: number } | null = null;

async function providerJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && cachedJwt.exp > now + 60) return cachedJwt.token;

  const keyId = req('APNS_KEY_ID');
  const teamId = req('APNS_TEAM_ID');
  const header = { alg: 'ES256', kid: keyId };
  const claim = { iss: teamId, iat: now };

  const enc = (o: unknown) =>
    b64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = `${enc(header)}.${enc(claim)}`;

  const key = await importEs256(req('APNS_PRIVATE_KEY'));
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsigned),
  );
  const token = `${unsigned}.${b64url(new Uint8Array(sig))}`;
  cachedJwt = { token, exp: now + 3000 }; // Apple allows up to ~1h reuse
  return token;
}

function req(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`${name} not set`);
  return v;
}

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function importEs256(pem: string): Promise<CryptoKey> {
  const body = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

export const apnsProvider: PushProvider = {
  async send(token: string, msg: PushMessage) {
    const host = Deno.env.get('APNS_HOST') ?? 'api.push.apple.com';
    const jwt = await providerJwt();
    const res = await fetch(`https://${host}/3/device/${token}`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${jwt}`,
        'apns-topic': req('APNS_BUNDLE_ID'),
        'apns-push-type': 'alert',
      },
      body: JSON.stringify({
        aps: { alert: { title: msg.title, body: msg.body }, sound: 'default' },
        ...(msg.data ?? {}),
      }),
    });
    if (!res.ok) throw new Error(`APNs send failed: ${res.status} ${await res.text()}`);
  },
};
