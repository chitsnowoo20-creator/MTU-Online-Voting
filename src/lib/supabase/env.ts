/**
 * The two values every Supabase client needs.
 *
 * Only `NEXT_PUBLIC_*` vars appear here, and deliberately so — the anon key is
 * meant to reach the browser, where RLS is what protects the data. The
 * service-role key is not read anywhere in this codebase (AGENTS.md invariant
 * 4); if a future task genuinely needs it, it goes in its own server-only
 * module with a comment explaining why RLS was not enough.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill it in from ` +
        `your Supabase project settings (Project Settings → API).`,
    );
  }
  return value;
}

export const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_ANON_KEY = required(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
