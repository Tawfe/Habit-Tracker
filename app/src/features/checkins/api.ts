import { supabase } from '../../lib/supabase';
import { localDay } from './date';

export { localDay };

export type CheckIn = {
  id: string;
  user_id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD in the user's local day
  completed_at: string;
};

export async function listCheckInsForDay(date = localDay()): Promise<CheckIn[]> {
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('date', date);
  if (error) throw error;
  return data ?? [];
}

/** Mark a habit complete for today. Unique (user, habit, date) -> idempotent. */
export async function checkIn(habitId: string, date = localDay()): Promise<void> {
  const { error } = await supabase
    .from('checkins')
    .upsert(
      { habit_id: habitId, date, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,habit_id,date' },
    );
  if (error) throw error;
}

export async function undoCheckIn(habitId: string, date = localDay()): Promise<void> {
  const { error } = await supabase
    .from('checkins')
    .delete()
    .eq('habit_id', habitId)
    .eq('date', date);
  if (error) throw error;
}
