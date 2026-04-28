import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
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
    return NextResponse.json({ redirect: "/accueil" });
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
