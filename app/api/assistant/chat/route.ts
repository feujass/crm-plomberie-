import { resolveAssistantName } from "@/lib/assistant-branding";
import { metierLabel } from "@/lib/llm/artisanSystemPrompt";
import { completeFlowoChatLlm, type FlowoChatMessage } from "@/lib/llm/flowoChatCompletion";
import { createClientFromRequest } from "@/lib/supabase/server-from-request";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifié" }, { status: 401 });

  const body = (await req.json()) as { messages?: FlowoChatMessage[] };
  if (!body.messages?.length) return NextResponse.json({ message: "messages requis" }, { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: ouvrages } = await supabase
    .from("ouvrages")
    .select("nom, prix_ht, unite, tva")
    .eq("user_id", user.id)
    .limit(40);

  const name = resolveAssistantName(profile?.assistant_name);
  const trade = metierLabel(profile ?? {});
  const system = `Tu es ${name}, assistant pour artisans TPE du BTP (${trade}).
Réponds en français, de façon concise et professionnelle.
Contexte utilisateur : TVA par défaut ${profile?.tva_defaut ?? 10}%, tarif horaire ${profile?.tarif_horaire ?? "non renseigné"} €/h.
Bibliothèque d'ouvrages (extrait) : ${JSON.stringify(ouvrages ?? [])}.
Tu peux aider sur devis, prix de marché, normes (rappels généraux sans te substituer aux textes réglementaires), emails clients, rentabilité.`;

  try {
    const result = await completeFlowoChatLlm(system, body.messages);
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }
    return NextResponse.json({ content: result.content });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur LLM";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
