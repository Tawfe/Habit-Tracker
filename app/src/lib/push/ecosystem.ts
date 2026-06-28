import { Platform, NativeModules } from 'react-native';

/**
 * A device belongs to exactly one push ecosystem:
 *  - apns: every iOS device
 *  - fcm:  Android devices WITH Google Mobile Services (most phones)
 *  - hms:  Huawei devices WITHOUT Google Mobile Services (post-2019 Huawei)
 *
 * The backend stores this so it knows which provider API to call.
 */
export type PushEcosystem = 'apns' | 'fcm' | 'hms';

/**
 * Is the Firebase native module linked? (Drives APNs token on iOS + FCM on
 * Android.) Returns false while push is a placeholder — see react-native.config.js.
 */
export function hasFirebase(): boolean {
  return Boolean(NativeModules.RNFBAppModule);
}

/** Is HMS Core (Huawei) present? Only in the Huawei flavor. */
export function hasHms(): boolean {
  return Boolean(NativeModules.HmsInstanceModule || NativeModules.HMSPush);
}

/**
 * Detect this device's push ecosystem, or null if no push provider is wired up
 * yet (so callers can no-op cleanly instead of crashing).
 */
export async function detectEcosystem(): Promise<PushEcosystem | null> {
  if (Platform.OS === 'ios') {
    return hasFirebase() ? 'apns' : null;
  }
  // Android: Firebase present → FCM. Otherwise fall back to HMS on Huawei.
  // (Refine FCM-vs-HMS with a real Google Play Services check when you ship
  //  the Huawei flavor — see docs/DEPLOY-HUAWEI.md.)
  if (hasFirebase()) {
    return 'fcm';
  }
  if (hasHms()) {
    return 'hms';
  }
  return null;
}
