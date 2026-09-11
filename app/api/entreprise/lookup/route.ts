import { lookupEntrepriseBySiret } from "@/lib/entreprise/recherche-entreprises";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const siret = url.searchParams.get("siret")?.trim() ?? "";
  if (!siret) {
    return NextResponse.json({ message: "SIRET requis" }, { status: 400 });
  }

  const result = await lookupEntrepriseBySiret(siret);
  if (!result) {
    return NextResponse.json({ message: "Entreprise introuvable" }, { status: 404 });
  }

  return NextResponse.json(result);
}
