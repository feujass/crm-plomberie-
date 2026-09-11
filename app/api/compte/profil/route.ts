import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { extractLogosStoragePath, logoUrlValidationError, toStorageRef } from "@/lib/security/logo-url";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

function revalidateCompteAll() {
  revalidatePath("/compte");
  revalidatePath("/compte/profil");
  revalidatePath("/compte/entreprise");
  revalidatePath("/compte/devis-apparence");
  revalidatePath("/compte/devis-regles");
  revalidatePath("/accueil");
}

type Body = { prenom?: string; nom?: string; tel?: string; avatar_url?: string | null };

export async function POST(req: Request) {
  let raw: Body;
  try {
    raw = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }

  try {
    const avatarRaw = String(raw.avatar_url ?? "").trim() || null;
    const avatarErr = logoUrlValidationError(avatarRaw);
    if (avatarErr) {
      return NextResponse.json({ message: avatarErr }, { status: 400 });
    }
    const avatarPath = avatarRaw ? extractLogosStoragePath(avatarRaw) : null;
    const avatar_url = avatarPath ? toStorageRef(avatarPath) : avatarRaw;

    await backendFetch("/api/auth/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prenom: String(raw.prenom || "").trim(),
        nom: String(raw.nom || "").trim(),
      }),
    });
    await backendFetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tel: String(raw.tel || "").trim() || null,
        avatar_url,
      }),
    });
    revalidateCompteAll();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = err as BackendFetchError;
    const http = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
    return NextResponse.json({ message: e.message ?? "Erreur" }, { status: http });
  }
}
