"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NouveauOuvrageFormClient() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setPending(true);
        const fd = new FormData(e.currentTarget);
        try {
          const res = await fetch("/api/catalogue/create-ouvrage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nom: String(fd.get("nom") || "").trim(),
              description: String(fd.get("description") || "").trim(),
              type: String(fd.get("type") || "ouvrage"),
              prix_ht: Number(fd.get("prix_ht") ?? 0),
              unite: String(fd.get("unite") || "forfait"),
              tva: Number(fd.get("tva") ?? 10),
              tags: String(fd.get("tags") || ""),
            }),
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
      <Input label="Nom" name="nom" required />
      <Textarea label="Description" name="description" rows={2} />
      <label className="block text-sm font-medium">
        Type
        <select
          name="type"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          defaultValue="ouvrage"
        >
          <option value="main_oeuvre">Main d&apos;œuvre</option>
          <option value="fourniture">Fourniture</option>
          <option value="ouvrage">Ouvrage</option>
        </select>
      </label>
      <Input label="Prix unitaire HT" name="prix_ht" type="number" step="0.01" required />
      <Input label="Unité (h, forfait, ml…)" name="unite" defaultValue="forfait" />
      <Input label="TVA %" name="tva" type="number" defaultValue="10" />
      <Input label="Tags (virgules)" name="tags" placeholder="sanitaire, urgence" />
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Enregistrer"}
        </Button>
        <Link href="/catalogue">
          <Button type="button" variant="secondary">
            Annuler
          </Button>
        </Link>
      </div>
    </form>
  );
}
