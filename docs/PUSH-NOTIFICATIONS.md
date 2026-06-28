# Push Notifications — three ecosystems

This is the hardest part of the app, because you support **Huawei**, which has
no Google Mobile Services. There is no single API that reaches all your users.

## The model

Every device belongs to exactly one ecosystem:

| Device | Ecosystem | Provider |
|---|---|---|
| iOS (any) | `apns` | Apple Push Notification service |
| Android with Google Play Services | `fcm` | Firebase Cloud Messaging (HTTP v1) |
| Huawei without GMS (post-2019) | `hms` | Huawei HMS Push Kit |

The app detects this at runtime (`app/src/lib/push/ecosystem.ts`) and registers
`(user_id, platform, ecosystem, push_token)` in the `devices` table via the
`register-device` Edge Function. When the backend needs to push, it looks up the
device's `ecosystem` and calls the matching provider
(`backend/supabase/functions/_shared/push/router.ts`).

```
app detects ecosystem ──► register-device ──► devices table
                                                   │
missed-checkin-sweep (cron) ──► router.ts ──► apns | fcm | hms
```

---

## iOS / Android setup (react-native-firebase)

Firebase Messaging handles **both** FCM (Android) and APNs token delivery (iOS).

1. Create a Firebase project. Add an iOS app and an Android app.
2. Download `GoogleService-Info.plist` → `app/ios/` (add to Xcode target).
3. Download `google-services.json` → `app/android/app/`.
4. Android native edits:
   - `android/build.gradle`: `classpath 'com.google.gms:google-services:4.4.2'`
   - `android/app/build.gradle`: `apply plugin: 'com.google.gms.google-services'`
5. iOS native edits:
   - Enable **Push Notifications** + **Background Modes → Remote notifications** capability in Xcode.
   - `pod install`.
6. APNs server key: in the Apple Developer portal create an **APNs Auth Key
   (.p8)**. You can either upload it to Firebase (let FCM proxy iOS) **or** call
   APNs directly with the `apns.ts` provider. This repo's backend calls APNs
   directly — set `APNS_*` secrets.

> Tip: if you'd rather have FCM deliver iOS too, upload the .p8 to Firebase and
> route iOS through `fcm.ts` instead of `apns.ts`. Fewer moving parts. The
> trade-off is one more third party in the iOS path.

---

## Huawei setup (HMS Push Kit)

Only built into the **`huawei` product flavor** so normal builds stay clean.

1. AppGallery Connect → create project + app → enable **Push Kit**.
2. Download `agconnect-services.json` → `app/android/app/src/huawei/`.
3. Add the HMS maven repo + AGConnect plugin to Gradle (huawei flavor only).
4. `npm i @hmscore/react-native-hms-push`.
5. Get the token via `HmsPushInstanceId.getToken('')` and the
   `RemoteMessageReceived` / token events. See `app/src/lib/push/index.ts`
   (`getTokenFor('hms')`) and `DEPLOY-HUAWEI.md`.
6. Backend secrets: `HMS_APP_ID`, `HMS_APP_SECRET`.

---

## Backend secrets

Set these as Supabase function secrets (`supabase secrets set KEY=value`):

```
# FCM
FCM_SERVICE_ACCOUNT   = <full service-account JSON, as one string>

# APNs
APNS_KEY_ID           = ABC123DEFG
APNS_TEAM_ID          = TEAMID1234
APNS_PRIVATE_KEY      = -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
APNS_BUNDLE_ID        = com.yourco.habittracker
APNS_HOST             = api.push.apple.com           # api.sandbox.push.apple.com for dev

# HMS
HMS_APP_ID            = 1234567890
HMS_APP_SECRET        = <app secret>

# Cron auth
CRON_SECRET           = <random long string>
```

---

## Testing the round-trip

1. Run the app, sign in, tap **Enable notifications** (Settings).
2. Confirm a row appears in `devices` with the expected `ecosystem`.
3. Invoke the sweep manually:
   ```bash
   curl -X POST "$SUPABASE_URL/functions/v1/missed-checkin-sweep" \
     -H "x-cron-secret: $CRON_SECRET"
   ```
4. To force a "miss": ensure a partnered test user has ≥1 habit and no checkin
   today, and that their local time is past `NAG_HOUR_LOCAL` (20:00). Temporarily
   lower that constant while testing.
