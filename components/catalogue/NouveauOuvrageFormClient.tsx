"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { BackendOuvrage } from "@/types/backend";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NouveauOuvrageFormClient({
  defaultType = "ouvrage",
  initial,
}: {
  defaultType?: string;
  initial?: BackendOuvrage;
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isEdit = Boolean(initial?.id);
  const typeDefault = ["main_oeuvre", "fourniture", "ouvrage"].includes(initial?.type ?? defaultType)
    ? (initial?.type ?? defaultType)
    : "ouvrage";
  const tagsDefault = (initial?.tags ?? []).join(", ");

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setPending(true);
        const fd = new FormData(e.currentTarget);
        const payload = {
          nom: String(fd.get("nom") || "").trim(),
          description: String(fd.get("description") || "").trim(),
          type: String(fd.get("type") || "ouvrage"),
          prix_ht: Number(fd.get("prix_ht") ?? 0),
          unite: String(fd.get("unite") || "forfait"),
          tva: Number(fd.get("tva") ?? 10),
          tags: String(fd.get("tags") || ""),
        };
        try {
          const res = await fetch(isEdit ? `/api/catalogue/${initial!.id}` : "/api/catalogue/create-ouvrage", {
            method: isEdit ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const json = (await res.json()) as { redirect?: string; message?: string };
          if (!res.ok) {
            setErr(json.message ?? `Erreur ${res.status}`);
            return;
          }
          router.push(typeof json.redirect === "string" ? json.redirect : "/catalogue");
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <Input label="Nom" name="nom" required defaultValue={initial?.nom ?? ""} />
      <Textarea label="Description" name="description" rows={2} defaultValue={initial?.description ?? ""} />
      <label className="block text-sm font-medium">
        Type
        <select
          name="type"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          defaultValue={typeDefault}
        >
          <option value="main_oeuvre">Main d&apos;œuvre</option>
          <option value="fourniture">Fourniture</option>
          <option value="ouvrage">Ouvrage</option>
        </select>
      </label>
      <Input
        label="Prix unitaire HT"
        name="prix_ht"
        type="number"
        step="0.01"
        required
        defaultValue={initial?.prix_ht != null ? String(initial.prix_ht) : undefined}
      />
      <Input label="Unité (h, forfait, ml…)" name="unite" defaultValue={initial?.unite ?? "forfait"} />
      <Input
        label="TVA %"
        name="tva"
        type="number"
        defaultValue={initial?.tva != null ? String(initial.tva) : "10"}
      />
      <Input label="Tags (virgules)" name="tags" placeholder="sanitaire, urgence" defaultValue={tagsDefault} />
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || deleting}>
          {pending ? "…" : isEdit ? "Enregistrer" : "Ajouter"}
        </Button>
        <Link href="/catalogue">
          <Button type="button" variant="secondary" disabled={pending || deleting}>
            Annuler
          </Button>
        </Link>
        {isEdit ? (
          <Button
            type="button"
            variant="danger"
            disabled={pending || deleting}
            onClick={async () => {
              const label = initial?.nom?.trim() || "cet élément";
              if (!confirm(`Supprimer « ${label} » ? Cette action est définitive.`)) return;
              setErr(null);
              setDeleting(true);
              try {
                const res = await fetch(`/api/catalogue/${initial!.id}`, { method: "DELETE" });
                const json = (await res.json()) as { redirect?: string; message?: string };
                if (!res.ok) {
                  setErr(json.message ?? `Erreur ${res.status}`);
                  return;
                }
                router.push(typeof json.redirect === "string" ? json.redirect : "/catalogue");
                router.refresh();
              } finally {
                setDeleting(false);
              }
            }}
          >
            {deleting ? "…" : "Supprimer"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
