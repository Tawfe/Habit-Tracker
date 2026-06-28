import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { Habit, listHabits, createHabit } from '../features/habits/api';
import {
  CheckIn,
  checkIn,
  undoCheckIn,
  listCheckInsForDay,
} from '../features/checkins/api';

export function TodayScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [newHabit, setNewHabit] = useState('');

  const load = useCallback(async () => {
    try {
      const [h, c] = await Promise.all([listHabits(), listCheckInsForDay()]);
      setHabits(h);
      setDone(new Set(c.map((x: CheckIn) => x.habit_id)));
    } catch (e: any) {
      Alert.alert('Error', e.message ?? String(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (habit: Habit) => {
    const isDone = done.has(habit.id);
    // optimistic
    setDone((prev) => {
      const next = new Set(prev);
      isDone ? next.delete(habit.id) : next.add(habit.id);
      return next;
    });
    try {
      isDone ? await undoCheckIn(habit.id) : await checkIn(habit.id);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? String(e));
      load();
    }
  };

  const add = async () => {
    const name = newHabit.trim();
    if (!name) return;
    setNewHabit('');
    try {
      await createHabit(name);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? String(e));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a habit…"
          value={newHabit}
          onChangeText={setNewHabit}
          onSubmitEditing={add}
        />
        <Pressable style={styles.addBtn} onPress={add}>
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>

      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        ListEmptyComponent={
          <Text style={styles.empty}>No habits yet. Add one above.</Text>
        }
        renderItem={({ item }) => {
          const isDone = done.has(item.id);
          return (
            <Pressable style={styles.row} onPress={() => toggle(item)}>
              <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                {isDone && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.habitName, isDone && styles.habitDone]}>
                {item.name}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
  },
  addBtn: {
    width: 48,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 24, lineHeight: 28 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: '#4f46e5' },
  checkmark: { color: '#fff', fontWeight: '700' },
  habitName: { fontSize: 16 },
  habitDone: { textDecorationLine: 'line-through', color: '#999' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
});
