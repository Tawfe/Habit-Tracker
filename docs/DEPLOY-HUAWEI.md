# Deploy — Huawei (AppGallery)

This is the most unfamiliar target. Huawei devices (post-2019) have **no Google
services**, so FCM, Google Maps, Google Sign-In, etc. won't work. You ship a
separate **product flavor** with HMS Core.

## Prerequisites
- **Huawei Developer account** — free, but requires **identity verification**
  (individual or enterprise). Verification can take a few days; enterprise needs
  business documents. Start this early.
- **AppGallery Connect (AGC)** project + app.

## Strategy: a `huawei` product flavor
Keep Google builds untouched. Add an Android flavor that includes HMS.

`app/android/app/build.gradle` (sketch):
```gradle
android {
  flavorDimensions += "store"
  productFlavors {
    gms   { dimension "store" }            // Play / FCM
    huawei { dimension "store"             // AppGallery / HMS
      applicationIdSuffix ""               // keep same appId or use a suffix
    }
  }
}
dependencies {
  huaweiImplementation 'com.huawei.hms:push:6.x.x'
}
```
Root `build.gradle`: add the Huawei maven repo
`https://developer.huawei.com/repo/` and the AGConnect plugin
`com.huawei.agconnect:agcp` (apply only in the huawei flavor).

## HMS Push Kit
1. AGC → your app → **Push Kit** → enable.
2. Download `agconnect-services.json` →
   `app/android/app/src/huawei/agconnect-services.json`.
3. `npm i @hmscore/react-native-hms-push`.
4. The app already routes to HMS when GMS is absent
   (`app/src/lib/push/ecosystem.ts` → `hms`). Token retrieval is in
   `app/src/lib/push/index.ts` (`getTokenFor('hms')`). Wire the native token
   event listener per the module's docs if `getToken` returns async.
5. Backend secrets: `HMS_APP_ID`, `HMS_APP_SECRET` (AGC → Project settings).

## Build & run
```bash
cd app
npm run android:hms          # react-native run-android --mode=hmsDebug
# release:
cd android && ./gradlew assembleHuaweiRelease   # or bundleHuaweiRelease
```

## AppGallery submission
- Create the app listing (name, description, screenshots, icon, category).
- Upload the **signed Huawei APK/AAB**.
- Provide a **privacy policy URL** and complete the data-collection declaration.
- App must pass Huawei's review (security scan + manual). Provide a test account.
- If you use any other HMS kits (Account, Maps, IAP), declare and integrate them
  in the huawei flavor only.

## Gotchas
- Don't ship the `huawei` flavor to Google Play or the `gms` flavor to
  AppGallery — keep the upload artifacts separate.
- Test on a real Huawei device (or Huawei Cloud Debugging in AGC) — emulators
  rarely have HMS Core.
- Background delivery: Huawei's aggressive battery management can throttle
  notifications; request the "ignore battery optimizations" exemption and use
  high-priority messages for the missed-checkin nudge.
