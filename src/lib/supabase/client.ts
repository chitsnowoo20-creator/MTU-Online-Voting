import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/db/database.types";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Supabase client for Client Components.
 *
 * Holds nothing secret — the anon key is public by design and RLS is the guard.
 * Use it for interactivity (sign-in forms, uploads, realtime); anything that
 * decides eligibility or writes privileged data belongs in a Server Action
 * calling an RPC, because a client-side check is assumed bypassable
 * (AGENTS.md invariant 10).
 */
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
