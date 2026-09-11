import Link from "next/link";

export function LegalFooterLinks({ className }: { className?: string }) {
  return (
    <nav className={className} aria-label="Informations légales">
      <Link href="/legal/cgu" className="hover:text-[color:var(--primary)] hover:underline">
        CGU
      </Link>
      <Link href="/legal/sous-traitance" className="hover:text-[color:var(--primary)] hover:underline">
        Sous-traitance
      </Link>
      <Link href="/legal/confidentialite" className="hover:text-[color:var(--primary)] hover:underline">
        Confidentialité
      </Link>
      <Link href="/legal/cookies" className="hover:text-[color:var(--primary)] hover:underline">
        Cookies
      </Link>
      <Link href="/legal/mentions" className="hover:text-[color:var(--primary)] hover:underline">
        Mentions
      </Link>
    </nav>
  );
}
