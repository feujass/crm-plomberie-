import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifié" }, { status: 401 });

  const [profile, clients, ouvrages, devis, chantiers, factures] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("clients").select("*").eq("user_id", user.id),
    supabase.from("ouvrages").select("*").eq("user_id", user.id),
    supabase.from("devis").select("*, devis_lignes(*)").eq("user_id", user.id),
    supabase.from("chantiers").select("*").eq("user_id", user.id),
    supabase.from("factures").select("*, facture_lignes(*), paiements(*)").eq("user_id", user.id),
  ]);

  const json = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      profile: profile.data,
      clients: clients.data,
      ouvrages: ouvrages.data,
      devis: devis.data,
      chantiers: chantiers.data,
      factures: factures.data,
    },
    null,
    2
  );

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="flowo-export.json"',
    },
  });
}
