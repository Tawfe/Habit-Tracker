import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './navigation/RootNavigator';
import { useAuth } from './store/auth';
import { onTokenRefresh, registerDeviceForPush } from './lib/push';

export default function App() {
  const isDark = useColorScheme() === 'dark';
  const init = useAuth((s) => s.init);
  const session = useAuth((s) => s.session);

  useEffect(() => {
    init();
  }, [init]);

  // Keep the device's push token registered & fresh while signed in.
  useEffect(() => {
    if (!session) return;
    registerDeviceForPush().catch(() => {
      /* user can retry from Settings */
    });
    const unsub = onTokenRefresh(() => {
      registerDeviceForPush().catch(() => {});
    });
    return unsub;
  }, [session]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
