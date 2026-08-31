export const NOTIFICATION_CHANNELS = ["push", "email", "sms", "whatsapp"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  push: "Push",
  email: "E-mail",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

/** Canaux réellement actifs côté produit (le reste est affiché « Bientôt »). */
export const NOTIFICATION_CHANNEL_AVAILABLE: Record<NotificationChannel, boolean> = {
  email: true,
  push: false,
  sms: false,
  whatsapp: false,
};

export function isNotificationChannelAvailable(channel: NotificationChannel): boolean {
  return NOTIFICATION_CHANNEL_AVAILABLE[channel];
}

export function sanitizeNotificationPreferences(prefs: NotificationPreferences): NotificationPreferences {
  const next = structuredClone(prefs);
  for (const event of NOTIFICATION_EVENTS.map((e) => e.id)) {
    for (const channel of NOTIFICATION_CHANNELS) {
      if (!NOTIFICATION_CHANNEL_AVAILABLE[channel]) {
        next.matrix[event][channel] = false;
      }
    }
  }
  return next;
}

export const NOTIFICATION_EVENTS = [
  {
    id: "devis_cree",
    label: "Devis créé",
    description: "Quand tu crées un nouveau devis (brouillon ou généré par Zeus).",
  },
  {
    id: "devis_relance",
    label: "Relance devis client",
    description: "Quand Flowo relance automatiquement ton client pour un devis sans réponse.",
  },
  {
    id: "devis_accepte",
    label: "Devis accepté",
    description: "Quand un client accepte un devis (en ligne ou marqué accepté).",
  },
  {
    id: "devis_refuse",
    label: "Devis refusé",
    description: "Quand un devis est marqué refusé par le client ou par toi.",
  },
  {
    id: "facture_cree",
    label: "Facture créée",
    description: "Quand tu transformes un devis accepté en facture.",
  },
  {
    id: "facture_relance",
    label: "Relance facture client",
    description: "Échéance dépassée ou relance de paiement envoyée au client.",
  },
  {
    id: "resume_hebdo",
    label: "Résumé hebdomadaire",
    description: "Synthèse CA, devis en attente et tâches de la semaine.",
  },
] as const;

export type NotificationEventId = (typeof NOTIFICATION_EVENTS)[number]["id"];

export type NotificationMatrix = Record<NotificationEventId, Record<NotificationChannel, boolean>>;

export type NotificationPreferences = {
  matrix: NotificationMatrix;
  /** Repli si colonnes dédiées absentes en base (migration non appliquée). */
  relance_devis_echeances?: string;
  relance_facture_echeances?: string;
};

const EVENT_IDS = NOTIFICATION_EVENTS.map((e) => e.id) as NotificationEventId[];

const DEFAULT_MATRIX: NotificationMatrix = {
  devis_cree: { push: false, email: false, sms: false, whatsapp: false },
  devis_relance: { push: false, email: true, sms: false, whatsapp: false },
  devis_accepte: { push: false, email: true, sms: false, whatsapp: false },
  devis_refuse: { push: false, email: true, sms: false, whatsapp: false },
  facture_cree: { push: false, email: true, sms: false, whatsapp: false },
  facture_relance: { push: false, email: true, sms: false, whatsapp: false },
  resume_hebdo: { push: false, email: true, sms: false, whatsapp: false },
};

export function defaultNotificationPreferences(): NotificationPreferences {
  return {
    matrix: structuredClone(DEFAULT_MATRIX),
  };
}

function isChannel(value: unknown): value is NotificationChannel {
  return typeof value === "string" && (NOTIFICATION_CHANNELS as readonly string[]).includes(value);
}

function isEventId(value: unknown): value is NotificationEventId {
  return typeof value === "string" && (EVENT_IDS as readonly string[]).includes(value);
}

/** Fusionne JSON stocké + défauts ; prend en compte les anciens booléens globaux. */
export function parseNotificationPreferences(
  raw: unknown,
  legacy?: { notification_email?: boolean; notification_push?: boolean },
): NotificationPreferences {
  const base = defaultNotificationPreferences();
  if (!raw || typeof raw !== "object") {
    if (legacy?.notification_email === false) {
      for (const event of EVENT_IDS) base.matrix[event].email = false;
    }
    if (legacy?.notification_push === true) {
      for (const event of EVENT_IDS) {
        if (event !== "resume_hebdo") base.matrix[event].push = true;
      }
    }
    return sanitizeNotificationPreferences(base);
  }

  const obj = raw as {
    matrix?: unknown;
    relance_devis_echeances?: unknown;
    relance_facture_echeances?: unknown;
  };
  if (typeof obj.relance_devis_echeances === "string" && obj.relance_devis_echeances.trim()) {
    base.relance_devis_echeances = obj.relance_devis_echeances.trim();
  }
  if (typeof obj.relance_facture_echeances === "string" && obj.relance_facture_echeances.trim()) {
    base.relance_facture_echeances = obj.relance_facture_echeances.trim();
  }
  if (obj.matrix && typeof obj.matrix === "object") {
    for (const [eventKey, channels] of Object.entries(obj.matrix as Record<string, unknown>)) {
      if (!isEventId(eventKey) || !channels || typeof channels !== "object") continue;
      for (const [channelKey, enabled] of Object.entries(channels as Record<string, unknown>)) {
        if (!isChannel(channelKey) || typeof enabled !== "boolean") continue;
        base.matrix[eventKey][channelKey] = enabled;
      }
    }
  }

  return sanitizeNotificationPreferences(base);
}

export function notificationPreferencesEqual(a: NotificationPreferences, b: NotificationPreferences): boolean {
  return JSON.stringify(a.matrix) === JSON.stringify(b.matrix);
}

/** Booléens legacy pour colonnes existantes en base. */
export function legacyNotificationFlags(prefs: NotificationPreferences): {
  notification_email: boolean;
  notification_push: boolean;
} {
  let notification_email = false;
  let notification_push = false;
  for (const event of EVENT_IDS) {
    if (prefs.matrix[event].email) notification_email = true;
    if (prefs.matrix[event].push) notification_push = true;
  }
  return { notification_email, notification_push };
}

export function isNotificationEnabled(
  prefs: NotificationPreferences,
  event: NotificationEventId,
  channel: NotificationChannel,
): boolean {
  if (!NOTIFICATION_CHANNEL_AVAILABLE[channel]) return false;
  return Boolean(prefs.matrix[event]?.[channel]);
}

export function serializeNotificationPreferences(prefs: NotificationPreferences): Record<string, unknown> {
  const out: Record<string, unknown> = { matrix: prefs.matrix };
  if (prefs.relance_devis_echeances?.trim()) {
    out.relance_devis_echeances = prefs.relance_devis_echeances.trim();
  }
  if (prefs.relance_facture_echeances?.trim()) {
    out.relance_facture_echeances = prefs.relance_facture_echeances.trim();
  }
  return out;
}
