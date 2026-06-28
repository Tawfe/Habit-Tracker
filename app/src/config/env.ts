import Config from 'react-native-config';
import { CREDENTIALS } from './credentials';

/**
 * Centralised, typed access to config.
 * Prefers react-native-config (.env, Android) and falls back to
 * src/config/credentials.ts (the simple cross-platform path used by iOS).
 */
function resolve(name: string, fromEnv: string | undefined, fromFile: string): string {
  const value = fromEnv || fromFile;
  if (!value) {
    throw new Error(
      `Missing ${name}. Fill it into app/src/config/credentials.ts ` +
        `(or app/.env on Android).`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: resolve('SUPABASE_URL', Config.SUPABASE_URL, CREDENTIALS.supabaseUrl),
  supabaseAnonKey: resolve(
    'SUPABASE_ANON_KEY',
    Config.SUPABASE_ANON_KEY,
    CREDENTIALS.supabaseAnonKey,
  ),
};
