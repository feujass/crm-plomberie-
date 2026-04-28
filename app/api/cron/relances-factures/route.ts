import { createAdminClient } from "@/lib/supabase/admin";
import { assertCronSecret } from "@/lib/cron-auth";
import { sendDevisEmail } from "@/lib/resend-mail";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!assertCronSecret(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const admin = createAdminClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const today = new Date().toISOString().slice(0, 10);

  const { data: factures, error } = await admin
    .from("factures")
    .select("id, user_id, numero, date_echeance, share_token, statut, clients(email), derniere_relance_at")
    .in("statut", ["emise", "partielle", "retard"])
    .lte("date_echeance", today)
    .is("derniere_relance_at", null);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let sent = 0;
  for (const f of factures ?? []) {
    const email = (f.clients as unknown as { email: string | null } | null)?.email;
    if (!email) continue;
    const url = `${site}/facturation/public/${f.share_token}`;
    const html = `<p>Votre facture <strong>${f.numero}</strong> est en attente de règlement.</p><p><a href="${url}">Voir la facture</a></p>`;
    const res = await sendDevisEmail({ to: email, subject: `Relance — Facture ${f.numero}`, html });
    if (res.ok) {
      await admin.from("factures").update({ derniere_relance_at: new Date().toISOString(), statut: "retard" }).eq("id", f.id);
      sent += 1;
    }
  }

  return NextResponse.json({ ok: true, processed: factures?.length ?? 0, sent });
}
