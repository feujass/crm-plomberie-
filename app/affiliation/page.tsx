import { AffiliationLandingClient } from "@/components/affiliate/AffiliationLandingClient";
import { pageMetadata } from "@/lib/seo/site-metadata";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Programme partenaire",
  description: "Deviens partenaire Flowo : 20 % de commission récurrente, dashboard dédié et liens de parrainage.",
  path: "/affiliation",
});

export default function AffiliationPage() {
  return <AffiliationLandingClient />;
}
