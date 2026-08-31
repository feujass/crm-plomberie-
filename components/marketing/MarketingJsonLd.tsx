import { MARKETING_PLANS } from "@/components/marketing/marketing-data";
import { SITE_URL } from "@/lib/seo/site-metadata";

export function MarketingJsonLd() {
  const offers = MARKETING_PLANS.map((plan) => ({
    "@type": "Offer",
    name: plan.name,
    price: plan.monthlyEur,
    priceCurrency: "EUR",
    description: plan.description,
    url: `${SITE_URL}/register`,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Flowo",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "fr",
    description:
      "CRM et devis vocal pour plombiers et artisans BTP. Dictée vocale, génération de devis par IA, facturation conforme 2026.",
    url: SITE_URL,
    offers,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
