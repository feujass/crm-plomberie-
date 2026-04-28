import { DevisPdfDocument } from "@/components/pdf/DevisPdfDocument";
import { backendFetch } from "@/lib/backend/server";
import type { BackendClient, BackendDevisDetail, BackendProfile } from "@/types/backend";
import { pdf } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let devis: BackendDevisDetail | null = null;
  try {
    devis = (await backendFetch(`/api/devis/${id}`)) as BackendDevisDetail;
  } catch {
    devis = null;
  }
  if (!devis) return NextResponse.json({ message: "Introuvable" }, { status: 404 });

  const profile = (await backendFetch("/api/profile")) as BackendProfile;

  let client: { nom: string; prenom: string | null; adresse: string | null } | null = null;
  if (devis.client_id) {
    try {
      const c = (await backendFetch(`/api/clients/${devis.client_id}`)) as BackendClient;
      client = { nom: c.nom, prenom: c.prenom ?? null, adresse: c.adresse ?? null };
    } catch {
      client = null;
    }
  }

  const sorted = (devis.lignes ?? []).map((l, idx) => ({
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
    logo_url: (profile.logo_url ?? null) as string | null,
    mention_legale: (profile.mention_legale ?? null) as string | null,
    conditions_paiement_defaut: (profile.conditions_paiement ?? null) as string | null,
  };

  const blob = await pdf(
    <DevisPdfDocument
      profile={profilePdf}
      client={client}
      numero={devis.numero ?? `DEV-${id}`}
      lignes={sorted}
      total_ht={Number(devis.total_ht ?? 0)}
      total_tva={Number(devis.total_tva ?? 0)}
      total_ttc={Number(devis.total_ttc ?? 0)}
      notes={devis.notes ?? null}
    />
  ).toBlob();
  const buf = Buffer.from(await blob.arrayBuffer());

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${devis.numero}.pdf"`,
    },
  });
}
