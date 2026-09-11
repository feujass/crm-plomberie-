import { FacturePdfDocument } from "@/components/pdf/FacturePdfDocument";
import { backendFetch } from "@/lib/backend/server";
import { resolveProfileLogoUrl } from "@/lib/supabase/logo-storage";
import { formatDateFr } from "@/lib/format";
import type { BackendClient, BackendFactureDetail, BackendProfile } from "@/types/backend";
import { pdf } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let facture: BackendFactureDetail | null = null;
  try {
    facture = (await backendFetch(`/api/factures/${id}`)) as BackendFactureDetail;
  } catch {
    facture = null;
  }
  if (!facture) return NextResponse.json({ message: "Introuvable" }, { status: 404 });

  let profile: BackendProfile = {};
  try {
    profile = (await backendFetch("/api/profile")) as BackendProfile;
  } catch {
    profile = {};
  }

  let client: { nom: string; prenom: string | null; adresse: string | null } | null = null;
  if (facture.client_id) {
    try {
      const c = (await backendFetch(`/api/clients/${facture.client_id}`)) as BackendClient;
      client = { nom: c.nom, prenom: c.prenom ?? null, adresse: c.adresse ?? null };
    } catch {
      client = null;
    }
  }

  const sorted = (facture.lignes ?? []).map((l, idx) => ({
    id: `l-${idx}`,
    designation: l.designation,
    quantite: Number(l.quantite ?? 1),
    unite: l.unite ?? "u",
    prix_ht: Number(l.prix_ht ?? 0),
    tva: Number(l.tva ?? 10),
    total_ht: Number(l.total_ht ?? (Number(l.quantite ?? 1) * Number(l.prix_ht ?? 0))),
  }));

  const profilePdf = {
    entreprise_nom: (profile.entreprise ?? null) as string | null,
    adresse: (profile.adresse ?? null) as string | null,
    tel: (profile.tel ?? null) as string | null,
    email_facturation: (profile.email_facturation ?? null) as string | null,
    siret: (profile.siret ?? null) as string | null,
    logo_url: await resolveProfileLogoUrl((profile.logo_url ?? null) as string | null),
    mention_legale: (profile.mention_legale ?? null) as string | null,
    conditions_paiement_defaut: (profile.conditions_paiement ?? null) as string | null,
  };

  const rawDate = facture.date_emission ?? facture.created_at;
  const dateEmissionLabel = rawDate ? formatDateFr(String(rawDate)) : "—";

  const blob = await pdf(
    <FacturePdfDocument
      profile={profilePdf}
      client={client}
      numero={facture.numero ?? `FACT-${id}`}
      dateEmissionLabel={dateEmissionLabel}
      lignes={sorted}
      total_ht={Number(facture.total_ht ?? 0)}
      total_tva={Number(facture.total_tva ?? 0)}
      total_ttc={Number(facture.total_ttc ?? 0)}
      notes={facture.notes ?? null}
    />,
  ).toBlob();
  const buf = Buffer.from(await blob.arrayBuffer());

  const safeName = (facture.numero ?? `facture-${id}`).replace(/[^\w.-]+/g, "_");

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
    },
  });
}
