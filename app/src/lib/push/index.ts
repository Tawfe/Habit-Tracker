import { Platform } from 'react-native';
import { detectEcosystem, PushEcosystem } from './ecosystem';
import { supabase } from '../supabase';

export type { PushEcosystem } from './ecosystem';

/**
 * Acquire the device push token for whichever ecosystem this device uses.
 *  - fcm / apns: react-native-firebase (Firebase delivers APNs tokens on iOS too)
 *  - hms:        @hmscore/react-native-hms-push (Huawei flavor only)
 */
async function getTokenFor(ecosystem: PushEcosystem): Promise<string> {
  if (ecosystem === 'fcm' || ecosystem === 'apns') {
    const messaging = require('@react-native-firebase/messaging').default;
    await messaging().requestPermission();
    return messaging().getToken();
  }

  // ecosystem === 'hms'
  const { HmsPushInstanceId } = require('@hmscore/react-native-hms-push');
  const result = await HmsPushInstanceId.getToken('');
  // HMS returns the token via an event in some versions; this covers the
  // synchronous shape. See docs/DEPLOY-HUAWEI.md for the listener variant.
  return result?.result ?? result;
}

/**
 * Register (or refresh) this device with the backend so the server can route
 * "missed check-in" pushes to it. Idempotent on (user, token).
 */
export async function registerDeviceForPush(): Promise<void> {
  const ecosystem = await detectEcosystem();
  const token = await getTokenFor(ecosystem);

  const platform =
    Platform.OS === 'ios' ? 'ios' : ecosystem === 'hms' ? 'huawei' : 'android';

  const { error } = await supabase.functions.invoke('register-device', {
    body: { token, ecosystem, platform },
  });
  if (error) {
    throw error;
  }
}

/**
 * Subscribe to token refreshes so we never hold a stale token.
 * Call once at app start (after auth). Returns an unsubscribe fn.
 */
export function onTokenRefresh(callback: () => void): () => void {
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    return messaging().onTokenRefresh(() => callback());
  } catch {
    // HMS refresh arrives via a native event listener; wire it in the
    // Huawei flavor. No-op here keeps the default build clean.
    return () => {};
  }
}
