import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { assertCatalogueAllowed, loadSubscriptionContext } from "@/lib/plans/subscription-context";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/** Variante « exemples par défaut » — sans Server Action (évite E394). */
export async function POST() {
  try {
    const ctx = await loadSubscriptionContext();
    const blocked = assertCatalogueAllowed(ctx, 3);
    if (blocked) {
      return NextResponse.json({ message: blocked }, { status: 403 });
    }

    await backendFetch("/api/ouvrages/seed-defaults", { method: "POST" });
    revalidatePath("/catalogue");
    return NextResponse.json({ redirect: "/catalogue" });
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
