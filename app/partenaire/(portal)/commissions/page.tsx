import { AffiliateCommissionsClient } from "@/components/affiliate/AffiliateDashboardClient";
import { Suspense } from "react";

export const metadata = { title: "Commissions — Partenaire Flowo" };

export default function PartenaireCommissionsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-center text-sm text-slate-500">Chargement…</p>}>
      <AffiliateCommissionsClient />
    </Suspense>
  );
}
