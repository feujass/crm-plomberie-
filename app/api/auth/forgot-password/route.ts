import { NextResponse } from "next/server";

import { backendBaseUrl } from "@/lib/backend/config";
import { fastApiDetailMessage } from "@/lib/backend/fastApiDetail";
import { sendPasswordResetEmail } from "@/lib/resend-mail";

const GENERIC_SUCCESS =
  "Si un compte Flowo existe pour cette adresse, un e-mail avec un lien de réinitialisation vient d’être envoyé (vérifie aussi les courriers indésirables). Le lien est valable 1 heure.";

export async function POST(req: Request) {
  let base: string;
  try {
    base = backendBaseUrl();
  } catch {
    return NextResponse.json(
      { error: "Configuration : BACKEND_URL manquant dans .env.local (voir .env.example)." },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "Adresse e-mail requise" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${base}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });
  } catch (e) {
    const cause = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: `Serveur injoignable (${base}). Démarre MongoDB puis : cd backend && uvicorn server:app --reload --host 127.0.0.1 --port 8000. (${cause})`,
      },
      { status: 503 },
    );
  }

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = fastApiDetailMessage(payload) ?? "Demande impossible";
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  const token = typeof payload.token === "string" ? payload.token : null;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const resetUrl = token ? `${site}/reset-password?token=${encodeURIComponent(token)}` : null;

  let emailSent = false;
  if (resetUrl) {
    const sent = await sendPasswordResetEmail({ to: email, resetUrl });
    emailSent = sent.ok;
    if (!sent.ok) {
      console.warn("[forgot-password] E-mail non envoyé:", sent.error, "| URL (serveur) :", resetUrl);
    }
  }

  const dev = process.env.NODE_ENV === "development";
  return NextResponse.json({
    message: GENERIC_SUCCESS,
    ...(dev && resetUrl && !emailSent ? { dev_reset_url: resetUrl } : {}),
  });
}
