# Deploy — Android (Google Play)

## Prerequisites
- **Google Play Developer account** ($25 one-time).
- A **Firebase project** with an Android app + `google-services.json`.
- JDK 17, Android SDK.

## One-time setup
1. `google-services.json` → `app/android/app/`.
2. Gradle wiring (see PUSH-NOTIFICATIONS.md):
   - root `build.gradle`: `classpath 'com.google.gms:google-services:4.4.2'`
   - app `build.gradle`: `apply plugin: 'com.google.gms.google-services'`
3. **Release signing key**:
   ```bash
   keytool -genkeypair -v -keystore release.keystore \
     -alias habittracker -keyalg RSA -keysize 2048 -validity 10000
   ```
   Store it in `android/app/` (do NOT commit) and reference it in
   `android/gradle.properties` / `signingConfigs`. Prefer **Play App Signing**:
   upload an upload key, Google manages the app signing key.

## Build the App Bundle
```bash
cd app/android
./gradlew bundleRelease
# output: app/build/outputs/bundle/release/app-release.aab
```

## Play Console
- Create the app, fill the store listing (title, short/full description,
  screenshots, feature graphic, icon).
- **Data safety form** — declare email, habit content, push token; data sharing
  = none (unless you add analytics).
- **Privacy policy URL** (required).
- **Content rating** questionnaire.
- **Account deletion** — provide an in-app + web deletion path (Play policy).

## Testing tracks & the 14-day rule
> Personal developer accounts created after ~Nov 2023 must run **closed testing
> with at least 12 testers for 14 continuous days** before unlocking production.
> Plan for this — set up the closed track early. Company accounts are exempt.

Order: internal testing → closed testing (12+ testers, 14 days) → production.

## Notes
- Target the latest required `targetSdkVersion` (Play enforces a floor each year).
- Test on a device **without** Google Play Services too (to confirm your app
  degrades gracefully — those users are your Huawei/HMS path).
