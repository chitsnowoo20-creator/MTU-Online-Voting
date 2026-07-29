import type { ReactNode } from "react";

import { AppFrame } from "@/components/nav/app-frame";

/**
 * Results are public, so this is the one route that renders both ways: signed
 * in it keeps the rail (it is an item on every role's rail), signed out it is
 * a bare page reached from the landing header.
 */
export default function ResultsLayout({ children }: { children: ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
