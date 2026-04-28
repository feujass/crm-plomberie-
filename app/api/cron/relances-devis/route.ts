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

  const { data: devisList, error } = await admin
    .from("devis")
    .select("id, user_id, numero, date_envoi, share_token, clients(email), derniere_relance_at")
    .eq("statut", "envoye")
    .is("derniere_relance_at", null);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const profileCache = new Map<string, number>();
  let sent = 0;

  for (const d of devisList ?? []) {
    if (!d.date_envoi) continue;
    let jours: number = profileCache.get(d.user_id) ?? -1;
    if (jours < 0) {
      const { data: p } = await admin.from("profiles").select("relance_devis_jours").eq("id", d.user_id).maybeSingle();
      jours = Number(p?.relance_devis_jours ?? 5);
      profileCache.set(d.user_id, jours);
    }
    const sentAt = new Date(d.date_envoi as string);
    const due = new Date(sentAt);
    due.setDate(due.getDate() + jours);
    if (new Date() < due) continue;

    const email = (d.clients as unknown as { email: string | null } | null)?.email;
    if (!email) continue;

    const url = `${site}/devis/public/${d.share_token}`;
    const html = `<p>Relance concernant votre devis <strong>${d.numero}</strong>.</p><p><a href="${url}">Consulter le devis</a></p>`;
    const res = await sendDevisEmail({ to: email, subject: `Relance — Devis ${d.numero}`, html });
    if (res.ok) {
      await admin.from("devis").update({ derniere_relance_at: new Date().toISOString() }).eq("id", d.id);
      sent += 1;
    }
  }

  return NextResponse.json({ ok: true, processed: devisList?.length ?? 0, sent });
}
