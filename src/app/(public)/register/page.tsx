import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "./register-form";
import { AuthShell } from "@/components/ui/auth-shell";
import { getCurrentUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Create account · Campus Elections" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/account");

  return (
    <AuthShell
      title="Create account"
      intro="Any email address works. You'll confirm it next."
      footer={
        <>
          Already registered? <Link href="/login">Sign in</Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
