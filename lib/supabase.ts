import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client — used in client components
export const supabase = createClient(url, anon);

// Server client — used in server components / route handlers
export function createServerClient() {
  return createClient(url, anon);
}
