import { supabase } from '../../lib/supabase';

export type Partnership = {
  id: string;
  user_a: string;
  user_b: string;
  status: 'pending' | 'active' | 'ended';
  created_at: string;
};

/** Current active or pending partnership for the signed-in user, if any. */
export async function getMyPartnership(): Promise<Partnership | null> {
  const { data, error } = await supabase
    .from('partnerships')
    .select('*')
    .in('status', ['pending', 'active'])
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Join the matchmaking queue. A backend function (or DB trigger) pairs two
 * waiting users and creates a `partnerships` row. See backend/README.md.
 */
export async function joinMatchQueue(): Promise<void> {
  const { error } = await supabase.functions.invoke('join-match-queue', {
    body: {},
  });
  if (error) throw error;
}

export async function respondToPartnership(
  partnershipId: string,
  accept: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('partnerships')
    .update({ status: accept ? 'active' : 'ended' })
    .eq('id', partnershipId);
  if (error) throw error;
}

export async function endPartnership(partnershipId: string): Promise<void> {
  const { error } = await supabase
    .from('partnerships')
    .update({ status: 'ended' })
    .eq('id', partnershipId);
  if (error) throw error;
}
