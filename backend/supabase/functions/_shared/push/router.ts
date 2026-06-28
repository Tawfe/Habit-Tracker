import { Ecosystem, PushMessage, PushProvider } from './types.ts';
import { apnsProvider } from './apns.ts';
import { fcmProvider } from './fcm.ts';
import { hmsProvider } from './hms.ts';

const providers: Record<Ecosystem, PushProvider> = {
  apns: apnsProvider,
  fcm: fcmProvider,
  hms: hmsProvider,
};

/**
 * Route a message to the right provider for the device's ecosystem.
 * This is the server-side mirror of the app's ecosystem detection.
 */
export async function sendPush(
  ecosystem: Ecosystem,
  token: string,
  msg: PushMessage,
): Promise<void> {
  await providers[ecosystem].send(token, msg);
}
