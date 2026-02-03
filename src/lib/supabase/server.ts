import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Using untyped client to bypass Supabase type generation issues
// Types should be regenerated with `supabase gen types typescript` when database schema changes
export function createServerClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (url: RequestInfo | URL, options: RequestInit = {}) => {
        return fetch(url, { ...options, cache: 'no-store' as RequestCache });
      },
    },
  });
}

// Alias for backwards compatibility
export const createUntypedServerClient = createServerClient;
