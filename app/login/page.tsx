import { LoginForm } from "./LoginForm";

import { pageMetadata } from "@/lib/seo/site-metadata";
import { isSupabaseAuthConfigured } from "@/lib/supabase/env";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Connexion",
  description: "Connecte-toi à ton espace Flowo pour gérer tes devis, clients et factures.",
  path: "/login",
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    redirect?: string;
    reset?: string;
    auth_error?: string;
    registered?: string;
    message?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const sp = await searchParams;
  const rawRedirect = sp.redirect && sp.redirect.startsWith("/") ? sp.redirect : "/accueil";
  const redirectTo = rawRedirect.startsWith("/partenaire") ? "/accueil" : rawRedirect;
  const backendConfigured = Boolean(process.env.BACKEND_URL?.length) || isSupabaseAuthConfigured();
  const passwordResetOk = sp.reset === "1";
  const authError = sp.auth_error === "callback";
  const registrationPending = sp.registered === "confirm";
  const registrationMessage = sp.message ?? null;
  const accountDeleted = sp.deleted === "1";
  const noCrmAccount = sp.error === "no_crm";
  return (
    <LoginForm
      redirectTo={redirectTo}
      backendConfigured={backendConfigured}
      passwordResetOk={passwordResetOk}
      authError={authError}
      registrationPending={registrationPending}
      registrationMessage={registrationMessage}
      accountDeleted={accountDeleted}
      noCrmAccount={noCrmAccount}
    />
  );
}
