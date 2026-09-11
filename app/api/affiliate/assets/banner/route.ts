import { createClient } from "@/lib/supabase/server";
import { resolvePartnerForUser } from "@/lib/affiliate/server";
import { affiliateStoryBannerSvg, affiliateWideBannerSvg } from "@/lib/affiliate/banner-svg";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "wide" ? "wide" : "story";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Non authentifié", { status: 401 });

  const partner = await resolvePartnerForUser(user.id, user.email);
  if (!partner || partner.status !== "active") {
    return new NextResponse("Accès partenaire requis", { status: 403 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const svg =
    format === "wide"
      ? affiliateWideBannerSvg({
          brandName: partner.brand_name,
          referralCode: partner.referral_code,
          siteUrl,
        })
      : affiliateStoryBannerSvg({
          brandName: partner.brand_name,
          referralCode: partner.referral_code,
          siteUrl,
        });

  const filename = `flowo-${format}-${partner.slug}.svg`;
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
