import { createClientFromRequest } from "@/lib/supabase/server-from-request";
import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifié" }, { status: 401 });

  const body = (await req.json()) as { messages?: { role: "user" | "assistant" | "system"; content: string }[] };
  if (!body.messages?.length) return NextResponse.json({ message: "messages requis" }, { status: 400 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ message: "OPENAI_API_KEY manquant" }, { status: 500 });
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: ouvrages } = await supabase.from("ouvrages").select("nom, prix_ht, unite, tva").eq("user_id", user.id).limit(40);

  const name = profile?.assistant_name || "Zeus";
  const system = `Tu es ${name}, assistant spécialisé plomberie pour artisans TPE.
Réponds en français, de façon concise et professionnelle.
Contexte utilisateur : TVA par défaut ${profile?.tva_defaut ?? 10}%, tarif horaire ${profile?.tarif_horaire ?? "non renseigné"} €/h.
Bibliothèque d'ouvrages (extrait) : ${JSON.stringify(ouvrages ?? [])}.
Tu peux aider sur devis, prix de marché, normes (rappels généraux sans se substituer aux textes réglementaires), emails clients, rentabilité.`;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    messages: [{ role: "system", content: system }, ...body.messages],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  return NextResponse.json({ content });
}
