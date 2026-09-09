import { backendFetch, type BackendFetchError } from "@/lib/backend/server";
import { buildFacturXXml } from "@/lib/facturation/build-facturx-xml";
import { eligibilityFacturX } from "@/lib/facturation/emission-gate";
import { embedFacturXPdf, FACTURES_EINVOICING_BUCKET, facturXAlreadyGenerated, facturXStoragePath } from "@/lib/facturation/embed-facturx";
import { facturXSourceFromDetail } from "@/lib/facturation/from-detail";
import { franceRfeReady, franceRfeSummaryLine, franceRfeValidateXml } from "@/lib/facturation/france-rfe";
import { InvoiceValidationError } from "@/lib/facturation/pa/errors";
import { attachSuperPdpRoutingAddresses } from "@/lib/facturation/pa/superpdp-routing";
import { renderFactureVisualPdf } from "@/lib/facturation/render-facture-visual";
import { parseSnapshotClient, parseSnapshotEmetteur } from "@/lib/facturation/snapshots";
import { resolveProfileLogoUrl } from "@/lib/supabase/logo-storage";
import { assertFeatureApi, loadProfileForGating } from "@/lib/plans/require-feature";
import { createClient } from "@/lib/supabase/server";
import type { BackendClient, BackendFactureDetail, BackendProfile } from "@/types/backend";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

function httpError(err: unknown): { status: number; message: string } {
  const e = err as BackendFetchError;
  const status = typeof e.status === "number" && e.status >= 400 && e.status < 600 ? e.status : 502;
  return { status, message: e instanceof Error ? e.message : "Erreur" };
}

async function loadFacture(id: string): Promise<BackendFactureDetail | null> {
  try {
    return (await backendFetch(`/api/factures/${id}`)) as BackendFactureDetail;
  } catch {
    return null;
  }
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const profile = await loadProfileForGating();
  const blocked = assertFeatureApi(profile, "facturation");
  if (blocked) {
    return NextResponse.json({ message: blocked }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }

  const facture = await loadFacture(id);
  if (!facture) {
    return NextResponse.json({ message: "Introuvable" }, { status: 404 });
  }

  const storagePath = facture.facturx_pdf_path?.trim() || facturXStoragePath(user.id, id);
  const { data, error } = await supabase.storage.from(FACTURES_EINVOICING_BUCKET).download(storagePath);
  if (error || !data) {
    return NextResponse.json({ message: "Fichier Factur-X introuvable. Générez-le d’abord." }, { status: 404 });
  }

  const buf = Buffer.from(await data.arrayBuffer());
  const safeName = (facture.numero ?? `facture-${id}`).replace(/[^\w.-]+/g, "_");
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}-facturx.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const gatingProfile = await loadProfileForGating();
  const blocked = assertFeatureApi(gatingProfile, "facturation");
  if (blocked) {
    return NextResponse.json({ message: blocked }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }

  const facture = await loadFacture(id);
  if (!facture) {
    return NextResponse.json({ message: "Introuvable" }, { status: 404 });
  }

  if (facturXAlreadyGenerated(facture)) {
    return NextResponse.json(
      { message: "Document légal déjà généré : il ne peut plus être régénéré ni écrasé." },
      { status: 409 },
    );
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

  const snapshotEmetteur = parseSnapshotEmetteur(facture.snapshot_emetteur);
  const snapshotClient = parseSnapshotClient(facture.snapshot_client);
  const clientType = snapshotClient?.type_client ?? "particulier";

  const gate = eligibilityFacturX({
    emetteurAdresse: snapshotEmetteur?.adresse ?? null,
    emetteurConfirmeeAt: profile.adresse_structure_confirmee_at,
    clientType,
    clientAdresse: snapshotClient?.adresse_facturation ?? null,
    clientConfirmeeAt: clientRow?.adresse_structure_confirmee_at,
    natureOperation: (facture.nature_operation as "biens" | "services" | "mixte") ?? null,
    datePrestationDebut: facture.date_prestation_debut,
    datePrestationFin: facture.date_prestation_fin,
    regimeTva: snapshotEmetteur?.regime_tva ?? profile.regime_tva ?? "encaissements",
    snapshotEmetteur,
    snapshotClient,
    numero: facture.numero,
  });
  if (!gate.ok) {
    return NextResponse.json({ message: gate.reason, blockers: gate.blockers }, { status: 422 });
  }
  if (!snapshotEmetteur || !snapshotClient) {
    return NextResponse.json({ message: "Snapshots émetteur / client manquants." }, { status: 422 });
  }

  try {
    let source = facturXSourceFromDetail({ facture, emetteur: snapshotEmetteur, client: snapshotClient });
    source = await attachSuperPdpRoutingAddresses(supabase, user.id, source);
    const xml = buildFacturXXml(source);
    if (franceRfeReady()) {
      const franceRfe = franceRfeValidateXml(xml);
      if (!franceRfe.ok) {
        const failures = franceRfe.failures
          .map((f) => `${f.id}: ${f.text}`.trim())
          .filter(Boolean);
        throw new InvoiceValidationError(failures.length > 0 ? failures : [franceRfeSummaryLine(franceRfe)]);
      }
    }
    const logo = await resolveProfileLogoUrl((profile.logo_url ?? null) as string | null);
    const visual = await renderFactureVisualPdf(source, logo);
    const pdfBytes = await embedFacturXPdf(visual, xml, {
      author: snapshotEmetteur.entreprise_nom,
      title: `Facture ${source.numero}`,
      date: new Date(`${source.dateEmission}T12:00:00Z`),
    });

    const storagePath = facturXStoragePath(user.id, id);
    const { error: uploadError } = await supabase.storage
      .from(FACTURES_EINVOICING_BUCKET)
      .upload(storagePath, Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        upsert: false,
      });
    if (uploadError) {
      const duplicate = /already exists|duplicate|resource already exists/i.test(uploadError.message);
      return NextResponse.json(
        {
          message: duplicate
            ? "Document légal déjà généré : il ne peut plus être régénéré ni écrasé."
            : `Stockage : ${uploadError.message}`,
        },
        { status: duplicate ? 409 : 500 },
      );
    }

    const { data: locked, error: updateError } = await supabase
      .from("factures")
      .update({ facturx_xml: xml, facturx_pdf_path: storagePath })
      .eq("id", id)
      .eq("user_id", user.id)
      .is("facturx_pdf_path", null)
      .select("id");
    if (updateError) {
      return NextResponse.json({ message: updateError.message }, { status: 500 });
    }
    if (!locked?.length) {
      return NextResponse.json(
        { message: "Document légal déjà généré : il ne peut plus être régénéré ni écrasé." },
        { status: 409 },
      );
    }

    revalidatePath("/facturation");
    revalidatePath(`/facturation/${id}`);

    return NextResponse.json({
      ok: true,
      path: storagePath,
      numero: source.numero,
    });
  } catch (err) {
    if (err instanceof InvoiceValidationError) {
      return NextResponse.json({ message: err.message, failures: err.failures }, { status: 422 });
    }
    const { status, message } = httpError(err);
    const msg = err instanceof Error ? err.message : message;
    return NextResponse.json({ message: msg }, { status: status === 502 ? 500 : status });
  }
}
