"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/planner/DropdownMenu";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { cx, focusRing } from "@/lib/utils";
import { ChevronsUpDown, LogOut, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

export function PlombiUserProfile({
  prenom,
  nom,
  email,
  avatarUrl,
}: {
  prenom?: string | null;
  nom?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  };

  const avatar = (
    <UserAvatar avatarUrl={avatarUrl} prenom={prenom} nom={nom} email={email} size="sm" initialsMax={2} />
  );

  if (!mounted) {
    return (
      <div className="border-t border-gray-200 p-3 dark:border-gray-800">
        <div className="flex items-center gap-3 rounded-md px-1 py-2">
          {avatar}
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
              {avatar}
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
