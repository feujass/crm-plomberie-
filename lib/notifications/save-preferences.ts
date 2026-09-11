import { backendFetch } from "@/lib/backend/server";
import { normalizeFrenchPhone } from "@/lib/notifications/phone";
import { isSupabaseDataMode } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  legacyNotificationFlags,
  sanitizeNotificationPreferences,
  serializeNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notifications/preferences";

export type SaveNotificationResult = {
  prefs: NotificationPreferences;
  warning?: "migration_required";
};

function isMissingNotificationColumn(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("notification_preferences") || m.includes("schema cache") || m.includes("could not find");
}

export async function saveNotificationPreferences(
  prefs: NotificationPreferences,
  options?: { tel?: string },
): Promise<SaveNotificationResult> {
  prefs = sanitizeNotificationPreferences(prefs);
  const legacy = legacyNotificationFlags(prefs);
  const payload: Record<string, unknown> = {
    notification_preferences: serializeNotificationPreferences(prefs),
    notification_email: legacy.notification_email,
    notification_push: legacy.notification_push,
  };

  if (options?.tel !== undefined) {
    const raw = options.tel.trim();
    if (!raw) {
      payload.tel = null;
    } else {
      const normalized = normalizeFrenchPhone(raw);
      if (!normalized) throw new Error("Numéro de téléphone invalide.");
      payload.tel = normalized;
    }
  }

  if (isSupabaseDataMode()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");

    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    if (error) {
      if (isMissingNotificationColumn(error.message)) {
        const { error: fallbackError } = await supabase
          .from("profiles")
          .update({
            notification_email: legacy.notification_email,
            notification_push: legacy.notification_push,
          })
          .eq("id", user.id);
        if (fallbackError) throw new Error(fallbackError.message);
        return { prefs, warning: "migration_required" };
      }
      throw new Error(error.message);
    }
    return { prefs };
  }

  await backendFetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { prefs };
}
