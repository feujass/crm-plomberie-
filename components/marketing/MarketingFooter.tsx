import Link from "next/link";

import { APP_NAME, CONTACT_EMAIL } from "@/lib/app-branding";
import { cx } from "@/lib/utils";

export function MarketingFooter({ plain = false }: { plain?: boolean }) {
  return (
    <footer
      className={cx(
        "px-4 py-10 md:py-12 lg:px-8 lg:py-14",
        !plain && "border-t border-slate-200 dark:border-slate-800",
      )}
    >
      <nav className="mx-auto flex max-w-lg flex-col items-center gap-4 text-sm text-slate-600 dark:text-slate-400 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-3 lg:max-w-6xl lg:justify-between lg:gap-x-8 lg:gap-y-4 lg:text-[15px]">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Une question ? Écris-nous
        </a>
        <Link href="/legal/cgu" className="hover:text-[color:var(--primary)] hover:underline">
          Conditions générales
        </Link>
        <Link href="/legal/sous-traitance" className="hover:text-[color:var(--primary)] hover:underline">
          Sous-traitance RGPD
        </Link>
        <Link href="/legal/mentions" className="hover:text-[color:var(--primary)] hover:underline">
          Mentions légales
        </Link>
        <Link href="/legal/confidentialite" className="hover:text-[color:var(--primary)] hover:underline">
          Confidentialité
        </Link>
        <Link href="/legal/cookies" className="hover:text-[color:var(--primary)] hover:underline">
          Cookies
        </Link>
      </nav>
      <p className="mt-6 text-center text-sm text-slate-500 lg:mt-8 lg:max-w-6xl lg:mx-auto">
        © {new Date().getFullYear()} {APP_NAME}
      </p>
    </footer>
  );
}
