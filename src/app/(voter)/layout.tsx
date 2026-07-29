import type { ReactNode } from "react";

import { AppFrame } from "@/components/nav/app-frame";

/** Every voter screen wears the signed-in chrome. */
export default function VoterLayout({ children }: { children: ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
