"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import type { Database } from "@/lib/db/database.types";
import { createClient } from "@/lib/supabase/server";
import { electionSchema } from "@/lib/validation/election";

type ElectionState = Database["public"]["Enums"]["election_state"];

export type ElectionFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function collectFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function readForm(formData: FormData) {
  return {
    name: formData.get("name")?.toString() ?? "",
    opensAt: formData.get("opensAt")?.toString() ?? "",
    closesAt: formData.get("closesAt")?.toString() ?? "",
    verificationDeadline:
      formData.get("verificationDeadline")?.toString() ?? "",
  };
}

export async function createElection(
  _prev: ElectionFormState,
  formData: FormData,
): Promise<ElectionFormState> {
  const user = await requireRole(["ELECTION_OFFICER"], "/elections");
  const parsed = electionSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { fieldErrors: collectFieldErrors(parsed.error.issues) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("elections")
    .insert({
      name: parsed.data.name,
      opens_at: parsed.data.opensAt || null,
      closes_at: parsed.data.closesAt || null,
      verification_deadline: parsed.data.verificationDeadline || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/elections");
  redirect(`/elections/${data.id}`);
}

export async function updateElection(
  _prev: ElectionFormState,
  formData: FormData,
): Promise<ElectionFormState> {
  await requireRole(["ELECTION_OFFICER"], "/elections");
  const id = formData.get("id")?.toString() ?? "";
  const parsed = electionSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { fieldErrors: collectFieldErrors(parsed.error.issues) };
  }

  const supabase = await createClient();
  /*
   * `state` is absent here on purpose — it has no UPDATE grant at all, so the
   * lifecycle can only move through transition_election(). Adding it to this
   * object would fail at the database, which is the point.
   */
  const { error } = await supabase
    .from("elections")
    .update({
      name: parsed.data.name,
      opens_at: parsed.data.opensAt || null,
      closes_at: parsed.data.closesAt || null,
      verification_deadline: parsed.data.verificationDeadline || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/elections");
  revalidatePath(`/elections/${id}`);
  redirect(`/elections/${id}`);
}

export type TransitionState = { error?: string };

export async function transitionElection(
  _prev: TransitionState,
  formData: FormData,
): Promise<TransitionState> {
  await requireRole(["ELECTION_OFFICER"], "/elections");

  const id = formData.get("id")?.toString() ?? "";
  const to = formData.get("to")?.toString() as ElectionState;
  const note = formData.get("note")?.toString() || undefined;

  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_election", {
    p_election_id: id,
    p_to: to,
    p_note: note,
  });

  if (error) return { error: error.message };

  revalidatePath("/elections");
  revalidatePath(`/elections/${id}`);
  return {};
}
