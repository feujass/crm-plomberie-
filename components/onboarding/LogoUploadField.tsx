"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

function isSupabaseEnvConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export function LogoUploadField() {
  const supabaseOk = isSupabaseEnvConfigured();
  const [logoUrl, setLogoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErr("Non connecté (session Supabase)");
        setBusy(false);
        return;
      }
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
      if (error) {
        setErr(error.message);
        setBusy(false);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("logos").getPublicUrl(path);
      setLogoUrl(publicUrl);
    } catch (uploadErr) {
      setErr(uploadErr instanceof Error ? uploadErr.message : "Import impossible");
    }
    setBusy(false);
  }

  if (!supabaseOk) {
    return (
      <div className="text-sm">
        <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300" htmlFor="onboarding-logo-url">
          Logo (URL)
        </label>
        <input
          id="onboarding-logo-url"
          name="logo_url"
          type="url"
          inputMode="url"
          placeholder="https://…"
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
          value={logoUrl}
          onChange={(ev) => setLogoUrl(ev.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">
          Collez l’URL HTTPS de votre logo. L’upload fichier via Supabase est disponible si vous configurez{" "}
          <code className="rounded bg-[var(--muted)] px-1">NEXT_PUBLIC_SUPABASE_*</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="text-sm">
      <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Logo</span>
      <input type="hidden" name="logo_url" value={logoUrl} />
      <input type="file" accept="image/*" onChange={(ev) => void onFile(ev)} disabled={busy} className="text-xs" />
      {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
      {logoUrl ? (
        <p className="mt-1 text-xs text-emerald-700">
          Logo prêt
          <img src={logoUrl} alt="" className="mt-1 h-12 w-auto rounded border" />
        </p>
      ) : null}
    </div>
  );
}
