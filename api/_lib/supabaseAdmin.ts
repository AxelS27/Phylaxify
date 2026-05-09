import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client. Uses the secret key, which bypasses RLS.
// MUST only be imported from /api functions, never from /src.

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url) {
  throw new Error('Missing SUPABASE_URL / VITE_SUPABASE_URL env var.');
}
if (!secret) {
  throw new Error('Missing SUPABASE_SECRET_KEY env var.');
}

export const supabaseAdmin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
