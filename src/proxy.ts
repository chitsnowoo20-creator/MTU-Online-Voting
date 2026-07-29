import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next 16 renamed the `middleware` file convention to `proxy`. Same execution
 * point, and it now defaults to the Node.js runtime — do not add a `runtime`
 * segment config here, it throws.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. Without a matcher this
     * would run on `_next/static` too and could block CSS and JS from loading.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
