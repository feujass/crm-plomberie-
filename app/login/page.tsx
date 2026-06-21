import { LoginForm } from "./LoginForm";

import { isSupabaseAuthConfigured } from "@/lib/supabase/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; reset?: string }>;
}) {
  const sp = await searchParams;
  const redirectTo = sp.redirect && sp.redirect.startsWith("/") ? sp.redirect : "/accueil";
  const backendConfigured = Boolean(process.env.BACKEND_URL?.length) || isSupabaseAuthConfigured();
  const passwordResetOk = sp.reset === "1";
  return <LoginForm redirectTo={redirectTo} backendConfigured={backendConfigured} passwordResetOk={passwordResetOk} />;
}
