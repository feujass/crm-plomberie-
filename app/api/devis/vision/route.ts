import { normalizeLignesWithProfile } from "@/lib/devis-ouvrage-mode";
import { backendFetch } from "@/lib/backend/server";
import { buildDevisVisionPrompt } from "@/lib/llm/artisanSystemPrompt";
import { devisIaResponseSchema } from "@/lib/schemas/devis-ia";
import OpenAI from "openai";
import { NextResponse } from "next/server";

import type { BackendMeResponse, BackendOuvrage } from "@/types/backend";

export async function POST(req: Request) {
  let me: BackendMeResponse;
  try {
    me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  } catch {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }

  const formData = (await req.formData()) as unknown as { get: (name: string) => unknown };
  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ message: "Fichier requis" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const b64 = buf.toString("base64");
  const mime = file.type || "image/jpeg";
  const dataUrl = `data:${mime};base64,${b64}`;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { message: "IA non configurée (OPENAI_API_KEY manquante). Crée un devis en brouillon ou configure une clé.", code: "llm_not_configured" },
      { status: 501 },
    );
  }

  const profile = me.profile ?? {};
  let ouvrages: BackendOuvrage[] = [];
  try {
    ouvrages = (await backendFetch("/api/ouvrages")) as BackendOuvrage[];
  } catch {
    ouvrages = [];
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const system = buildDevisVisionPrompt(profile, ouvrages ?? []);

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          { type: "text", text: "Analyse ce document et génère le JSON du devis." },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
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

  const lignes = normalizeLignesWithProfile(
    z.data.lignes.map((l, i) => ({
      section: l.section,
      designation: l.designation,
      quantite: l.quantite,
      unite: l.unite,
      prix_ht: l.prix_ht,
      tva: l.tva,
      ordre: i,
      ligne_type: l.ligne_type,
    })),
    profile,
  );

  return NextResponse.json({ lignes });
}
