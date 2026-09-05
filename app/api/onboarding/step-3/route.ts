import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import {
  PENDING_CHECKOUT_COOKIE,
  parsePendingCheckout,
  pendingCheckoutRedirectPath,
} from "@/lib/auth/pending-checkout";
import { cookies } from "next/headers";
import { ONBOARDING_EXAMPLE_OUVRAGES } from "@/lib/onboarding/example-ouvrages";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type Body = { mode?: "examples" | "skip" };

export async function POST(req: Request) {
  let raw: Body;
  try {
    raw = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }

  const mode = raw.mode ?? "skip";

  try {
    await backendFetch("/api/auth/me");

    if (mode === "examples") {
      for (const o of ONBOARDING_EXAMPLE_OUVRAGES) {
        await backendFetch("/api/ouvrages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...o, tags: [...o.tags] }),
        });
      }
    }

    await backendFetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        onboarding_step: 3,
        onboarding_complete: true,
      }),
    });

    revalidatePath("/onboarding");
    revalidatePath("/accueil");

    const cookieStore = await cookies();
    const pending = parsePendingCheckout(cookieStore.get(PENDING_CHECKOUT_COOKIE)?.value);
    const checkoutRedirect = pendingCheckoutRedirectPath(pending);
    if (checkoutRedirect) {
      cookieStore.delete(PENDING_CHECKOUT_COOKIE);
    }

    return NextResponse.json({ redirect: checkoutRedirect ?? "/accueil" });
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
