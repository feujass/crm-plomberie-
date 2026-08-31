import { backendFetch } from "@/lib/backend/server";
import { buildClientEmailFrom, sanitizeReplyToEmail } from "@/lib/email/build-email-from";
import { devisInitialEmailHtml } from "@/lib/email/relance-templates";
import { sendDevisEmail } from "@/lib/resend-mail";
import type { BackendDevisDetail, BackendMeResponse } from "@/types/backend";
import { NextResponse } from "next/server";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }

  const { to } = (body ?? {}) as { to?: string };
  const email = String(to ?? "").trim();
  if (!email) return NextResponse.json({ message: "E-mail requis" }, { status: 400 });

  let devis: BackendDevisDetail;
  try {
    devis = (await backendFetch(`/api/devis/${id}`)) as BackendDevisDetail;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Devis introuvable";
    return NextResponse.json({ message: msg }, { status: 404 });
  }

  const publicToken = devis.public_token?.trim();
  if (!publicToken) {
    return NextResponse.json({ message: "Token public manquant sur le devis" }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const publicUrl = `${siteUrl}/devis/public/${encodeURIComponent(publicToken)}`;
  const numero = devis.numero ?? "—";

  let profile = {};
  let authEmail: string | undefined;
  try {
    const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
    profile = me.profile ?? {};
    authEmail = me.email;
  } catch {
    profile = {};
  }

  const entreprise = (profile as BackendMeResponse["profile"])?.entreprise?.trim() ?? "";
  const replyTo =
    sanitizeReplyToEmail((profile as BackendMeResponse["profile"])?.email_facturation) ??
    sanitizeReplyToEmail(authEmail);
  const from = buildClientEmailFrom(profile as BackendMeResponse["profile"]);

  const html = devisInitialEmailHtml({ numero, publicUrl, entreprise: entreprise || undefined });

  const res = await sendDevisEmail({
    to: email,
    subject: entreprise ? `${entreprise} — Devis ${numero}` : `Devis ${numero}`,
    html,
    from,
    replyTo,
  });

  const now = new Date().toISOString();
  try {
    await backendFetch(`/api/devis/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "envoye", date_envoi: devis.date_envoi ?? now }),
    });
  } catch {
    // best-effort: l'envoi peut être testé indépendamment du statut
  }

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, mode: res.error === "missing_key" ? "mock" : "error", error: res.error },
      { status: 200 },
    );
  }

  return NextResponse.json({ ok: true, mode: "resend", publicUrl });
}
