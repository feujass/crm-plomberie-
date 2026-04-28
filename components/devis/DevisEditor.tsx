"use client";

import {
  addDevisNoteAction,
  archiveDevisAction,
  duplicateDevisAction,
  markDevisAccepte,
  markDevisSent,
  saveDevisAction,
  type DevisLigneInput,
} from "@/app/actions/devis";
import { convertDevisToFacture } from "@/app/actions/factures";
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
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

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
  const [clientId, setClientId] = useState<string>(devis.client_id ?? "");
  const [notes, setNotes] = useState(devis.notes ?? "");
  const [dateExp, setDateExp] = useState(devis.date_expiration ?? "");
  const [remiseType, setRemiseType] = useState<"percent" | "fixed" | "">(
    devis.remise_type === "pourcentage" ? "percent" : devis.remise_type === "montant" ? "fixed" : "",
  );
  const [remiseValue, setRemiseValue] = useState<number | "">(devis.remise_valeur ?? "");
  const [lignes, setLignes] = useState<LigneState[]>(() =>
    (devis.lignes ?? []).map((l: BackendDevisLine, i: number) => ({
      id: `l-${i}-${crypto.randomUUID()}`,
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
  const [noteInterne, setNoteInterne] = useState("");

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
        id: `n-${crypto.randomUUID()}`,
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
      await saveDevisAction(payload);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => save()} disabled={pending}>
          Enregistrer
        </Button>
        <a href={`/api/devis/${devis.id}/pdf`} target="_blank" rel="noreferrer">
          <Button type="button" variant="secondary">
            PDF
          </Button>
        </a>
        {/* Lien public + email non encore branchés sur le backend */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              await markDevisSent(devis.id);
              router.refresh();
            });
          }}
        >
          <Button type="submit" variant="secondary">
            Marquer envoyé
          </Button>
        </form>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              await markDevisAccepte(devis.id);
              router.refresh();
            });
          }}
        >
          <Button type="submit" variant="secondary">
            Marquer accepté
          </Button>
        </form>
        {devis.statut === "accepte" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void convertDevisToFacture(devis.id);
            }}
          >
            <Button type="submit">Facturer</Button>
          </form>
        ) : null}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void duplicateDevisAction(devis.id);
          }}
        >
          <Button type="submit" variant="secondary">
            Dupliquer
          </Button>
        </form>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!confirm("Archiver ce devis ?")) return;
            start(async () => {
              await archiveDevisAction(devis.id);
              router.push("/devis");
            });
          }}
        >
          <Button type="submit" variant="danger">
            Archiver
          </Button>
        </form>
        <Link href="/devis">
          <Button type="button" variant="ghost">
            Liste
          </Button>
        </Link>
      </div>

      <Card title={`Devis ${devis.numero} — ${devis.statut}`}>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Client
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
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
          <Input label="Validité (date)" type="date" value={dateExp} onChange={(e) => setDateExp(e.target.value)} />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Remise
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
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
          <Textarea label="Notes / conditions" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
      </Card>

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
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              await addDevisNoteAction(devis.id, noteInterne);
              setNoteInterne("");
              router.refresh();
            });
          }}
        >
          <Input label="Texte" value={noteInterne} onChange={(e) => setNoteInterne(e.target.value)} className="flex-1" />
          <Button type="submit" className="sm:self-end">
            Ajouter
          </Button>
        </form>
      </Card>
    </div>
  );
}
