"use client";

import type { BackendProfile } from "@/types/backend";
import {
  isNotificationChannelAvailable,
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENTS,
  notificationPreferencesEqual,
  parseNotificationPreferences,
  type NotificationChannel,
  type NotificationEventId,
  type NotificationPreferences,
} from "@/lib/notifications/preferences";
import { cx, focusRing } from "@/lib/utils";
import { Bell, Clock, Mail, MessageCircle, Smartphone } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const CHANNEL_ICONS: Record<NotificationChannel, typeof Bell> = {
  push: Smartphone,
  email: Mail,
  sms: MessageCircle,
  whatsapp: MessageCircle,
};

type SaveState = "synced" | "saving" | "error";

export function CompteNotificationsClient({
  profile,
  email,
}: {
  profile: BackendProfile;
  email: string;
  tel?: string;
}) {
  const initial = parseNotificationPreferences(profile.notification_preferences, {
    notification_email: profile.notification_email,
    notification_push: profile.notification_push,
  });

  const [prefs, setPrefs] = useState<NotificationPreferences>(initial);
  const [baseline, setBaseline] = useState<NotificationPreferences>(initial);
  const [saveState, setSaveState] = useState<SaveState>("synced");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [testFeedback, setTestFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const pauseAutoSave = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDirty = !notificationPreferencesEqual(prefs, baseline);

  const save = useCallback(async () => {
    const res = await fetch("/api/compte/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ notification_preferences: prefs }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      notification_preferences?: NotificationPreferences;
      message?: string;
      warning?: string;
    };
    if (!res.ok || !json.ok) {
      setSaveState("error");
      setSaveMessage(json.message ?? "Enregistrement impossible.");
      pauseAutoSave.current = true;
      return;
    }
    const next = parseNotificationPreferences(json.notification_preferences);
    setPrefs(next);
    setBaseline(next);
    setSaveState("synced");
    setSaveMessage(json.warning === "migration_required" ? (json.message ?? null) : null);
  }, [prefs]);

  useEffect(() => {
    if (!isDirty) {
      setSaveState("synced");
      return;
    }
    if (pauseAutoSave.current) return;
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void save();
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [isDirty, save]);

  function toggle(event: NotificationEventId, channel: NotificationChannel) {
    if (!isNotificationChannelAvailable(channel)) return;
    pauseAutoSave.current = false;
    setSaveMessage(null);
    setPrefs((current) => ({
      matrix: {
        ...current.matrix,
        [event]: {
          ...current.matrix[event],
          [channel]: !current.matrix[event][channel],
        },
      },
    }));
  }

  async function testEmail() {
    setTestFeedback(null);
    setTestingEmail(true);
    try {
      const res = await fetch("/api/compte/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ channel: "email" }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      setTestFeedback({
        kind: json.ok ? "ok" : "err",
        text: json.message ?? (json.ok ? "Test envoyé." : "Test impossible."),
      });
    } catch {
      setTestFeedback({ kind: "err", text: "Erreur réseau." });
    } finally {
      setTestingEmail(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[color:var(--primary)]/25 bg-[color:var(--primary)]/5 p-4 dark:border-[color:var(--primary)]/30 dark:bg-[color:var(--primary)]/10">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 size-5 shrink-0 text-[color:var(--primary)] dark:text-[color:var(--chart-1)]" aria-hidden />
          <div>
            <p className="font-semibold text-[var(--foreground)]">E-mail disponible · WhatsApp bientôt</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Pour l&apos;instant, Flowo vous alerte uniquement par <strong>e-mail</strong> ({email || "adresse de connexion"}).
              Les notifications <strong>WhatsApp</strong>, SMS et push seront activées dans une prochaine mise à jour.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-[var(--foreground)]">Enregistrement</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Vos choix sont sauvegardés automatiquement.
            </p>
          </div>
          <span
            className={cx(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-extrabold tracking-wide",
              saveState === "error"
                ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                : "border-[color:var(--primary)]/20 bg-white text-[color:var(--primary)] dark:bg-gray-950/80 dark:text-[color:var(--chart-1)]",
            )}
          >
            {saveState === "saving" ? (
              <span className="size-2.5 animate-pulse rounded-full bg-[color:var(--primary)]" />
            ) : saveState === "error" ? (
              <span aria-hidden>!</span>
            ) : (
              <span aria-hidden>✓</span>
            )}
            <span>{saveState === "error" ? "Erreur" : saveState === "saving" ? "Enregistrement…" : "Enregistré"}</span>
          </span>
        </div>
        {saveMessage ? (
          <p
            className={cx(
              "mt-3 text-xs leading-relaxed",
              saveState === "error" ? "text-red-600 dark:text-red-400" : "text-amber-700 dark:text-amber-400",
            )}
          >
            {saveMessage}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="font-semibold text-[var(--foreground)]">Tester l&apos;e-mail</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Un message test sera envoyé à {email || "votre adresse de connexion"}.
        </p>
        <button
          type="button"
          disabled={testingEmail}
          onClick={() => void testEmail()}
          className={cx(
            "mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-100 dark:hover:bg-gray-800",
            focusRing,
          )}
        >
          {testingEmail ? "Envoi…" : "Tester l'e-mail"}
        </button>
        {testFeedback ? (
          <p
            className={cx(
              "mt-3 text-xs leading-relaxed",
              testFeedback.kind === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-amber-800 dark:text-amber-300",
            )}
          >
            {testFeedback.text}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Par événement</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Choisissez les alertes e-mail que Zeus vous envoie. Les autres canaux arrivent prochainement.
          </p>
        </div>

        {NOTIFICATION_EVENTS.map((event) => (
          <article
            key={event.id}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <h3 className="text-sm font-semibold text-[var(--foreground)]">{event.label}</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{event.description}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {NOTIFICATION_CHANNELS.map((channel) => {
                const available = isNotificationChannelAvailable(channel);
                const enabled = prefs.matrix[event.id][channel];
                const Icon = CHANNEL_ICONS[channel];
                return (
                  <button
                    key={channel}
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-disabled={!available}
                    disabled={!available}
                    aria-label={`${event.label} — ${NOTIFICATION_CHANNEL_LABELS[channel]} ${enabled ? "activé" : "désactivé"}`}
                    onClick={() => toggle(event.id, channel)}
                    className={cx(
                      "relative flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-center text-[11px] font-semibold transition",
                      focusRing,
                      !available && "cursor-not-allowed opacity-60",
                      available && enabled
                        ? "border-[color:var(--primary)] bg-[color:var(--primary)]/10 text-[color:var(--primary)] dark:text-[color:var(--chart-1)]"
                        : "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400",
                    )}
                  >
                    {!available ? (
                      <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-gray-200/90 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        <Clock className="size-2.5" aria-hidden />
                        Bientôt
                      </span>
                    ) : null}
                    <Icon className="size-4" aria-hidden />
                    {NOTIFICATION_CHANNEL_LABELS[channel]}
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Les relances automatiques envoyées à vos <strong>clients</strong> (devis, factures) restent gérées par Flowo selon vos délais de
        relance. Ce réglage concerne uniquement <strong>vos</strong> alertes personnelles.
      </p>
    </div>
  );
}
