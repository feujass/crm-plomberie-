import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const sp = await searchParams;
  const redirectTo = sp.redirect && sp.redirect.startsWith("/") ? sp.redirect : "/accueil";
  const backendConfigured = Boolean(process.env.BACKEND_URL?.length);
  return <LoginForm redirectTo={redirectTo} backendConfigured={backendConfigured} />;
}
