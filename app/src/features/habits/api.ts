import { supabase } from '../../lib/supabase';

export type Habit = {
  id: string;
  user_id: string;
  name: string;
  archived: boolean;
  created_at: string;
};

export async function listHabits(): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('archived', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createHabit(name: string): Promise<Habit> {
  const { data, error } = await supabase
    .from('habits')
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function archiveHabit(id: string): Promise<void> {
  const { error } = await supabase
    .from('habits')
    .update({ archived: true })
    .eq('id', id);
  if (error) throw error;
}
