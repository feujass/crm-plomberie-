import type { NotificationPreferences } from "@/lib/notifications/preferences";
import { parseNotificationPreferences } from "@/lib/notifications/preferences";

export type CronRelanceDevisItem = {
  id: string;
  user_id: string;
  numero?: string;
  public_token?: string;
  client_email?: string | null;
  client_nom?: string | null;
  entreprise?: string | null;
  email_facturation?: string | null;
  relance_index: number;
  relance_total: number;
  days_after_send: number;
  artisan_email?: string | null;
  artisan_tel?: string | null;
  notification_preferences?: NotificationPreferences;
};

export type CronRelanceFactureItem = {
  id: string;
  user_id: string;
  numero?: string;
  public_token?: string;
  client_email?: string | null;
  client_nom?: string | null;
  relance_index: number;
  relance_total: number;
  days_after_due: number;
  artisan_email?: string | null;
  artisan_tel?: string | null;
  notification_preferences?: NotificationPreferences;
};

export function mapProfileArtisanFields(
  prof: Record<string, unknown> | null | undefined,
  authEmail?: string | null,
) {
  return {
    artisan_email: authEmail?.trim() || String(prof?.email_facturation ?? "").trim() || null,
    artisan_tel: String(prof?.tel ?? "").trim() || null,
    notification_preferences: parseNotificationPreferences(prof?.notification_preferences, {
      notification_email: prof?.notification_email as boolean | undefined,
      notification_push: prof?.notification_push as boolean | undefined,
    }),
  };
}
