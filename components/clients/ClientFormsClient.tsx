"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ClientInitial = {
  nom: string;
  prenom?: string | null;
  email?: string | null;
  tel?: string | null;
  adresse?: string | null;
  type?: string;
  siret?: string | null;
  notes?: string | null;
  inactive?: boolean;
};

export function NouveauClientFormClient() {
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
        const body = {
          nom: String(fd.get("nom") || "").trim(),
          prenom: String(fd.get("prenom") || "").trim(),
          email: String(fd.get("email") || "").trim(),
          tel: String(fd.get("tel") || "").trim(),
          adresse: String(fd.get("adresse") || "").trim(),
          type: String(fd.get("type") || "particulier"),
          siret: String(fd.get("siret") || "").trim(),
          notes: String(fd.get("notes") || "").trim(),
        };
        try {
          const res = await fetch("/api/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = (await res.json()) as { redirect?: string; message?: string };
          if (!res.ok) {
            setErr(json.message ?? `Erreur ${res.status}`);
            return;
          }
          router.push(typeof json.redirect === "string" ? json.redirect : "/clients");
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <Input label="Nom" name="nom" required />
      <Input label="Prénom" name="prenom" />
      <Input label="Email" name="email" type="email" />
      <Input label="Téléphone" name="tel" type="tel" />
      <Input label="Adresse" name="adresse" />
      <label className="block text-sm font-medium">
        Type
        <select
          name="type"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          defaultValue="particulier"
        >
          <option value="particulier">Particulier</option>
          <option value="professionnel">Professionnel</option>
        </select>
      </label>
      <Input label="SIRET (pro)" name="siret" />
      <Textarea label="Notes" name="notes" rows={3} />
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Enregistrer"}
        </Button>
        <Link href="/clients">
          <Button type="button" variant="secondary">
            Annuler
          </Button>
        </Link>
      </div>
    </form>
  );
}

export function EditClientFormClient({ clientId, initial }: { clientId: string; initial: ClientInitial }) {
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
        const body = {
          nom: String(fd.get("nom") || "").trim(),
          prenom: String(fd.get("prenom") || "").trim(),
          email: String(fd.get("email") || "").trim(),
          tel: String(fd.get("tel") || "").trim(),
          adresse: String(fd.get("adresse") || "").trim(),
          type: String(fd.get("type") || "particulier"),
          siret: String(fd.get("siret") || "").trim(),
          notes: String(fd.get("notes") || "").trim(),
          inactive: fd.get("inactive") === "on",
        };
        try {
          const res = await fetch(`/api/clients/${clientId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = (await res.json().catch(() => ({}))) as { message?: string };
          if (!res.ok) {
            setErr(json.message ?? `Erreur ${res.status}`);
            return;
          }
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      <Input label="Nom" name="nom" defaultValue={initial.nom} required />
      <Input label="Prénom" name="prenom" defaultValue={initial.prenom ?? ""} />
      <Input label="Email" name="email" type="email" defaultValue={initial.email ?? ""} />
      <Input label="Téléphone" name="tel" type="tel" defaultValue={initial.tel ?? ""} />
      <Input label="Adresse" name="adresse" defaultValue={initial.adresse ?? ""} />
      <label className="block text-sm font-medium">
        Type
        <select
          name="type"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          defaultValue={initial.type ?? "particulier"}
        >
          <option value="particulier">Particulier</option>
          <option value="professionnel">Professionnel</option>
        </select>
      </label>
      <Input label="SIRET" name="siret" defaultValue={initial.siret ?? ""} />
      <Textarea label="Notes" name="notes" defaultValue={initial.notes ?? ""} rows={3} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="inactive" defaultChecked={Boolean(initial.inactive)} />
        Client inactif
      </label>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "…" : "Mettre à jour"}
      </Button>
    </form>
  );
}
