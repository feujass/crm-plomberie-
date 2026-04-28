"use client";

import { cx, focusRing } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { EtapeMetier } from "@/lib/chantier";
import type { BackendClient, BackendDevis } from "@/types/backend";
import type { Chantier } from "@/types/chantiers";

import { ChantierCreateForm } from "./ChantierCreateForm";

type SortMode = "due" | "progress";

type Props = {
  initialChantiers: Chantier[];
  clients: BackendClient[];
  devis: BackendDevis[];
};

function etapeIndex(e: string) {
  const order: EtapeMetier[] = ["terrassement", "maconnerie", "plomberie", "electricite", "finitions", "reception_client"];
  const i = order.indexOf(e as EtapeMetier);
  return i < 0 ? 0 : i;
}

function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function ChantiersBoard({ initialChantiers, clients, devis }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialChantiers);
  const [sort, setSort] = useState<SortMode>("due");

  useEffect(() => {
    setRows(initialChantiers);
  }, [initialChantiers]);

  const getClientName = (id: string | null | undefined) => {
    if (!id) return "—";
    const c = clients.find((x) => String(x.id) === String(id));
    return c ? [c.prenom, c.nom].filter(Boolean).join(" ").trim() || c.nom : "—";
  };

  const alertes = useMemo(() => {
    const items: { id: string; chantierId: string; type: "warning" | "danger"; message: string }[] = [];
    const today = todayMidnight();
    for (const p of rows) {
      if (p.status === "Terminé") continue;
      if (p.a_relancer) {
        items.push({ id: `rel-${p.id}`, chantierId: p.id, type: "danger", message: `À relancer · ${p.name}` });
      }
      if (p.due_date) {
        const due = new Date(`${p.due_date}T12:00:00`);
        const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
        if (diff >= 0 && diff <= 7) {
          items.push({
            id: `due-${p.id}`,
            chantierId: p.id,
            type: "warning",
            message: `Échéance ${diff <= 0 ? "aujourd'hui" : `dans ${diff} j`} · ${p.name}`,
          });
        }
      }
    }
    return items;
  }, [rows]);

  const sorted = useMemo(() => {
    const list = [...rows];
    if (sort === "due") {
      list.sort((a, b) => String(a.due_date ?? "9999-12-31").localeCompare(String(b.due_date ?? "9999-12-31")));
    } else {
      list.sort((a, b) => etapeIndex(String(b.etape_metier ?? "")) - etapeIndex(String(a.etape_metier ?? "")));
    }
    return list;
  }, [rows, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Chantiers</h1>
        <Link
          href="/chantiers/nouveau"
          className="rounded-lg bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-95"
        >
          Nouveau chantier
        </Link>
      </div>

      {alertes.length ? (
        <Card title="Alertes">
          <div className="flex flex-col gap-2">
            {alertes.map((a) => (
              <Link
                key={a.id}
                href={`/chantiers/${a.chantierId}`}
                className={cx(
                  "rounded-lg border px-3 py-2 text-left text-sm font-semibold transition hover:opacity-90",
                  a.type === "danger"
                    ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100"
                    : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100",
                  focusRing,
                )}
              >
                {a.message}
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="hidden lg:block">
          <Card title="Nouveau chantier">
            <ChantierCreateForm
              clients={clients}
              devis={devis}
              onCreated={(c) => {
                setRows((r) => [c, ...r]);
                router.refresh();
              }}
            />
          </Card>
        </div>

        <Card title="Mes chantiers">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--muted-foreground)]">Appuyez sur une ligne pour ouvrir la fiche complète.</p>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant={sort === "due" ? "secondary" : "ghost"} onClick={() => setSort("due")}>
                Échéance
              </Button>
              <Button type="button" variant={sort === "progress" ? "secondary" : "ghost"} onClick={() => setSort("progress")}>
                Avancement
              </Button>
            </div>
          </div>

          <ul className="flex flex-col gap-2">
            {sorted.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/chantiers/${p.id}`}
                  className={cx(
                    "flex min-h-[52px] items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 transition hover:border-[color:var(--primary)]/40 hover:bg-[var(--muted)]/50",
                    focusRing,
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[var(--foreground)]">{p.name}</span>
                      {p.a_relancer || p.status === "Urgent" ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-900 dark:bg-red-950/40 dark:text-red-100">
                          Relance
                        </span>
                      ) : null}
                      {p.status ? (
                        <span className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--foreground)]">
                          {p.status}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
                      {getClientName(p.client_id)}
                      {p.due_date ? ` · Échéance ${p.due_date}` : ""}
                      {p.site_address ? ` · ${p.site_address}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-[var(--muted-foreground)]" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>

          {sorted.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">Aucun chantier pour l&apos;instant.</p>
          ) : null}

          <p className="mt-4 text-center text-sm lg:hidden">
            <Link href="/chantiers/nouveau" className="font-semibold text-[color:var(--primary)] hover:underline">
              + Créer un chantier
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
