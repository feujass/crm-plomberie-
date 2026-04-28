import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifié" }, { status: 401 });

  const { data: rows } = await supabase
    .from("factures")
    .select("numero, statut, date_emission, date_echeance, total_ht, total_tva, total_ttc")
    .eq("user_id", user.id)
    .order("date_emission", { ascending: false });

  const header = ["numero", "statut", "date_emission", "date_echeance", "total_ht", "total_tva", "total_ttc"];
  const lines = [header.join(";")];
  for (const r of rows ?? []) {
    lines.push(
      [r.numero, r.statut, r.date_emission, r.date_echeance ?? "", r.total_ht, r.total_tva, r.total_ttc].join(";")
    );
  }

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="factures.csv"',
    },
  });
}
