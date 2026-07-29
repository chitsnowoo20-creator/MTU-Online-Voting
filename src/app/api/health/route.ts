import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Connection smoke check. Reads `departments`, which is the one table anyone
 * may read under RLS — so a 200 here proves the URL, the anon key, the
 * migrations and the policies all line up.
 *
 * Temporary scaffolding: delete once real pages are reading data.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("departments")
      .select("code, name")
      .eq("active", true)
      .order("code");

    if (error) {
      return NextResponse.json(
        { ok: false, stage: "query", message: error.message, hint: error.hint },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, departments: data });
  } catch (cause) {
    return NextResponse.json(
      {
        ok: false,
        stage: "config",
        message: cause instanceof Error ? cause.message : String(cause),
      },
      { status: 500 },
    );
  }
}
