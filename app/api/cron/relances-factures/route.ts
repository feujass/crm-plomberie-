import { backendCronFetch } from "@/lib/backend/cron-fetch";
import { assertCronSecret } from "@/lib/cron-auth";
import { sendDevisEmail } from "@/lib/resend-mail";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RelanceItem = {
  id: string;
  numero?: string;
  public_token?: string;
  client_email?: string | null;
};

export async function GET(request: NextRequest) {
  if (!assertCronSecret(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  let items: RelanceItem[] = [];
  try {
    const data = (await backendCronFetch("/api/cron/factures-a-relancer")) as { items?: RelanceItem[] };
    items = data.items ?? [];
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur backend";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }

  let sent = 0;
  for (const f of items) {
    const email = f.client_email?.trim();
    if (!email || !f.public_token) continue;

    const url = `${site}/f/${f.public_token}`;
    const html = `<p>Votre facture <strong>${f.numero ?? "—"}</strong> est en attente de règlement.</p><p><a href="${url}">Voir la facture</a></p>`;
    const res = await sendDevisEmail({ to: email, subject: `Relance — Facture ${f.numero ?? ""}`.trim(), html });
    if (res.ok) {
      try {
        await backendCronFetch(`/api/cron/factures/${f.id}/relance-envoyee`, { method: "POST" });
        sent += 1;
      } catch {
        // best-effort
      }
    }
  }

  return NextResponse.json({ ok: true, processed: items.length, sent });
}
