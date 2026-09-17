import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeReferralCode } from "@/lib/affiliate/constants";
import {
  sendAffiliateApplicationConfirmation,
  sendAffiliateApplicationToSupport,
} from "@/lib/affiliate/emails";

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const match = data.users.find((u) => u.email?.trim().toLowerCase() === normalized);
  return match?.id ?? null;
}

export type AffiliateAudienceType = "formateur" | "influenceur" | "fournisseur" | "coach" | "autre";

export type AffiliateApplicationInput = {
  display_name: string;
  email: string;
  brand_name: string;
  phone?: string;
  audience_type?: AffiliateAudienceType;
  audience_size?: string;
  website_or_social?: string;
  pitch: string;
};

const AUDIENCE_TYPES = new Set<AffiliateAudienceType>([
  "formateur",
  "influenceur",
  "fournisseur",
  "coach",
  "autre",
]);

export function slugifyBrand(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function suggestReferralCode(brandName: string): string {
  const base = brandName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  return normalizeReferralCode(`${base || "FLOWO"}${new Date().getFullYear()}`);
}

async function ensureUniqueCode(admin: ReturnType<typeof createAdminClient>, base: string): Promise<string> {
  let code = normalizeReferralCode(base);
  for (let i = 0; i < 5; i++) {
    const { data } = await admin.from("affiliate_partners").select("id").eq("referral_code", code).maybeSingle();
    if (!data) return code;
    code = normalizeReferralCode(`${base}-${i + 2}`);
  }
  return normalizeReferralCode(`${base}-${Date.now().toString(36).toUpperCase()}`);
}

async function ensureUniqueSlug(admin: ReturnType<typeof createAdminClient>, base: string): Promise<string> {
  let slug = slugifyBrand(base);
  for (let i = 0; i < 5; i++) {
    const { data } = await admin.from("affiliate_partners").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${slugifyBrand(base)}-${i + 2}`;
  }
  return `${slugifyBrand(base)}-${Date.now().toString(36)}`;
}

export async function submitAffiliateApplication(input: AffiliateApplicationInput) {
  const displayName = input.display_name.trim();
  const email = input.email.trim().toLowerCase();
  const brandName = input.brand_name.trim();
  const pitch = input.pitch.trim();

  if (!displayName || !email || !brandName || !pitch) {
    return { ok: false as const, error: "Champs obligatoires manquants." };
  }
  const audienceType: AffiliateAudienceType =
    input.audience_type && AUDIENCE_TYPES.has(input.audience_type) ? input.audience_type : "autre";

  const admin = createAdminClient();

  const { data: pending } = await admin
    .from("affiliate_applications")
    .select("id")
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();
  if (pending) {
    return { ok: false as const, error: "Une candidature est déjà en cours pour cet e-mail." };
  }

  const { data: existingPartner } = await admin.from("affiliate_partners").select("id").eq("email", email).maybeSingle();
  if (existingPartner) {
    return { ok: false as const, error: "Cet e-mail est déjà partenaire Flowo." };
  }

  const { data, error } = await admin
    .from("affiliate_applications")
    .insert({
      display_name: displayName,
      email,
      brand_name: brandName,
      phone: input.phone?.trim() || null,
      audience_type: audienceType,
      audience_size: input.audience_size?.trim() || null,
      website_or_social: input.website_or_social?.trim() || null,
      pitch,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  const [supportMail, confirmMail] = await Promise.all([
    sendAffiliateApplicationToSupport({
      displayName,
      email,
      brandName,
      phone: input.phone,
      audienceType,
      audienceSize: input.audience_size,
      websiteOrSocial: input.website_or_social,
      pitch,
    }),
    sendAffiliateApplicationConfirmation({ email, displayName, brandName }),
  ]);
  if (!supportMail.ok) {
    console.error("[affiliate] E-mail admin candidature non envoyé:", supportMail.error);
  }
  if (!confirmMail.ok) {
    console.error("[affiliate] E-mail confirmation candidat non envoyé:", confirmMail.error);
  }

  return { ok: true as const, id: String(data.id) };
}

export async function approveAffiliateApplication(params: {
  applicationId: string;
  referralCode?: string;
  slug?: string;
  userId?: string | null;
}) {
  const admin = createAdminClient();
  const { data: app } = await admin
    .from("affiliate_applications")
    .select("*")
    .eq("id", params.applicationId)
    .eq("status", "pending")
    .maybeSingle();

  if (!app) return { ok: false as const, error: "Candidature introuvable ou déjà traitée." };

  let linkedUserId = params.userId ?? null;
  if (!linkedUserId) {
    linkedUserId = await findAuthUserIdByEmail(String(app.email));
  }

  const code = await ensureUniqueCode(
    admin,
    params.referralCode?.trim() || suggestReferralCode(String(app.brand_name)),
  );
  const slug = await ensureUniqueSlug(admin, params.slug?.trim() || String(app.brand_name));

  const { data: partner, error } = await admin
    .from("affiliate_partners")
    .insert({
      user_id: linkedUserId,
      email: String(app.email),
      display_name: String(app.display_name),
      brand_name: String(app.brand_name),
      phone: app.phone ? String(app.phone) : null,
      referral_code: code,
      slug,
      status: "active",
      commission_rate_percent: 20,
    })
    .select("*")
    .single();

  if (error) return { ok: false as const, error: error.message };

  await admin
    .from("affiliate_applications")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      partner_id: partner.id,
    })
    .eq("id", params.applicationId);

  const { sendAffiliateApprovedEmail } = await import("@/lib/affiliate/emails");
  void sendAffiliateApprovedEmail({
    email: String(app.email),
    displayName: String(app.display_name),
    brandName: String(app.brand_name),
    referralCode: code,
  });

  return { ok: true as const, partnerId: String(partner.id), referralCode: code };
}

export type AffiliateApplicationRow = {
  id: string;
  display_name: string;
  email: string;
  brand_name: string;
  phone: string | null;
  audience_type: string;
  audience_size: string | null;
  website_or_social: string | null;
  pitch: string;
  status: string;
  created_at: string;
};

export async function listAffiliateApplications(status?: "pending" | "approved" | "rejected") {
  const admin = createAdminClient();
  let q = admin
    .from("affiliate_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    display_name: String(row.display_name),
    email: String(row.email),
    brand_name: String(row.brand_name),
    phone: row.phone ? String(row.phone) : null,
    audience_type: String(row.audience_type),
    audience_size: row.audience_size ? String(row.audience_size) : null,
    website_or_social: row.website_or_social ? String(row.website_or_social) : null,
    pitch: String(row.pitch),
    status: String(row.status),
    created_at: String(row.created_at),
  })) satisfies AffiliateApplicationRow[];
}

export async function rejectAffiliateApplication(applicationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("affiliate_applications")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", applicationId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Candidature introuvable ou déjà traitée." };
  return { ok: true as const };
}
