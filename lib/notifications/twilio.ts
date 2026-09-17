type TwilioResult = { ok: true } | { ok: false; error: string };

function twilioConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim(),
  );
}

function parseTwilioError(text: string): string {
  try {
    const json = JSON.parse(text) as { code?: number; message?: string };
    if (json.message) {
      const hint = twilioErrorHint(json.code);
      return hint ? `${json.message} — ${hint}` : json.message;
    }
  } catch {
    // pas du JSON Twilio
  }
  return text || "Erreur Twilio";
}

function twilioErrorHint(code?: number): string | null {
  switch (code) {
    case 21654:
      return "configurez TWILIO_WHATSAPP_CONTENT_SID (template WhatsApp approuvé dans Twilio)";
    case 63016:
      return "hors fenêtre 24 h — utilisez un template (TWILIO_WHATSAPP_CONTENT_SID) ou renvoyez join twilio-trial au sandbox";
    case 63030:
      return "n'envoyez pas Body/MediaUrl avec un template — utilisez ContentSid";
    case 63007:
      return "le destinataire n'a pas rejoint le sandbox WhatsApp (join twilio-trial)";
    default:
      return null;
  }
}

async function twilioSend(params: Record<string, string>): Promise<TwilioResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) return { ok: false, error: "not_configured" };

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: parseTwilioError(text) || `Twilio HTTP ${res.status}` };
  }
  return { ok: true };
}

function twilioMessagingExtras(): Record<string, string> {
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  return messagingServiceSid ? { MessagingServiceSid: messagingServiceSid } : {};
}

export function isTwilioConfigured() {
  return twilioConfigured();
}

export function isTwilioWhatsAppTemplateConfigured() {
  return Boolean(process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim());
}

export async function sendTwilioSms(to: string, body: string): Promise<TwilioResult> {
  const from = process.env.TWILIO_SMS_FROM?.trim();
  if (!from) return { ok: false, error: "TWILIO_SMS_FROM manquant" };
  return twilioSend({ To: to, From: from, Body: body, ...twilioMessagingExtras() });
}

/**
 * WhatsApp Twilio :
 * - avec TWILIO_WHATSAPP_CONTENT_SID : template Content API (recommandé, obligatoire hors sandbox 24 h)
 * - sans : message libre Body uniquement (sandbox, fenêtre 24 h après join twilio-trial)
 * Ne jamais envoyer MediaUrl sans ContentSid — provoque l'erreur 21654.
 */
export async function sendTwilioWhatsApp(to: string, body: string): Promise<TwilioResult> {
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
  if (!from) return { ok: false, error: "TWILIO_WHATSAPP_FROM manquant" };

  const toWa = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim();

  const params: Record<string, string> = {
    To: toWa,
    From: from,
    ...twilioMessagingExtras(),
  };

  if (contentSid) {
    params.ContentSid = contentSid;
    params.ContentVariables = JSON.stringify({ "1": body });
  } else {
    params.Body = body;
  }

  return twilioSend(params);
}
