"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSubMenu,
  DropdownMenuSubMenuContent,
  DropdownMenuSubMenuTrigger,
  DropdownMenuTrigger,
} from "@/components/planner/DropdownMenu";
import { Button } from "@/components/ui/Button";
import { cx, focusRing } from "@/lib/utils";
import { ChevronsUpDown, LogOut, Monitor, Moon, Sun, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import * as React from "react";

function initials(prenom: string | null | undefined, email: string | null | undefined) {
  const p = (prenom ?? "").trim();
  if (p.length >= 2) return p.slice(0, 2).toUpperCase();
  const e = (email ?? "").split("@")[0] ?? "";
  if (e.length >= 2) return e.slice(0, 2).toUpperCase();
  return "?";
}

export function PlombiUserProfile({
  prenom,
  email,
}: {
  prenom?: string | null;
  email?: string | null;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  };

  if (!mounted) {
    return (
      <div className="border-t border-gray-200 p-3 dark:border-gray-800">
        <div className="flex items-center gap-3 rounded-md px-1 py-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            {initials(prenom, email)}
          </span>
          <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-50">
            {prenom || email || "…"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-800">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Compte et réglages"
            variant="ghost"
            className={cx(
              "group flex h-auto w-full items-center justify-between rounded-md px-1 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200/50 data-[state=open]:bg-gray-200/50 hover:dark:bg-gray-800/50 data-[state=open]:dark:bg-gray-900",
              focusRing,
            )}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                aria-hidden
              >
                {initials(prenom, email)}
              </span>
              <span className="truncate text-left">{prenom || email || "Compte"}</span>
            </span>
            <ChevronsUpDown
              className="size-4 shrink-0 text-gray-500 group-hover:text-gray-700 group-hover:dark:text-gray-400"
              aria-hidden
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="sm:!min-w-[calc(var(--radix-dropdown-menu-trigger-width))]">
          <DropdownMenuLabel className="truncate">{email || "Utilisateur"}</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuSubMenu>
              <DropdownMenuSubMenuTrigger>Thème</DropdownMenuSubMenuTrigger>
              <DropdownMenuSubMenuContent>
                <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v)}>
                  <DropdownMenuRadioItem aria-label="Mode clair" value="light" iconType="check">
                    <Sun className="size-4 shrink-0" aria-hidden />
                    Clair
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem aria-label="Mode sombre" value="dark" iconType="check">
                    <Moon className="size-4 shrink-0" aria-hidden />
                    Sombre
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem aria-label="Thème système" value="system" iconType="check">
                    <Monitor className="size-4 shrink-0" aria-hidden />
                    Système
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubMenuContent>
            </DropdownMenuSubMenu>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push("/compte")} className="cursor-pointer gap-2">
              <UserCircle className="size-4 shrink-0" aria-hidden />
              Mon compte
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void signOut()} className="cursor-pointer gap-2">
            <LogOut className="size-4 shrink-0" aria-hidden />
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
