"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { cx } from "@/lib/utils";

type ThemeChoice = "light" | "dark" | "system";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const active: ThemeChoice = (theme as ThemeChoice) || "system";
  const effective = resolvedTheme === "dark" ? "dark" : "light";

  const base =
    "gap-2 border border-slate-200 bg-white/70 text-slate-800 hover:bg-white dark:border-slate-800 dark:bg-gray-950/40 dark:text-slate-100 dark:hover:bg-gray-950/70";
  const on =
    "border-transparent bg-[color:var(--primary)] text-white hover:bg-[color:var(--primary)]/90 dark:bg-[color:var(--primary)] dark:text-white";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setTheme("light")}
          className={cx(base, active === "light" ? on : "")}
          aria-pressed={active === "light"}
        >
          <Sun className="size-4" aria-hidden />
          Clair
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setTheme("dark")}
          className={cx(base, active === "dark" ? on : "")}
          aria-pressed={active === "dark"}
        >
          <Moon className="size-4" aria-hidden />
          Sombre
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setTheme("system")}
          className={cx(base, active === "system" ? on : "")}
          aria-pressed={active === "system"}
        >
          <Monitor className="size-4" aria-hidden />
          Système
        </Button>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300">
        {mounted ? (
          <>
            Thème actuel : <span className="font-medium">{effective === "dark" ? "Sombre" : "Clair"}</span>
            {active === "system" ? " (selon l’appareil)" : null}.
          </>
        ) : (
          "Thème actuel : …"
        )}
      </p>
    </div>
  );
}

