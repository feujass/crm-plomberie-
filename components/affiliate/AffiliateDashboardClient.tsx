"use client";

import {
  BarChart3,
  Banknote,
  Copy,
  Euro,
  Link2,
  LogOut,
  MousePointerClick,
  TrendingUp,
  UserPlus,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/Button";
import { APP_LOGO_MARK_SRC, APP_NAME } from "@/lib/app-branding";
import { buildLandingUrlWithRef, buildReferralUrl, buildRegisterUrlWithRef } from "@/lib/affiliate/constants";
import { formatCurrencyEUR } from "@/lib/format";
import { cx, focusRing } from "@/lib/utils";
import type {
  AffiliateCommissionRow,
  AffiliateMonthlyPoint,
  AffiliatePartner,
  AffiliateReferralRow,
  AffiliateStats,
} from "@/types/affiliate";

type DashboardData = {
  partner: AffiliatePartner;
  stats: AffiliateStats;
  monthly: AffiliateMonthlyPoint[];
  referralRows: AffiliateReferralRow[];
  commissionRows: AffiliateCommissionRow[];
};

const nav = [
  { href: "/partenaire", label: "Tableau de bord" },
  { href: "/partenaire/liens", label: "Mes liens" },
  { href: "/partenaire/commissions", label: "Commissions" },
];

function StatCard({
  label,
  value,
  hint,
  Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  Icon: typeof Euro;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
        focusRing,
      )}
    >
      <Copy className="size-3.5" aria-hidden />
      {copied ? "Copié !" : label}
    </button>
  );
}

export function AffiliateShell({
  children,
  partner,
  activePath,
}: {
  children: React.ReactNode;
  partner: AffiliatePartner;
  activePath: string;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/partenaire/connexion");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Image src={APP_LOGO_MARK_SRC} alt="" width={36} height={36} className="size-9 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--primary)]">
                Programme partenaire {APP_NAME}
              </p>
              <h1 className="truncate text-lg font-bold text-slate-900 dark:text-slate-50">{partner.brand_name}</h1>
              <p className="truncate text-xs text-slate-500">
                Bonjour {partner.display_name} · {partner.commission_rate_percent}% de commission récurrente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className={cx(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
              focusRing,
            )}
          >
            <LogOut className="size-3.5" aria-hidden />
            Déconnexion
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
                activePath === item.href
                  ? "bg-[color:var(--primary)] text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                focusRing,
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

export function AffiliateDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/affiliate/me")
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((json as { error?: string }).error ?? "Erreur");
        setData(json as DashboardData);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900/40 dark:bg-amber-950/30">
        <p className="font-semibold text-amber-950 dark:text-amber-100">Espace partenaire indisponible</p>
        <p className="mt-2 text-sm text-amber-900/90 dark:text-amber-200/90">{error}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm">
          <Link href="/affiliation" className="font-medium text-[color:var(--primary)] hover:underline">
            Programme partenaire
          </Link>
          <Link href="/partenaire/connexion" className="font-medium text-[color:var(--primary)] hover:underline">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return <p className="text-center text-sm text-slate-500">Chargement de votre espace partenaire…</p>;
  }

  const { partner, stats, monthly, referralRows, commissionRows } = data;
  const referralUrl = buildReferralUrl(partner.referral_code);
  const landingUrl = buildLandingUrlWithRef(partner.referral_code);

  return (
    <AffiliateShell partner={partner} activePath="/partenaire">
      <div className="mb-6 rounded-2xl border border-[color:var(--primary)]/20 bg-[color:var(--primary)]/5 p-5">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Votre lien de parrainage</p>
        <p className="mt-1 break-all font-mono text-sm text-slate-700 dark:text-slate-300">{referralUrl}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton text={referralUrl} label="Copier le lien" />
          <CopyButton text={landingUrl} label="Lien landing" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Clics (30 j)" value={String(stats.clicks_30d)} Icon={MousePointerClick} />
        <StatCard label="Inscriptions" value={String(stats.signups_total)} hint={`${stats.conversion_rate}% conv.`} Icon={UserPlus} />
        <StatCard label="Abonnés actifs" value={String(stats.subscribers_active)} hint={`${stats.trials_active} en essai`} Icon={TrendingUp} />
        <StatCard
          label="Commissions en attente"
          value={formatCurrencyEUR(stats.commissions_pending_eur)}
          hint={`${formatCurrencyEUR(stats.commissions_paid_eur)} déjà gagnés`}
          Icon={Wallet}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="size-4 text-[color:var(--primary)]" aria-hidden />
            <p className="font-semibold text-slate-900 dark:text-slate-50">Performance (6 derniers mois)</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="signups" name="Inscriptions" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="clicks" name="Clics" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <p className="font-semibold text-slate-900 dark:text-slate-50">CA récurrent attribué</p>
          <p className="mt-2 text-3xl font-bold text-[color:var(--primary)]">{formatCurrencyEUR(stats.mrr_attributed_eur)}</p>
          <p className="mt-1 text-xs text-slate-500">MRR estimé de vos filleuls abonnés</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>· Commission : {partner.commission_rate_percent}% sur chaque paiement</li>
            <li>· Seuil de paiement : {formatCurrencyEUR(partner.payout_min_eur)}</li>
            <li>· Cookie de suivi : 30 jours</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="font-semibold text-slate-900 dark:text-slate-50">Derniers parrainages</p>
          {referralRows.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Partagez votre lien pour voir vos premiers inscrits ici.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {referralRows.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950/50">
                  <span className="text-slate-600 dark:text-slate-400">{r.created_at.slice(0, 10)}</span>
                  <span className="font-medium capitalize text-slate-900 dark:text-slate-100">{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="font-semibold text-slate-900 dark:text-slate-50">Dernières commissions</p>
          {commissionRows.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Les commissions apparaissent dès le premier paiement d&apos;un filleul.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {commissionRows.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950/50">
                  <span>{c.created_at.slice(0, 10)}</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">+{formatCurrencyEUR(c.commission_eur)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AffiliateShell>
  );
}

export function AffiliateLinksClient() {
  const [partner, setPartner] = useState<AffiliatePartner | null>(null);

  useEffect(() => {
    void fetch("/api/affiliate/me")
      .then((r) => r.json())
      .then((j) => setPartner((j as DashboardData).partner ?? null));
  }, []);

  if (!partner) return <p className="text-center text-sm text-slate-500">Chargement…</p>;

  const referralUrl = buildReferralUrl(partner.referral_code);
  const landingUrl = buildLandingUrlWithRef(partner.referral_code);
  const registerUrl = buildRegisterUrlWithRef(partner.referral_code);

  const snippets = [
    {
      title: "Message WhatsApp",
      text: `Salut ! Je te recommande Flowo pour gérer tes devis et factures en 2 min depuis ton téléphone. Essai gratuit ici : ${referralUrl}`,
    },
    {
      title: "Post réseaux sociaux",
      text: `Artisans du BTP : fini les devis le soir sur Excel. J'utilise Flowo — devis vocal, envoi client, facturation. Essai gratuit → ${landingUrl}`,
    },
  ];

  return (
    <AffiliateShell partner={partner} activePath="/partenaire/liens">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Link2 className="size-5 text-[color:var(--primary)]" aria-hidden />
            <h2 className="font-semibold text-slate-900 dark:text-slate-50">Liens à partager</h2>
          </div>
          <div className="mt-4 space-y-4">
            {[
              { label: "Lien court (recommandé)", url: referralUrl },
              { label: "Landing Flowo", url: landingUrl },
              { label: "Inscription directe", url: registerUrl },
            ].map((row) => (
              <div key={row.label}>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{row.label}</p>
                <p className="mt-1 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs dark:bg-slate-950">{row.url}</p>
                <div className="mt-2">
                  <CopyButton text={row.url} label="Copier" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-slate-50">Visuels à télécharger</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Bannières personnalisées avec ta marque et ton lien de parrainage (SVG — ouvre dans Canva ou Figma).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="/api/affiliate/assets/banner?format=story"
              className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
            >
              Story Instagram (1080×1920)
            </a>
            <a
              href="/api/affiliate/assets/banner?format=wide"
              className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
            >
              Post / LinkedIn (1200×630)
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-slate-50">Textes prêts à l&apos;emploi</h2>
          <div className="mt-4 space-y-4">
            {snippets.map((s) => (
              <div key={s.title} className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{s.text}</p>
                <div className="mt-2">
                  <CopyButton text={s.text} label="Copier le texte" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AffiliateShell>
  );
}

function StripeConnectPanel({ partner }: { partner: AffiliatePartner }) {
  const [onboarded, setOnboarded] = useState(Boolean(partner.stripe_connect_onboarded));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const refreshStatus = useCallback(() => {
    void fetch("/api/affiliate/connect")
      .then((r) => r.json())
      .then((j) => {
        const row = j as { onboarded?: boolean };
        if (typeof row.onboarded === "boolean") setOnboarded(row.onboarded);
      });
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (searchParams.get("connect") === "success") refreshStatus();
  }, [searchParams, refreshStatus]);

  return (
    <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
      <div className="flex items-start gap-3">
        <Banknote className="mt-0.5 size-5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 dark:text-slate-50">Recevoir tes paiements (Stripe Connect)</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Connecte ton compte bancaire pour recevoir tes commissions automatiquement dès{" "}
            {formatCurrencyEUR(partner.payout_min_eur)} atteints.
          </p>
          {searchParams.get("connect") === "success" ? (
            <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Configuration Stripe enregistrée — merci !
            </p>
          ) : null}
          {onboarded ? (
            <p className="mt-2 inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
              Compte bancaire connecté
            </p>
          ) : (
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                setError(null);
                try {
                  const res = await fetch("/api/affiliate/connect", { method: "POST" });
                  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
                  if (!res.ok || !json.url) {
                    setError(json.error ?? "Connexion Stripe impossible.");
                    return;
                  }
                  window.location.href = json.url;
                } finally {
                  setPending(false);
                }
              }}
            >
              {pending ? "Redirection…" : "Connecter mon compte bancaire"}
            </Button>
          )}
          {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function AffiliateCommissionsClient() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    void fetch("/api/affiliate/me")
      .then((r) => r.json())
      .then((j) => setData(j as DashboardData));
  }, []);

  if (!data) return <p className="text-center text-sm text-slate-500">Chargement…</p>;

  const { partner, stats, commissionRows } = data;

  return (
    <AffiliateShell partner={partner} activePath="/partenaire/commissions">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="En attente" value={formatCurrencyEUR(stats.commissions_pending_eur)} Icon={Wallet} />
        <StatCard label="Total gagné" value={formatCurrencyEUR(partner.total_earned_eur)} Icon={Euro} />
        <StatCard label="MRR filleuls" value={formatCurrencyEUR(stats.mrr_attributed_eur)} Icon={TrendingUp} />
      </div>

      <StripeConnectPanel partner={partner} />

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="font-semibold text-slate-900 dark:text-slate-50">Historique des commissions</p>
        {commissionRows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Aucune commission pour l&apos;instant.</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                <th className="py-2">Date</th>
                <th className="py-2">Montant brut</th>
                <th className="py-2">Commission</th>
                <th className="py-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {commissionRows.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 dark:border-slate-800/80">
                  <td className="py-2">{c.created_at.slice(0, 10)}</td>
                  <td className="py-2">{formatCurrencyEUR(c.gross_amount_eur)}</td>
                  <td className="py-2 font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrencyEUR(c.commission_eur)}</td>
                  <td className="py-2 capitalize">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-4 text-xs text-slate-500">
          Seuil de virement automatique : {formatCurrencyEUR(partner.payout_min_eur)}. Les commissions passent en
          &quot;payé&quot; après virement Stripe Connect.
        </p>
      </div>
    </AffiliateShell>
  );
}
