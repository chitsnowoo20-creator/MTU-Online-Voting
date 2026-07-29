import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";
import { AuthShell } from "@/components/ui/auth-shell";
import { getCurrentUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Sign in · Campus Elections" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getCurrentUser()) redirect("/account");

  const { next } = await searchParams;

  return (
    <AuthShell
      title="Sign in"
      intro="Use the email address you registered with."
      footer={
        <>
          No account yet? <Link href="/register">Create one</Link>
        </>
      }
    >
      <LoginForm next={next?.startsWith("/") ? next : undefined} />
    </AuthShell>
  );
}
