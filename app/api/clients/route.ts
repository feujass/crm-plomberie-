import { backendFetch } from "@/lib/backend/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }

  const input = (body ?? {}) as Partial<{
    nom: string;
    prenom: string;
    email: string;
    tel: string;
    adresse: string;
    type: string;
  }>;

  const nom = String(input.nom ?? "").trim();
  if (!nom) return NextResponse.json({ message: "Nom requis" }, { status: 400 });

  try {
    const created = await backendFetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom,
        prenom: String(input.prenom ?? ""),
        email: String(input.email ?? ""),
        tel: String(input.tel ?? ""),
        adresse: String(input.adresse ?? ""),
        type: String(input.type ?? "particulier"),
      }),
    });
    return NextResponse.json(created);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur backend";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
