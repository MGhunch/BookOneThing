import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client — used in client components
export const supabase = createClient(url, anon);

// Server client — used in server components / route handlers (anon, respects RLS)
export function createServerClient() {
  return createClient(url, anon);
}

// Service client — used in server components / route handlers that need to bypass RLS
// for public reads (e.g. resolving owner slugs on public calendar pages).
// Never expose this key to the browser.
export function createServiceClient() {
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

