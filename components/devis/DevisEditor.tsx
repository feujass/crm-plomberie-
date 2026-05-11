"use client";

import type { DevisLigneInput } from "@/types/devis";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { computeDevisTotals, ligneTotalHt } from "@/lib/devis-math";
import { formatCurrencyEUR } from "@/lib/format";
import type { BackendClient, BackendDevisDetail, BackendDevisLine } from "@/types/backend";
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/planner/Drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/planner/DropdownMenu";
import { MoreHorizontal } from "lucide-react";

/** Clé stable pour le DnD ; `crypto.randomUUID` est absent en HTTP sur certains navigateurs mobiles. */
function clientRandomId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

type LigneState = DevisLigneInput & { id: string };

function SortableLigne({
  ligne,
  onChange,
  onRemove,
}: {
  ligne: LigneState;
  onChange: (id: string, patch: Partial<LigneState>) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ligne.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="mb-2 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
      <button type="button" className="touch-target cursor-grab px-1 text-slate-400" {...attributes} {...listeners} aria-label="Déplacer">
        ⋮⋮
      </button>
      <Input
        label="Désignation"
        className="min-w-[140px] flex-1"
        value={ligne.designation}
        onChange={(e) => onChange(ligne.id, { designation: e.target.value })}
      />
      <div className="w-20">
        <Input label="Qté" type="number" value={ligne.quantite} onChange={(e) => onChange(ligne.id, { quantite: Number(e.target.value) })} />
      </div>
      <div className="w-24">
        <Input label="Unité" value={ligne.unite} onChange={(e) => onChange(ligne.id, { unite: e.target.value })} />
      </div>
      <div className="w-28">
        <Input label="PU HT" type="number" value={ligne.prix_ht} onChange={(e) => onChange(ligne.id, { prix_ht: Number(e.target.value) })} />
      </div>
      <div className="w-24">
        <Input label="TVA %" type="number" value={ligne.tva} onChange={(e) => onChange(ligne.id, { tva: Number(e.target.value) })} />
      </div>
      <div className="w-28 text-sm text-slate-600">
        Ligne HT : {formatCurrencyEUR(ligneTotalHt({ quantite: ligne.quantite, prix_ht: ligne.prix_ht }))}
      </div>
      <Button type="button" variant="danger" onClick={() => onRemove(ligne.id)}>
        ×
      </Button>
    </div>
  );
}

export function DevisEditor({
  devis,
  clients,
}: {
  devis: BackendDevisDetail;
  clients: BackendClient[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [bannerErr, setBannerErr] = useState<string | null>(null);
  const [bannerOk, setBannerOk] = useState<string | null>(null);
  const sp = useSearchParams();
  const info = sp.get("info");
  const [clientId, setClientId] = useState<string>(devis.client_id ?? "");
  const [sendDrawerOpen, setSendDrawerOpen] = useState(false);
  const [sendEmailTo, setSendEmailTo] = useState("");
  const [lastAutoEmail, setLastAutoEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [notes, setNotes] = useState(devis.notes ?? "");
  const [dateExp, setDateExp] = useState(devis.date_expiration ?? "");
  const [remiseType, setRemiseType] = useState<"percent" | "fixed" | "">(
    devis.remise_type === "pourcentage" ? "percent" : devis.remise_type === "montant" ? "fixed" : "",
  );
  const [remiseValue, setRemiseValue] = useState<number | "">(devis.remise_valeur ?? "");
  const [lignes, setLignes] = useState<LigneState[]>(() =>
    (devis.lignes ?? []).map((l: BackendDevisLine, i: number) => ({
      id: `l-${i}-${clientRandomId()}`,
      section: l.section ?? null,
      designation: l.designation,
      quantite: Number(l.quantite ?? 1),
      unite: l.unite ?? "u",
      prix_ht: Number(l.prix_ht ?? 0),
      tva: Number(l.tva ?? 10),
      ordre: i,
      ligne_type: "prestation",
    })),
  );
  const [internalNotesHist, setInternalNotesHist] = useState(devis.internal_notes ?? "");
  const [noteInterne, setNoteInterne] = useState("");
  const [adresseChantier, setAdresseChantier] = useState(devis.adresse_chantier ?? "");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const totals = useMemo(() => {
    const mapped = lignes.map((l) => ({
      total_ht: ligneTotalHt({ quantite: l.quantite, prix_ht: l.prix_ht }),
      tva: l.tva,
    }));
    return computeDevisTotals(
      mapped,
      remiseType || null,
      remiseValue === "" ? null : Number(remiseValue)
    );
  }, [lignes, remiseType, remiseValue]);

  function onDragEnd(ev: DragEndEvent) {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    setLignes((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      return arrayMove(items, oldIndex, newIndex).map((l, idx) => ({ ...l, ordre: idx }));
    });
  }

  function patchLigne(id: string, patch: Partial<LigneState>) {
    setLignes((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLigne() {
    setLignes((ls) => [
      ...ls,
      {
        id: `n-${clientRandomId()}`,
        section: null,
        designation: "Nouvelle ligne",
        quantite: 1,
        unite: "u",
        prix_ht: 0,
        tva: 10,
        ordre: ls.length,
        ligne_type: "prestation",
      },
    ]);
  }

  function removeLigne(id: string) {
    setLignes((ls) => ls.filter((l) => l.id !== id).map((l, idx) => ({ ...l, ordre: idx })));
  }

  function save() {
    const payload = {
      devisId: devis.id,
      client_id: clientId || null,
      notes: notes || null,
      date_expiration: dateExp || null,
      remise_type: remiseType || null,
      remise_value: remiseValue === "" ? null : Number(remiseValue),
      lignes: lignes.map((l, idx) => ({
        section: l.section,
        designation: l.designation,
        quantite: l.quantite,
        unite: l.unite,
        prix_ht: l.prix_ht,
        tva: l.tva,
        ordre: idx,
        ligne_type: l.ligne_type,
      })),
    };
    start(async () => {
      setBannerErr(null);
      setBannerOk(null);
      /** Enregistrement via `/api/devis/[id]/save` — pas de Server Action (évite E394 sur `fetchServerAction`). */
      const res = await fetch(`/api/devis/${devis.id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          client_id: payload.client_id,
          notes: payload.notes,
          date_expiration: payload.date_expiration,
          remise_type: payload.remise_type,
          remise_value: payload.remise_value,
          adresse_chantier: adresseChantier || null,
          lignes: payload.lignes,
        }),
      });
      let data: { message?: string; ok?: boolean } = {};
      try {
        data = await res.json();
      } catch {
        setBannerErr("Réponse serveur invalide");
        return;
      }
      if (!res.ok) {
        setBannerErr(typeof data.message === "string" ? data.message : `Erreur ${res.status}`);
        return;
      }
      setBannerOk("Devis enregistré.");
      router.refresh();
    });
  }

  const selectedClient = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);
  const clientLabel = useMemo(() => {
    if (!selectedClient) return "Client";
    const n = [selectedClient.prenom, selectedClient.nom].filter(Boolean).join(" ").trim();
    return n || selectedClient.nom || "Client";
  }, [selectedClient]);

  // Pré-remplissage auto de l’e-mail lorsque l’utilisateur sélectionne un client.
  // Règle: on ne remplace pas si l'utilisateur a déjà tapé autre chose.
  useEffect(() => {
    const nextEmail = (selectedClient?.email ?? "").trim();
    if (!nextEmail) return;
    setSendEmailTo((prev) => {
      const p = prev.trim();
      if (!p) {
        setLastAutoEmail(nextEmail);
        return nextEmail;
      }
      // Si le champ contient encore l'ancienne valeur auto, on met à jour.
      if (p === lastAutoEmail) {
        setLastAutoEmail(nextEmail);
        return nextEmail;
      }
      return prev;
    });
  }, [selectedClient?.email, lastAutoEmail]);

  const statut = devis.statut ?? "";
  const statutLabel =
    statut === "brouillon"
      ? "Brouillon"
      : statut === "envoye"
        ? "Devis disponible"
        : statut === "accepte"
          ? "Accepté"
          : statut === "refuse"
            ? "Refusé"
            : statut === "facture"
              ? "Facturé"
              : statut === "archive"
                ? "Archivé"
                : statut === "expire"
                  ? "Expiré"
                  : "Devis";

  async function sendByEmail() {
    const to = sendEmailTo.trim() || String(selectedClient?.email ?? "").trim();
    if (!to) {
      setBannerErr("Renseigne l’e-mail du client pour envoyer le devis.");
      return;
    }
    setSending(true);
    setBannerErr(null);
    setBannerOk(null);
    try {
      const res = await fetch(`/api/devis/${devis.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ to }),
      });
      const data = (await res.json().catch(() => ({} as { ok?: boolean; mode?: string; error?: string }))) as {
        ok?: boolean;
        mode?: string;
        error?: string;
      };
      if (!res.ok) throw new Error("Erreur d’envoi");
      setSendDrawerOpen(false);
      if (data.ok) {
        setBannerOk(`Devis envoyé à ${to}.`);
        router.replace(`/devis/${encodeURIComponent(devis.id)}?info=email-sent`);
        router.refresh();
        return;
      }
      if (data.mode === "mock") {
        router.replace(`/devis/${encodeURIComponent(devis.id)}?info=email-mock&to=${encodeURIComponent(to)}`);
        router.refresh();
        return;
      }
      throw new Error(typeof data.error === "string" ? data.error : "Envoi impossible");
    } catch (e) {
      setBannerErr(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4 pb-24">
      {info === "no-ai" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          IA non configurée : devis créé en brouillon (tu peux le remplir manuellement).
        </div>
      ) : null}
      {info === "email-mock" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          Envoi e-mail en mode test : `RESEND_API_KEY` manquante (aucun e-mail réel n’a été envoyé), mais le devis est marqué “envoyé”.
        </div>
      ) : null}
      {info === "email-sent" || bannerOk ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
          {bannerOk ?? "Devis envoyé."}
        </div>
      ) : null}
      {bannerErr ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {bannerErr}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => save()} disabled={pending}>
          Enregistrer
        </Button>
        <a href={`/api/devis/${devis.id}/pdf`} target="_blank" rel="noreferrer">
          <Button type="button" variant="secondary">
            PDF
          </Button>
        </a>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" className="px-2">
              <MoreHorizontal className="size-5" aria-hidden />
              <span className="sr-only">Plus</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Plus</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => {
                  start(async () => {
                    setBannerErr(null);
                    const res = await fetch(`/api/devis/${devis.id}/statut`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "same-origin",
                      body: JSON.stringify({ statut: "accepte" }),
                    });
                    const data = await res.json().catch(() => ({} as { message?: string }));
                    if (!res.ok) {
                      setBannerErr(typeof data.message === "string" ? data.message : `Erreur ${res.status}`);
                      return;
                    }
                    router.refresh();
                  });
                }}
                className="cursor-pointer"
              >
                Marquer accepté
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  start(async () => {
                    setBannerErr(null);
                    const res = await fetch(`/api/devis/${devis.id}/duplicate`, { method: "POST", credentials: "same-origin" });
                    const data = await res.json().catch(() => ({} as { message?: string; id?: string }));
                    if (!res.ok) {
                      setBannerErr(typeof data.message === "string" ? data.message : `Erreur ${res.status}`);
                      return;
                    }
                    if (data.id) {
                      router.push(`/devis/${encodeURIComponent(data.id)}`);
                      router.refresh();
                    }
                  });
                }}
                className="cursor-pointer"
              >
                Dupliquer
              </DropdownMenuItem>
              {devis.statut === "accepte" ? (
                <DropdownMenuItem
                  onClick={() => {
                    start(async () => {
                      setBannerErr(null);
                      const res = await fetch(`/api/factures/from-devis/${devis.id}`, { method: "POST", credentials: "same-origin" });
                      const data = await res.json().catch(() => ({} as { message?: string; id?: string }));
                      if (!res.ok) {
                        setBannerErr(typeof data.message === "string" ? data.message : `Erreur ${res.status}`);
                        return;
                      }
                      if (data.id) {
                        router.push(`/facturation/${encodeURIComponent(data.id)}`);
                        router.refresh();
                      }
                    });
                  }}
                  className="cursor-pointer"
                >
                  Facturer
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs opacity-80">Signature (avancé)</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  start(async () => {
                    setBannerErr(null);
                    const res = await fetch(`/api/devis/${devis.id}/esign-stub`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      credentials: "same-origin",
                      body: JSON.stringify({ action: "init" }),
                    });
                    const data = await res.json().catch(() => ({} as { message?: string }));
                    if (!res.ok) {
                      setBannerErr(typeof data.message === "string" ? data.message : `Erreur ${res.status}`);
                      return;
                    }
                    router.refresh();
                  });
                }}
                className="cursor-pointer"
              >
                Initier la signature (test)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  start(async () => {
                    setBannerErr(null);
                    const res = await fetch(`/api/devis/${devis.id}/esign-stub`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      credentials: "same-origin",
                      body: JSON.stringify({ action: "mark_signed" }),
                    });
                    const data = await res.json().catch(() => ({} as { message?: string }));
                    if (!res.ok) {
                      setBannerErr(typeof data.message === "string" ? data.message : `Erreur ${res.status}`);
                      return;
                    }
                    router.refresh();
                  });
                }}
                className="cursor-pointer"
              >
                Marquer comme signé (test)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (!confirm("Archiver ce devis ?")) return;
                  start(async () => {
                    setBannerErr(null);
                    const res = await fetch(`/api/devis/${devis.id}/statut`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "same-origin",
                      body: JSON.stringify({ statut: "archive" }),
                    });
                    const data = await res.json().catch(() => ({} as { message?: string }));
                    if (!res.ok) {
                      setBannerErr(typeof data.message === "string" ? data.message : `Erreur ${res.status}`);
                      return;
                    }
                    router.push("/devis");
                    router.refresh();
                  });
                }}
                className="cursor-pointer text-red-700 dark:text-red-400"
              >
                Archiver
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Link href="/devis" className="ml-auto">
          <Button type="button" variant="ghost">
            Liste
          </Button>
        </Link>
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Devis {devis.numero ?? "—"}
          </p>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {statutLabel}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Card title="Client">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Sélectionne le client
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">—</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
                  </option>
                ))}
              </select>
            </label>
          </Card>

          <Card title="Adresse chantier / intervention">
            <Textarea
              label="Adresse du chantier"
              value={adresseChantier}
              onChange={(e) => setAdresseChantier(e.target.value)}
              rows={3}
            />
          </Card>

          <Card title="Validité & conditions" className="md:col-span-2">
            <div className="grid gap-3 md:grid-cols-3">
              <Input label="Validité (date)" type="date" value={dateExp} onChange={(e) => setDateExp(e.target.value)} />
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Remise
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  value={remiseType}
                  onChange={(e) => setRemiseType(e.target.value as "percent" | "fixed" | "")}
                >
                  <option value="">Aucune</option>
                  <option value="percent">%</option>
                  <option value="fixed">€</option>
                </select>
              </label>
              <Input
                label="Valeur remise"
                type="number"
                value={remiseValue === "" ? "" : String(remiseValue)}
                onChange={(e) => setRemiseValue(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div className="mt-3">
              <Textarea label="Notes / conditions (visibles client)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </Card>
        </div>
      </div>

      <Card title="Lignes">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={lignes.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            {lignes.map((l) => (
              <SortableLigne key={l.id} ligne={l} onChange={patchLigne} onRemove={removeLigne} />
            ))}
          </SortableContext>
        </DndContext>
        <Button type="button" variant="secondary" className="mt-2" onClick={addLigne}>
          + Ligne
        </Button>
        <div className="mt-4 text-right text-sm">
          <p>Total HT : {formatCurrencyEUR(totals.total_ht)}</p>
          <p>Total TVA : {formatCurrencyEUR(totals.total_tva)}</p>
          <p className="text-lg font-semibold">Total TTC : {formatCurrencyEUR(totals.total_ttc)}</p>
        </div>
      </Card>

      <Card title="Note interne">
        {internalNotesHist.trim() ? (
          <pre className="mb-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
            {internalNotesHist}
          </pre>
        ) : (
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Aucune note interne pour l’instant.</p>
        )}
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            const t = noteInterne.trim();
            if (!t) return;
            start(async () => {
              setBannerErr(null);
              const res = await fetch(`/api/devis/${devis.id}/internal-notes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ text: t }),
              });
              const data = (await res.json().catch(() => ({}))) as { message?: string; internal_notes?: string };
              if (!res.ok) {
                setBannerErr(typeof data.message === "string" ? data.message : `Erreur ${res.status}`);
                return;
              }
              if (typeof data.internal_notes === "string") {
                setInternalNotesHist(data.internal_notes);
              }
              setNoteInterne("");
            });
          }}
        >
          <Input label="Texte" value={noteInterne} onChange={(e) => setNoteInterne(e.target.value)} className="flex-1" />
          <Button type="submit" disabled={pending} className="sm:self-end">
            Ajouter
          </Button>
        </form>
      </Card>

      {/* Barre d'action simple en bas : envoyer après relecture */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => save()}>
            Enregistrer
          </Button>
          <Button type="button" disabled={pending} className="flex-1" onClick={() => setSendDrawerOpen(true)}>
            Envoyer le devis
          </Button>
        </div>
      </div>

      <Drawer open={sendDrawerOpen} onOpenChange={setSendDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Envoyer le devis</DrawerTitle>
          </DrawerHeader>
          <DrawerBody className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              1) Vérifie l’e-mail, 2) clique sur <strong>Envoyer</strong>.
            </p>
            <Input
              label={`E-mail du client (${clientLabel})`}
              type="email"
              placeholder="client@exemple.fr"
              value={sendEmailTo}
              onChange={(e) => setSendEmailTo(e.target.value)}
            />
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              Si l’e-mail réel n’est pas configuré (Resend), Flowo passe en mode test mais marque quand même le devis “envoyé”.
            </div>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="secondary" type="button" onClick={() => setSendDrawerOpen(false)} disabled={sending}>
              Annuler
            </Button>
            <Button
              type="button"
              isLoading={sending}
              loadingText="Envoi…"
              onClick={() => void sendByEmail()}
            >
              Envoyer
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
