"use client";

import { STORAGE_REF_PREFIX } from "@/lib/security/logo-url";
import { resolveClientLogoDisplayUrl } from "@/lib/supabase/client-logo-display";
import { cx } from "@/lib/utils";
import { useEffect, useState } from "react";

function needsSignedResolve(url: string): boolean {
  return url.startsWith(STORAGE_REF_PREFIX) || url.includes("/storage/v1/object/");
}

function directDisplayUrl(url?: string | null): string | null {
  const u = url?.trim();
  if (!u) return null;
  if (u.startsWith("data:image/")) return u;
  if (u.startsWith("http") && !needsSignedResolve(u)) return u;
  return null;
}

export function userInitials(
  prenom?: string | null,
  email?: string | null,
  nom?: string | null,
  max = 2,
): string {
  const p = (prenom ?? "").trim();
  const n = (nom ?? "").trim();
  if (p && n && max >= 2) return `${p[0]}${n[0]}`.toUpperCase();
  if (p) return p.slice(0, max).toUpperCase();
  const e = (email ?? "").split("@")[0] ?? "";
  if (e) return e.slice(0, max).toUpperCase();
  return max === 1 ? "?" : "??";
}

const SIZE = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
} as const;

type UserAvatarProps = {
  avatarUrl?: string | null;
  prenom?: string | null;
  nom?: string | null;
  email?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
  /** Cercle blanc sur barre bleue mobile */
  variant?: "default" | "header";
  initialsMax?: 1 | 2;
};

export function UserAvatar({
  avatarUrl,
  prenom,
  nom,
  email,
  size = "sm",
  className,
  variant = "default",
  initialsMax,
}: UserAvatarProps) {
  const max = initialsMax ?? (size === "sm" ? 1 : 2);
  const label = userInitials(prenom, email, nom, max);
  const [displayUrl, setDisplayUrl] = useState<string | null>(() => directDisplayUrl(avatarUrl));

  useEffect(() => {
    const u = avatarUrl?.trim();
    if (!u) {
      setDisplayUrl(null);
      return;
    }
    const direct = directDisplayUrl(u);
    if (direct) {
      setDisplayUrl(direct);
      return;
    }
    let cancelled = false;
    void resolveClientLogoDisplayUrl(u).then((resolved) => {
      if (!cancelled) setDisplayUrl(resolved || null);
    });
    return () => {
      cancelled = true;
    };
  }, [avatarUrl]);

  const shell = cx(
    "relative inline-flex shrink-0 overflow-hidden rounded-full font-semibold",
    SIZE[size],
    variant === "header"
      ? "border border-white/30 bg-white/15 text-white"
      : "border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200",
    className,
  );

  if (displayUrl) {
    return (
      <span className={shell}>
        {/* eslint-disable-next-line @next/next/no-img-element -- avatar utilisateur (URL signée ou externe) */}
        <img src={displayUrl} alt="" className="size-full object-cover" />
      </span>
    );
  }

  return (
    <span className={cx(shell, "items-center justify-center")} aria-hidden>
      {label}
    </span>
  );
}
