import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const sp = await searchParams;
  const redirectTo = sp.redirect && sp.redirect.startsWith("/") ? sp.redirect : "/accueil";
  return <LoginForm redirectTo={redirectTo} />;
}
