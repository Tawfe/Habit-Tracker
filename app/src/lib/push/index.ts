import { Platform } from 'react-native';
import { detectEcosystem, hasFirebase, PushEcosystem } from './ecosystem';
import { supabase } from '../supabase';

export type { PushEcosystem } from './ecosystem';

/**
 * Acquire the device push token for whichever ecosystem this device uses.
 * Callers must only invoke this for an ecosystem whose native module exists
 * (detectEcosystem guarantees that), so the requires below never load a
 * native-less module.
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
  return result?.result ?? result;
}

/**
 * Register (or refresh) this device with the backend so the server can route
 * "missed check-in" pushes to it. No-ops cleanly if no push provider is wired
 * up yet (push is a placeholder until Firebase/HMS are configured).
 */
export async function registerDeviceForPush(): Promise<void> {
  const ecosystem = await detectEcosystem();
  if (!ecosystem) {
    return; // push not configured on this build — nothing to do
  }

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
 * No-ops when Firebase isn't linked. Returns an unsubscribe fn.
 */
export function onTokenRefresh(callback: () => void): () => void {
  if (!hasFirebase()) {
    return () => {};
  }
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    return messaging().onTokenRefresh(() => callback());
  } catch {
    return () => {};
  }
}
