/**
 * Native autolinking config.
 *
 * Firebase (push) is DISABLED for now so the app builds clean while push is a
 * placeholder. The JS still imports fine; the native module is simply absent,
 * and src/lib/push catches that and no-ops.
 *
 * When you're ready to wire push (see docs/PUSH-NOTIFICATIONS.md): delete the
 * two firebase entries below, add google-services.json / GoogleService-Info.plist,
 * add `use_modular_headers!` to ios/Podfile, then re-run pod install.
 */
module.exports = {
  dependencies: {
    '@react-native-firebase/app': {
      platforms: { ios: null, android: null },
    },
    '@react-native-firebase/messaging': {
      platforms: { ios: null, android: null },
    },
  },
};
