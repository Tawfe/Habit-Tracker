import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import {
  Partnership,
  getMyPartnership,
  joinMatchQueue,
  respondToPartnership,
  endPartnership,
} from '../features/partners/api';

export function PartnerScreen() {
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setPartnership(await getMyPartnership());
    } catch (e: any) {
      Alert.alert('Error', e.message ?? String(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const findPartner = async () => {
    setBusy(true);
    try {
      const result = await joinMatchQueue();
      if (result.status === 'queued') {
        Alert.alert(
          "You're in the queue",
          "We'll pair you with a partner as soon as someone else is waiting. Check back here.",
        );
      }
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!partnership) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No partner yet</Text>
        <Text style={styles.body}>
          Get matched with an accountability partner. You'll check in on each
          other every day.
        </Text>
        <Pressable
          style={styles.button}
          disabled={busy}
          onPress={findPartner}>
          <Text style={styles.buttonText}>Find me a partner</Text>
        </Pressable>
      </View>
    );
  }

  if (partnership.status === 'pending') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Match found!</Text>
        <Text style={styles.body}>Accept to start keeping each other honest.</Text>
        <Pressable
          style={styles.button}
          disabled={busy}
          onPress={() => run(() => respondToPartnership(partnership.id, true))}>
          <Text style={styles.buttonText}>Accept</Text>
        </Pressable>
        <Pressable
          style={styles.secondary}
          disabled={busy}
          onPress={() => run(() => respondToPartnership(partnership.id, false))}>
          <Text style={styles.secondaryText}>Decline</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>You have a partner 🎉</Text>
      <Text style={styles.body}>
        You'll get a nudge if your partner misses a daily check-in — and they'll
        get one if you do.
      </Text>
      <Pressable
        style={styles.secondary}
        disabled={busy}
        onPress={() => run(() => endPartnership(partnership.id))}>
        <Text style={styles.secondaryText}>End partnership</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  body: { textAlign: 'center', color: '#666', marginBottom: 12 },
  button: {
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  secondary: { padding: 14, alignItems: 'center' },
  secondaryText: { color: '#ef4444', fontWeight: '500' },
});
