# Deploy — iOS (App Store)

## Prerequisites
- **Apple Developer Program** membership ($99/year).
- A **Mac** with Xcode (or a cloud Mac / CI with macOS). iOS cannot be built on Linux.
- CocoaPods (`bundle exec pod install --project-directory=ios`).

## One-time setup
1. **App ID / Bundle ID**: register `com.yourco.habittracker` in the Apple
   Developer portal. Enable the **Push Notifications** capability.
2. **APNs Auth Key**: Keys → create an **APNs key (.p8)**. Note the Key ID and
   your Team ID. Put the key contents in the backend `APNS_PRIVATE_KEY` secret.
3. **Signing**: in Xcode, set the team; let Xcode manage signing for dev.
   For release create a Distribution certificate + App Store provisioning profile.
4. **Capabilities** (Xcode → Signing & Capabilities):
   - Push Notifications
   - Background Modes → Remote notifications

## Build & upload
```bash
cd app
bundle install
bundle exec pod install --project-directory=ios
# Open ios/HabitTracker.xcworkspace in Xcode
# Product → Archive → Distribute App → App Store Connect
```
Or automate with Fastlane (`fastlane pilot upload`) / EAS.

## App Store Connect listing
- App name, subtitle, description, keywords.
- **Screenshots** for required device sizes (6.7", 6.5", 5.5", iPad if supported).
- **Privacy nutrition labels** — declare: account (email), user content (habits),
  identifiers (push token). Be accurate.
- **Privacy policy URL** (required).
- **App privacy: account deletion** — Apple requires an in-app path to delete
  the account. Implement it (calls a `delete-account` function).
- **Sign in** demo account for the reviewer (matching apps are reviewed by hand).

## Review gotchas for a partner-matching app
- Must have a way to **report/block** another user and **filter objectionable
  content** if any user-to-user text exists (Guideline 1.2).
- Notifications must not be required for core function and must be permission-gated.
- Don't request notification permission on first launch with no context.

## Releasing
- TestFlight for beta (internal + external testers).
- Submit for review; expect 1–3 days. Phased release optional.
