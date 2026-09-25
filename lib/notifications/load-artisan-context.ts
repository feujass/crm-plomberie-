import { backendFetch } from "@/lib/backend/server";
import type { ArtisanNotifyContext } from "@/lib/notifications/notify-artisan";
import { parseNotificationPreferences } from "@/lib/notifications/preferences";
import { buildMeResponse } from "@/lib/supabase/profile-map";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseDataMode } from "@/lib/supabase/env";
import type { BackendMeResponse } from "@/types/backend";

export async function loadArtisanNotifyContextForOwner(ownerUserId: string): Promise<ArtisanNotifyContext | null> {
  const id = ownerUserId?.trim();
  if (!id) return null;

  if (isSupabaseDataMode()) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const [{ data: profile }, { data: authData }] = await Promise.all([
      admin.from("profiles").select("*").eq("id", id).maybeSingle(),
      admin.auth.admin.getUserById(id),
    ]);
    const email = authData?.user?.email ?? (profile?.email_facturation as string | undefined) ?? null;
    const mapped = profile ? buildMeResponse(authData?.user ?? { id, email: email ?? undefined }, profile) : null;
    return {
      artisanEmail: email,
      artisanTel: mapped?.profile?.tel ?? (profile?.tel as string | undefined) ?? null,
      notificationPreferences: parseNotificationPreferences(mapped?.profile?.notification_preferences, {
        notification_email: mapped?.profile?.notification_email,
        notification_push: mapped?.profile?.notification_push,
      }),
    };
  }

  try {
    const data = (await backendFetch(`/api/internal/artisan-notify/${encodeURIComponent(id)}`, {
      auth: false,
      headers: {
        Authorization: `Bearer ${process.env.INTERNAL_API_SECRET?.trim() ?? ""}`,
      },
    })) as ArtisanNotifyContext;
    return data;
  } catch {
    return null;
  }
}

export async function loadArtisanNotifyContext(): Promise<ArtisanNotifyContext | null> {
  if (isSupabaseDataMode()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    const me = buildMeResponse(user, profile);
    return {
      artisanEmail: me.email ?? null,
      artisanTel: me.profile?.tel ?? null,
      notificationPreferences: parseNotificationPreferences(me.profile?.notification_preferences, {
        notification_email: me.profile?.notification_email,
        notification_push: me.profile?.notification_push,
      }),
    };
  }

  try {
    const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
    return {
      artisanEmail: me.email ?? null,
      artisanTel: me.profile?.tel ?? null,
      notificationPreferences: parseNotificationPreferences(me.profile?.notification_preferences, {
        notification_email: me.profile?.notification_email,
        notification_push: me.profile?.notification_push,
      }),
    };
  } catch {
    return null;
  }
}
