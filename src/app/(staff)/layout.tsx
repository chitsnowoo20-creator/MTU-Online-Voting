import type { ReactNode } from "react";

import { AppFrame } from "@/components/nav/app-frame";

/** Reviewer, officer and admin screens share the chrome with the voter side —
 * only the rail's item set differs. */
export default function StaffLayout({ children }: { children: ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
