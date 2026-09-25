import { APP_NAME } from "@/lib/app-branding";
import { flowoEmailLayout } from "@/lib/email/flowo-email-layout";
import { isNotificationChannelAvailable } from "@/lib/notifications/preferences";
import { normalizeFrenchPhone } from "@/lib/notifications/phone";
import { isTwilioConfigured, sendTwilioSms, sendTwilioWhatsApp } from "@/lib/notifications/twilio";
import { zeusTestWhatsAppBody } from "@/lib/notifications/zeus-messages";
import { sendDevisEmail } from "@/lib/resend-mail";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseDataMode } from "@/lib/supabase/env";
import { backendFetch } from "@/lib/backend/server";
import { NextResponse } from "next/server";

type Body = {
  channel?: "email" | "push" | "sms" | "whatsapp";
  tel?: string;
};

export async function POST(req: Request) {
  let raw: Body;
  try {
    raw = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "JSON invalide" }, { status: 400 });
  }

  const channel = raw.channel;
  if (!channel) {
    return NextResponse.json({ ok: false, message: "Canal requis" }, { status: 400 });
  }

  if (!isNotificationChannelAvailable(channel)) {
    return NextResponse.json({
      ok: false,
      message: "Ce canal n'est pas encore disponible. Seul l'e-mail est actif pour l'instant — WhatsApp arrive prochainement.",
    });
  }

  if (channel === "push") {
    return NextResponse.json({
      ok: true,
      message: "Autorisez les notifications du navigateur, puis le test s’affichera sur cet appareil.",
      client_action: "show_push",
    });
  }

  let email = "";
  let userId = "";

  if (isSupabaseDataMode()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, message: "Non authentifié" }, { status: 401 });
    email = user.email ?? "";
    userId = user.id;
  } else {
    try {
      const me = (await backendFetch("/api/auth/me")) as { email?: string; id?: string };
      email = me.email ?? "";
      userId = me.id ?? "";
    } catch {
      return NextResponse.json({ ok: false, message: "Non authentifié" }, { status: 401 });
    }
  }

  if (channel === "email") {
    if (!email) {
      return NextResponse.json({ ok: false, message: "Aucune adresse e-mail sur le compte." }, { status: 400 });
    }
    const html = flowoEmailLayout({
      title: `${APP_NAME} — notification test`,
      preview: "Ceci est une alerte test depuis vos réglages Flowo.",
      bodyHtml: `
        <p style="margin:0 0 12px;">Bonjour,</p>
        <p style="margin:0 0 12px;">Ceci est un <strong>e-mail test</strong> pour vérifier vos notifications ${APP_NAME}.</p>
        <p style="margin:0;">Si vous recevez ce message, le canal e-mail fonctionne correctement.</p>
      `,
    });
    const sent = await sendDevisEmail({
      to: email,
      subject: `${APP_NAME} — test notification e-mail`,
      html,
    });
    if (!sent.ok) {
      return NextResponse.json({
        ok: false,
        message:
          sent.error === "missing_key"
            ? "RESEND_API_KEY manquante — configurez l’envoi d’e-mails dans .env.local."
            : `Envoi impossible : ${sent.error}`,
      });
    }
    return NextResponse.json({ ok: true, message: `E-mail test envoyé à ${email}.` });
  }

  const telInput = String(raw.tel ?? "").trim();
  const normalized = telInput ? normalizeFrenchPhone(telInput) : null;

  if ((channel === "sms" || channel === "whatsapp") && telInput && normalized && userId && isSupabaseDataMode()) {
    const supabase = await createClient();
    await supabase.from("profiles").update({ tel: normalized }).eq("id", userId);
  } else if ((channel === "sms" || channel === "whatsapp") && telInput && normalized && userId) {
    await backendFetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tel: normalized }),
    });
  }

  const label = channel === "sms" ? "SMS" : "WhatsApp";
  if ((channel === "sms" || channel === "whatsapp") && normalized) {
    if (!isTwilioConfigured()) {
      return NextResponse.json({
        ok: false,
        message: `${label} : configurez TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_${channel === "sms" ? "SMS" : "WHATSAPP"}_FROM dans .env.local.`,
        tel_saved: Boolean(normalized && userId),
      });
    }
    const body = zeusTestWhatsAppBody();
    const sent =
      channel === "sms"
        ? await sendTwilioSms(normalized, body)
        : await sendTwilioWhatsApp(normalized, body);
    if (sent.ok) {
      return NextResponse.json({
        ok: true,
        message: `${label} test envoyé au ${normalized}.`,
        tel_saved: Boolean(normalized && userId),
      });
    }
    return NextResponse.json({
      ok: false,
      message: `${label} : ${sent.error}`,
      tel_saved: Boolean(normalized && userId),
    });
  }

  return NextResponse.json({
    ok: false,
    message: `${label} : numéro requis pour le test.${normalized ? "" : " Format invalide."}`,
    tel_saved: Boolean(normalized),
  });
}
