import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// Strict server-only guard
if (typeof window !== 'undefined') {
  throw new Error('src/lib/supabase/admin.ts cannot be loaded in a client environment.');
}

if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = ws;
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

