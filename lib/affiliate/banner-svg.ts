import { buildReferralUrl } from "@/lib/affiliate/constants";

export function affiliateStoryBannerSvg(params: {
  brandName: string;
  referralCode: string;
  siteUrl?: string;
}): string {
  const link = buildReferralUrl(params.referralCode, params.siteUrl);
  const brand = escapeXml(params.brandName.slice(0, 40));
  const shortLink = escapeXml(link.replace(/^https?:\/\//, ""));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <text x="80" y="200" fill="#93c5fd" font-family="system-ui, sans-serif" font-size="36" font-weight="600">PARTENAIRE FLOWO</text>
  <text x="80" y="420" fill="#ffffff" font-family="system-ui, sans-serif" font-size="72" font-weight="800">${brand}</text>
  <text x="80" y="540" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="42" font-weight="500">Recommande Flowo aux artisans</text>
  <text x="80" y="620" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="42" font-weight="500">Devis à la voix en 30 secondes</text>
  <rect x="80" y="760" width="920" height="200" rx="24" fill="#ffffff"/>
  <text x="120" y="870" fill="#1d4ed8" font-family="system-ui, sans-serif" font-size="40" font-weight="700">Essai gratuit →</text>
  <text x="80" y="1100" fill="#cbd5e1" font-family="monospace" font-size="32">${shortLink}</text>
  <text x="80" y="1800" fill="#64748b" font-family="system-ui, sans-serif" font-size="28">20% de commission récurrente</text>
</svg>`;
}

export function affiliateWideBannerSvg(params: {
  brandName: string;
  referralCode: string;
  siteUrl?: string;
}): string {
  const link = buildReferralUrl(params.referralCode, params.siteUrl);
  const brand = escapeXml(params.brandName.slice(0, 50));
  const shortLink = escapeXml(link.replace(/^https?:\/\//, ""));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0f172a"/>
  <rect x="0" y="0" width="1200" height="8" fill="#2563eb"/>
  <text x="60" y="120" fill="#60a5fa" font-family="system-ui, sans-serif" font-size="28" font-weight="600">FLOWO · PARTENAIRE</text>
  <text x="60" y="220" fill="#ffffff" font-family="system-ui, sans-serif" font-size="52" font-weight="800">${brand} recommande Flowo</text>
  <text x="60" y="300" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="32">CRM &amp; devis vocal pour artisans BTP</text>
  <rect x="60" y="360" width="340" height="72" rx="12" fill="#2563eb"/>
  <text x="100" y="410" fill="#ffffff" font-family="system-ui, sans-serif" font-size="28" font-weight="700">Essai gratuit</text>
  <text x="60" y="520" fill="#94a3b8" font-family="monospace" font-size="24">${shortLink}</text>
</svg>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
