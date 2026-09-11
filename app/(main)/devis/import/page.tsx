import { DevisImportClient } from "@/components/devis/DevisImportClient";
import { backendFetch } from "@/lib/backend/server";
import { devisPaywallPath } from "@/lib/plans/paywall";
import { isTrialExpired } from "@/lib/plans/trial";
import type { BackendClient, BackendMeResponse } from "@/types/backend";
import { redirect } from "next/navigation";

export default async function DevisImportPage() {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  if (isTrialExpired(me.profile)) redirect(devisPaywallPath());

  const clients = (await backendFetch("/api/clients")) as BackendClient[];
  const sorted = [...(clients ?? [])].sort((a, b) =>
    (a.nom || "").localeCompare(b.nom || "", "fr", { sensitivity: "base" }),
  );

  return <DevisImportClient clients={sorted} />;
}
