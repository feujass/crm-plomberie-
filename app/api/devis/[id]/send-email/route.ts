import { backendFetch } from "@/lib/backend/server";
import { sendDevisEmail } from "@/lib/resend-mail";
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

  let devis: unknown;
  try {
    devis = await backendFetch(`/api/devis/${id}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Devis introuvable";
    return NextResponse.json({ message: msg }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const publicUrl = `${siteUrl}/devis/${encodeURIComponent(id)}`;
  const numero =
    devis && typeof devis === "object" && "numero" in devis ? String((devis as { numero?: unknown }).numero ?? "—") : "—";

  const html = `<p>Bonjour,</p>
<p>Voici votre devis <strong>${numero}</strong>.</p>
<p><a href="${publicUrl}">Ouvrir le devis</a></p>`;

  const res = await sendDevisEmail({ to: email, subject: `Devis ${numero}`, html });

  // Même en mode "mock" (clé Resend absente), on permet de tester le flux et on marque "envoyé".
  try {
    await backendFetch(`/api/devis/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "envoye" }),
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

  return NextResponse.json({ ok: true, mode: "resend" });
}

