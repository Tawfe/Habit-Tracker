import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../store/auth';
import { registerDeviceForPush } from '../lib/push';

export function SettingsScreen() {
  const { session, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const enablePush = async () => {
    setBusy(true);
    try {
      await registerDeviceForPush();
      Alert.alert('Notifications on', "You'll be nudged about missed check-ins.");
    } catch (e: any) {
      Alert.alert('Could not enable push', e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.email}>{session?.user?.email}</Text>

      <Pressable style={styles.button} disabled={busy} onPress={enablePush}>
        <Text style={styles.buttonText}>Enable notifications</Text>
      </Pressable>

      <Pressable style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  email: { fontSize: 16, color: '#444', marginBottom: 8 },
  button: {
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  signOut: { padding: 14, alignItems: 'center' },
  signOutText: { color: '#ef4444', fontWeight: '500' },
});
