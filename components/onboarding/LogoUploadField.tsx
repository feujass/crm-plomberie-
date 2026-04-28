"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function LogoUploadField() {
  const [logoUrl, setLogoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErr("Non connecté");
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
    setBusy(false);
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
