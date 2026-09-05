import { CompteConformiteArchiveClient } from "@/components/compte/CompteConformiteArchiveClient";
import { CompteSubLayout } from "@/components/compte/CompteSubLayout";
import { backendFetch } from "@/lib/backend/server";
import { requireFeature } from "@/lib/plans/require-feature";
import { labelBranche, labelTransmissionKind, labelTransmissionStatus } from "@/lib/conformite/matrix";
import type { BackendTransmission } from "@/types/backend";
import Link from "next/link";

type AuditRow = {
  id?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  created_at?: string;
};

export default async function CompteConformitePage() {
  await requireFeature("conformite");
  let transmissions: BackendTransmission[] = [];
  let audit: AuditRow[] = [];
  try {
    transmissions = (await backendFetch("/api/conformite/transmissions?limit=40")) as BackendTransmission[];
  } catch {
    transmissions = [];
  }
  try {
    audit = (await backendFetch("/api/conformite/audit?limit=25")) as AuditRow[];
  } catch {
    audit = [];
  }

  return (
    <CompteSubLayout
      title="Conformité facturation"
      description="E-invoicing, e-reporting, Chorus Pro, audit et archivage (France)."
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="font-semibold text-[var(--foreground)]">Documentation</p>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Référence projet : <code className="text-xs">docs/conformite-france.md</code>,{" "}
            <code className="text-xs">docs/RGPD-FLOWO.md</code>.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="font-semibold text-[var(--foreground)]">Archivage & preuve</p>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Export JSON : factures, transmissions, journal d&apos;audit, devis.
          </p>
          <CompteConformiteArchiveClient />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="font-semibold text-[var(--foreground)]">Dernières transmissions</p>
          {transmissions.length === 0 ? (
            <p className="mt-2 text-gray-500">Aucune transmission enregistrée.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {transmissions.map((t) => (
                <li
                  key={`${t.id ?? t.created_at}-${t.facture_id}-${t.kind}`}
                  className="rounded-lg border border-gray-100 bg-gray-50/80 px-2 py-2 dark:border-gray-800 dark:bg-gray-950/40"
                >
                  <span className="font-medium">{labelTransmissionKind(String(t.kind))}</span>
                  {" — "}
                  <span>{labelTransmissionStatus(String(t.status))}</span>
                  {t.facture_id ? (
                    <>
                      {" "}
                      <Link href={`/facturation/${t.facture_id}`} className="text-sky-600 hover:underline">
                        Facture
                      </Link>
                    </>
                  ) : null}
                  {t.detail ? <span className="mt-1 block text-xs text-gray-500">{t.detail}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="font-semibold text-[var(--foreground)]">Journal d&apos;audit (extrait)</p>
          {audit.length === 0 ? (
            <p className="mt-2 text-gray-500">Aucun événement.</p>
          ) : (
            <ul className="mt-2 max-h-64 space-y-1 overflow-auto font-mono text-xs text-gray-700 dark:text-gray-300">
              {audit.map((a) => (
                <li key={a.id ?? `${a.created_at}-${a.action}`}>
                  {a.created_at?.slice(0, 19) ?? "—"} — {a.action} — {a.entity_type} {a.entity_id}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Les libellés de branche (B2B/B2C) sont indicatifs :{" "}
          <span className="font-medium">{labelBranche("b2b_fr_tva")}</span>.
        </p>
      </div>
    </CompteSubLayout>
  );
}
