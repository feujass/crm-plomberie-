import { backendFetch } from "@/lib/backend/server";
import { fromDbAdresse } from "@/lib/facturation/adresse";
import { facturXAlreadyGenerated, FACTURES_EINVOICING_BUCKET } from "@/lib/facturation/embed-facturx";
import { facturXSourceFromDetail } from "@/lib/facturation/from-detail";
import { parseRegimeTva } from "@/lib/facturation/regime-tva";
import { renderFactureVisualPdf } from "@/lib/facturation/render-facture-visual";
import {
  buildSnapshotClient,
  buildSnapshotEmetteur,
  deriveTypeClient,
  parseSnapshotClient,
  parseSnapshotEmetteur,
} from "@/lib/facturation/snapshots";
import { resolveProfileLogoUrl } from "@/lib/supabase/logo-storage";
import { createClient } from "@/lib/supabase/server";
import type { BackendClient, BackendFactureDetail, BackendProfile } from "@/types/backend";
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

  const safeName = (facture.numero ?? `facture-${id}`).replace(/[^\w.-]+/g, "_");
  const pdfHeaders = {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
    "Cache-Control": "no-store",
  };

  if (facturXAlreadyGenerated(facture) && facture.facturx_pdf_path) {
    const supabase = await createClient();
    const { data, error } = await supabase.storage.from(FACTURES_EINVOICING_BUCKET).download(facture.facturx_pdf_path);
    if (!error && data) {
      return new NextResponse(Buffer.from(await data.arrayBuffer()), { headers: pdfHeaders });
    }
  }

  let profile: BackendProfile = {};
  try {
    profile = (await backendFetch("/api/profile")) as BackendProfile;
  } catch {
    profile = {};
  }

  let clientRow: BackendClient | null = null;
  if (facture.client_id) {
    try {
      clientRow = (await backendFetch(`/api/clients/${facture.client_id}`)) as BackendClient;
    } catch {
      clientRow = null;
    }
  }

  const emetteur =
    parseSnapshotEmetteur(facture.snapshot_emetteur) ??
    buildSnapshotEmetteur({
      ...profile,
      regime_tva: parseRegimeTva(profile.regime_tva),
    });
  const typeClient = clientRow
    ? deriveTypeClient({
        secteur_public: clientRow.secteur_public,
        categorie_fiscale: clientRow.categorie_fiscale,
      })
    : "particulier";
  const clientSnap =
    parseSnapshotClient(facture.snapshot_client) ??
    buildSnapshotClient({
      nom: clientRow?.nom ?? facture.client_nom ?? "Client",
      prenom: clientRow?.prenom,
      type_client: typeClient,
      siren: clientRow?.siren,
      siret: clientRow?.siret,
      tva_intracom: clientRow?.tva_intracom,
      email: clientRow?.email,
      tel: clientRow?.tel,
      adresse_facturation: clientRow
        ? fromDbAdresse(clientRow as unknown as Record<string, unknown>, {
            ligne1: "adresse_facturation_ligne1",
            ligne2: "adresse_facturation_ligne2",
            cp: "adresse_facturation_cp",
            ville: "adresse_facturation_ville",
            pays: "adresse_facturation_pays",
          })
        : undefined,
    });

  const source = facturXSourceFromDetail({ facture, emetteur, client: clientSnap });
  const logo = await resolveProfileLogoUrl((profile.logo_url ?? null) as string | null);
  const bytes = await renderFactureVisualPdf(source, logo);
  return new NextResponse(Buffer.from(bytes), { headers: pdfHeaders });
}
