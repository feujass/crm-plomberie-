import { saveNotificationPreferences } from "@/lib/notifications/save-preferences";
import { parseNotificationPreferences, type NotificationPreferences } from "@/lib/notifications/preferences";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type Body = {
  notification_preferences?: NotificationPreferences;
  tel?: string;
};

export async function POST(req: Request) {
  let raw: Body;
  try {
    raw = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "JSON invalide" }, { status: 400 });
  }

  const prefs = parseNotificationPreferences(raw.notification_preferences);
  const tel = typeof raw.tel === "string" ? raw.tel : undefined;

  try {
    const result = await saveNotificationPreferences(prefs, tel !== undefined ? { tel } : undefined);
    revalidatePath("/compte/notifications");
    revalidatePath("/accueil");
    return NextResponse.json({
      ok: true,
      notification_preferences: result.prefs,
      warning: result.warning,
      message:
        result.warning === "migration_required"
          ? "Préférences partielles enregistrées. Exécutez la migration Supabase notification_preferences pour sauvegarder le détail par canal."
          : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
