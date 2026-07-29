import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/db/database.types";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Runs under the anon key, so every read is filtered by RLS and a query bug
 * cannot over-fetch past the policy (ARCHITECTURE §2). Writes that touch
 * anything privileged go through an RPC, not through this client's table
 * builders — reads through RLS, writes through RPC.
 *
 * `cookies()` is async in Next 16, so this factory is async too.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. That is fine: proxy.ts
          // refreshes the session on every request, so the write here is only
          // ever a nice-to-have.
        }
      },
    },
  });
}

/**
 * The authenticated user, or null.
 *
 * Always `getUser()`, never `getSession()`, on the server: `getUser()`
 * revalidates the token with Supabase Auth, while `getSession()` trusts a
 * cookie the browser could have tampered with.
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
