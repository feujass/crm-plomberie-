import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { BackendMeResponse } from "@/types/backend";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const backend = process.env.BACKEND_URL?.trim();
  if (!backend) throw new Error("BACKEND_URL manquant (voir .env.example).");
  // L’accès est déjà filtré par le middleware (présence du cookie).
  // Si le profil indique onboarding terminé, on redirige vers l’accueil.
  // (Sinon, on laisse les étapes s’afficher.)
  // Note: si le cookie est invalide, le layout (main) redirigera ensuite.
  const token = (await cookies()).get("access_token")?.value;
  const meRes = token
    ? await fetch(`${backend.replace(/\/+$/, "")}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
      }).catch(() => null)
    : null;
  const me = meRes ? ((await meRes.json().catch(() => null)) as BackendMeResponse | null) : null;
  const profile = me?.profile ?? {};
  const step = typeof profile?.onboarding_step === "number" ? profile.onboarding_step : 0;
  const complete = Boolean(profile?.onboarding_complete) || step >= 3;
  if (complete) redirect("/accueil");

  return (
    <div className="min-h-dvh bg-gray-50 px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-lg">{children}</div>
    </div>
  );
}
