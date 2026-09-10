import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Returns true if real Supabase environment variables are configured.
 */
export function isSupabaseConfigured(): boolean {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl?.includes("your-project-ref") &&
    !supabaseAnonKey?.includes("your-anon-key")
  );
}

/**
 * Browser-side Supabase client.
 */
export function createClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return createBrowserClient(
    supabaseUrl as string,
    supabaseAnonKey as string
  );
}
