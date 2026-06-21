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
    const data = (await backendCronFetch("/api/cron/devis-a-relancer")) as { items?: RelanceItem[] };
    items = data.items ?? [];
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur backend";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }

  let sent = 0;
  for (const d of items) {
    const email = d.client_email?.trim();
    if (!email || !d.public_token) continue;

    const url = `${site}/devis/public/${d.public_token}`;
    const html = `<p>Relance concernant votre devis <strong>${d.numero ?? "—"}</strong>.</p><p><a href="${url}">Consulter le devis</a></p>`;
    const res = await sendDevisEmail({ to: email, subject: `Relance — Devis ${d.numero ?? ""}`.trim(), html });
    if (res.ok) {
      try {
        await backendCronFetch(`/api/cron/devis/${d.id}/relance-envoyee`, { method: "POST" });
        sent += 1;
      } catch {
        // e-mail envoyé mais marquage backend échoué
      }
    }
  }

  return NextResponse.json({ ok: true, processed: items.length, sent });
}
