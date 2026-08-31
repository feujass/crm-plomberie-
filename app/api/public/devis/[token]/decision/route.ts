import { backendFetch } from "@/lib/backend/server";
import { notifyArtisanDevisDecision } from "@/lib/notifications/trigger";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ token: string }> };

type DecisionResult = {
  ok?: boolean;
  statut?: string;
  numero?: string;
  client_nom?: string;
  owner_user_id?: string;
  message?: string;
};

function httpStatusFromMessage(message: string): number {
  if (message.includes("introuvable")) return 404;
  if (message.includes("ne peut plus")) return 409;
  if (message.includes("invalide")) return 400;
  return 502;
}

export async function POST(req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  let body: { decision?: string };
  try {
    body = (await req.json()) as { decision?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "JSON invalide" }, { status: 400 });
  }

  const decision = typeof body.decision === "string" ? body.decision.trim() : "";
  if (decision !== "accepte" && decision !== "refuse") {
    return NextResponse.json({ ok: false, message: "Décision invalide" }, { status: 400 });
  }

  try {
    const result = (await backendFetch(`/api/public/devis/${encodeURIComponent(token)}/decision`, {
      method: "POST",
      auth: false,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    })) as DecisionResult;

    let notify: { channels: string[]; errors: string[] } | undefined;
    if (result.owner_user_id) {
      notify = await notifyArtisanDevisDecision(
        result.owner_user_id,
        decision === "accepte" ? "devis_accepte" : "devis_refuse",
        {
          numero: result.numero,
          clientLabel: result.client_nom,
        },
      );
    }

    return NextResponse.json({
      ok: true,
      statut: result.statut ?? decision,
      numero: result.numero,
      client_nom: result.client_nom,
      notify,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur";
    return NextResponse.json({ ok: false, message }, { status: httpStatusFromMessage(message) });
  }
}
