import { createClient } from "@/lib/supabase/server";
import { devisIaResponseSchema } from "@/lib/schemas/devis-ia";
import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifié" }, { status: 401 });

  const body = (await req.json()) as { text?: string };
  if (!body.text?.trim()) return NextResponse.json({ message: "Texte requis" }, { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: ouvrages } = await supabase.from("ouvrages").select("nom, description, prix_ht, unite, tva, type").eq("user_id", user.id).limit(40);

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ message: "OPENAI_API_KEY non configurée" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const catalogue = JSON.stringify(ouvrages ?? [], null, 0);
  const system = `Tu es un assistant expert en plomberie. À partir de la description des travaux, génère un devis structuré en JSON avec la forme stricte:
{"lignes":[{"designation":"string","quantite":number,"unite":"string","prix_ht":number,"tva":number,"section":"string optionnel","ligne_type":"prestation"|"fourniture"|"pose"}]}
Utilise la bibliothèque d'ouvrages si pertinent. TVA par défaut=${profile?.tva_defaut ?? 10}%. Séparation fourniture/pose=${profile?.sep_fourniture_pose ? "oui" : "non"}. Structure=${profile?.structure_devis ?? "libre"}.
Ouvrages JSON: ${catalogue}`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    messages: [
      { role: "system", content: system },
      { role: "user", content: body.text },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return NextResponse.json({ message: "Réponse vide" }, { status: 500 });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 500 });
  }

  const z = devisIaResponseSchema.safeParse(parsed);
  if (!z.success) return NextResponse.json({ message: "Schéma invalide", details: z.error.flatten() }, { status: 422 });

  const lignes = z.data.lignes.map((l, i) => ({
    section: l.section ?? null,
    designation: l.designation,
    quantite: l.quantite,
    unite: l.unite,
    prix_ht: l.prix_ht,
    tva: l.tva,
    ordre: i,
    ligne_type: (l.ligne_type ?? "prestation") as "prestation" | "fourniture" | "pose",
  }));

  return NextResponse.json({ lignes });
}
