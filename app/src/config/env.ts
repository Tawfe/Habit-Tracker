import Config from 'react-native-config';

/**
 * Centralised, typed access to build-time env vars.
 * Values come from `.env` via react-native-config (see .env.example).
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required env var "${name}". Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required('SUPABASE_URL', Config.SUPABASE_URL),
  supabaseAnonKey: required('SUPABASE_ANON_KEY', Config.SUPABASE_ANON_KEY),
};
