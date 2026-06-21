"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { METIER_OPTIONS, siretDigits, sirenFromSiret } from "@/lib/metier-options";
import { isFlowoBilling, isFlowoPlanId } from "@/lib/stripe/plans";
import { cx } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const selectClass =
  "w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-base shadow-sm outline-none transition md:text-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:border-blue-700 dark:focus:ring-blue-700/30";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutPlan = searchParams.get("plan") ?? "";
  const checkoutBilling = searchParams.get("billing") ?? "";
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const [metier, setMetier] = useState("artisan_btp");
  const [siret, setSiret] = useState("");
  const [siren, setSiren] = useState("");
  const [adresse, setAdresse] = useState("");
  const [formeJuridique, setFormeJuridique] = useState("");
  const [capitalSocial, setCapitalSocial] = useState("");
  const [rcsVille, setRcsVille] = useState("");
  const [numeroTva, setNumeroTva] = useState("");
  const [emailFacturation, setEmailFacturation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onSiretChange(value: string) {
    setSiret(value);
    if (!siren.trim()) {
      const derived = sirenFromSiret(value);
      if (derived) setSiren(derived);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      prenom: prenom.trim(),
      nom: nom.trim(),
      tel: tel.trim(),
      entreprise: entreprise.trim(),
      metier,
      siret: siret.trim(),
      adresse: adresse.trim(),
      siren: siren.trim(),
      forme_juridique: formeJuridique.trim(),
      capital_social: capitalSocial.trim(),
      rcs_ville: rcsVille.trim(),
      numero_tva_intracom: numeroTva.trim(),
      email_facturation: emailFacturation.trim(),
      email: email.trim(),
      password,
    };

    if (!payload.prenom || !payload.nom || !payload.tel) {
      setError("Prénom, nom et téléphone sont requis.");
      return;
    }
    if (!payload.entreprise || !payload.siret || !payload.adresse) {
      setError("Nom de l'entreprise, SIRET et adresse sont requis.");
      return;
    }
    if (siretDigits(payload.siret).length !== 14) {
      setError("Le SIRET doit contenir 14 chiffres.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => null)) as unknown;
    setLoading(false);
    if (!res.ok) {
      setError(backendErrorMessage(json) ?? "Inscription impossible");
      return;
    }
    if (isFlowoPlanId(checkoutPlan) && isFlowoBilling(checkoutBilling)) {
      const params = new URLSearchParams({ checkout: "1", plan: checkoutPlan, billing: checkoutBilling });
      router.replace(`/compte/donnees?${params.toString()}`);
      return;
    }
    router.replace("/accueil");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8">
      <p className="mb-4 text-center text-sm">
        <Link href="/" className="font-medium text-[color:var(--primary)] hover:underline">
          ← Découvrir Flowo et voir les aperçus
        </Link>
      </p>
      <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-gray-50">Inscription</h1>
      <p className="mb-6 text-center text-sm text-gray-600 dark:text-gray-400">
        L&apos;essentiel pour démarrer vos devis. Le reste est modifiable dans Compte → Entreprise.
      </p>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        <fieldset className="space-y-4">
          <legend className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">Vos informations</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Prénom *" name="prenom" autoComplete="given-name" value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
            <Input label="Nom *" name="nom" autoComplete="family-name" value={nom} onChange={(e) => setNom(e.target.value)} required />
          </div>
          <Input
            label="Téléphone *"
            name="tel"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="06 12 34 56 78"
            value={tel}
            onChange={(e) => setTel(e.target.value)}
            required
          />
        </fieldset>

        <fieldset className="space-y-4 border-t border-gray-100 pt-5 dark:border-gray-800">
          <legend className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">Votre entreprise</legend>
          <Input
            label="Nom de l'entreprise *"
            name="entreprise"
            autoComplete="organization"
            value={entreprise}
            onChange={(e) => setEntreprise(e.target.value)}
            required
          />
          <div>
            <label htmlFor="metier" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Métier principal *
            </label>
            <select id="metier" name="metier" className={selectClass} value={metier} onChange={(e) => setMetier(e.target.value)} required>
              {METIER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="SIRET *"
            name="siret"
            inputMode="numeric"
            placeholder="14 chiffres"
            value={siret}
            onChange={(e) => onSiretChange(e.target.value)}
            required
          />
          <Input
            label="Adresse *"
            name="adresse"
            autoComplete="street-address"
            placeholder="Numéro, rue, code postal, ville"
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            required
          />
        </fieldset>

        <details className="group border-t border-gray-100 pt-4 dark:border-gray-800">
          <summary className="cursor-pointer text-sm font-semibold text-gray-900 marker:content-none dark:text-gray-100">
            <span className="inline-flex items-center gap-2">
              Compléter maintenant
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                Optionnel
              </span>
            </span>
            <p className="mt-1 text-xs font-normal text-gray-500 dark:text-gray-400">
              SIREN, forme juridique, capital, RCS, TVA, e-mail de facturation — modifiables plus tard dans l&apos;app.
            </p>
          </summary>
          <div className="mt-4 space-y-4">
            <Input
              label="SIREN (9 chiffres)"
              name="siren"
              inputMode="numeric"
              placeholder="Rempli automatiquement depuis le SIRET"
              value={siren}
              onChange={(e) => setSiren(e.target.value)}
            />
            <Input
              label="Forme juridique"
              name="forme_juridique"
              placeholder="SARL, SASU, EI…"
              value={formeJuridique}
              onChange={(e) => setFormeJuridique(e.target.value)}
            />
            <Input
              label="Capital social"
              name="capital_social"
              placeholder="Ex. 1 000 €"
              value={capitalSocial}
              onChange={(e) => setCapitalSocial(e.target.value)}
            />
            <Input
              label="RCS (ville)"
              name="rcs_ville"
              placeholder="Ex. Paris"
              value={rcsVille}
              onChange={(e) => setRcsVille(e.target.value)}
            />
            <Input
              label="N° TVA intracommunautaire"
              name="numero_tva_intracom"
              placeholder="FR…"
              value={numeroTva}
              onChange={(e) => setNumeroTva(e.target.value)}
            />
            <Input
              label="E-mail de facturation"
              name="email_facturation"
              type="email"
              autoComplete="email"
              placeholder="Par défaut : votre e-mail de connexion"
              value={emailFacturation}
              onChange={(e) => setEmailFacturation(e.target.value)}
            />
          </div>
        </details>

        <fieldset className="space-y-4 border-t border-gray-100 pt-5 dark:border-gray-800">
          <legend className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">Connexion</legend>
          <Input label="Email *" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            label="Mot de passe *"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </fieldset>

        <Button type="submit" className={cx("w-full")} disabled={loading}>
          {loading ? "Création…" : "Créer mon compte"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
        <Link href="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-500">
          Déjà un compte ? Connexion
        </Link>
      </p>
    </div>
  );
}

function backendErrorMessage(json: unknown) {
  if (!json || typeof json !== "object") return null;
  const rec = json as Record<string, unknown>;
  if (typeof rec.error === "string") {
    if (typeof rec.detail === "string" && rec.detail && !rec.error.includes(rec.detail)) {
      return `${rec.error} (${rec.detail})`;
    }
    return rec.error;
  }
  if (typeof rec.detail === "string") return rec.detail;
  return null;
}
