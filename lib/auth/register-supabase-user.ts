import type { createAdminClient } from "@/lib/supabase/admin";
import { translateSupabaseAuthError } from "@/lib/auth/supabase-auth-errors";

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

export type RegisterUserResult =
  | { ok: true; userId: string }
  | { ok: false; error: string; status: number; field?: "email" | "password" };

function isDuplicateUserError(message: string, code?: string): boolean {
  return (
    /already registered|already exists|User already registered|duplicate|already been registered/i.test(
      message,
    ) || code === "user_already_exists"
  );
}

/**
 * Crée le compte via l'API Admin (évite le rate limit signup public partagé par l'IP Vercel).
 * La session est ouverte côté navigateur après succès.
 */
export async function registerSupabaseUserWithAdmin(
  admin: SupabaseAdminClient,
  email: string,
  password: string,
): Promise<RegisterUserResult> {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    if (isDuplicateUserError(createError.message, createError.status?.toString())) {
      return {
        ok: false,
        error: "Cet e-mail est déjà utilisé. Connecte-toi ou réinitialise ton mot de passe.",
        status: 400,
        field: "email",
      };
    }

    const translated = translateSupabaseAuthError(createError.message);
    const field = /mot de passe|password/i.test(translated) ? "password" : "email";
    return { ok: false, error: translated, status: 400, field };
  }

  if (!created.user?.id) {
    return { ok: false, error: "Inscription incomplète.", status: 400, field: "email" };
  }

  return { ok: true, userId: created.user.id };
}
