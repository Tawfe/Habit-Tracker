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
 * Detect whether Google Play Services is usable on this Android device.
 * @react-native-firebase exposes this, but we keep detection isolated so the
 * Huawei flavor (which may not bundle Firebase) can override it.
 */
async function androidHasGooglePlayServices(): Promise<boolean> {
  try {
    // react-native-firebase reports GMS availability.
    // Lazy require so a Huawei-only build that omits Firebase still compiles.
    const messaging = require('@react-native-firebase/messaging').default;
    // hasPermission throws/!available when GMS is missing on Huawei.
    await messaging().getToken();
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether HMS Core (Huawei) is present. The HMS module is only linked in the
 * `huawei` product flavor, so a normal build returns false immediately.
 */
function hasHms(): boolean {
  return Boolean(NativeModules.HmsInstanceModule || NativeModules.HMSPush);
}

export async function detectEcosystem(): Promise<PushEcosystem> {
  if (Platform.OS === 'ios') {
    return 'apns';
  }
  // Android: prefer GMS/FCM; fall back to HMS on Huawei devices.
  if (await androidHasGooglePlayServices()) {
    return 'fcm';
  }
  if (hasHms()) {
    return 'hms';
  }
  // No usable push provider (rare). Caller should degrade gracefully.
  throw new Error('No supported push ecosystem on this device (no GMS, no HMS).');
}
