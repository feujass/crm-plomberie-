import Image from "next/image";
import Link from "next/link";

import { AccueilPromoCarousel } from "@/components/accueil/AccueilPromoCarousel";

const ZEUS_AVATAR = "/zeus-avatar.png";

function parisHour(): number {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    hour: "numeric",
    hour12: false,
    timeZone: "Europe/Paris",
  }).formatToParts(new Date());
  return Number(parts.find((p) => p.type === "hour")?.value ?? "12");
}

function greetingForHour(h: number): { label: string; emoji: string } {
  if (h >= 5 && h < 18) return { label: "Bonjour", emoji: "👋" };
  return { label: "Bonsoir", emoji: "🌙" };
}

export function AccueilLanding({ displayName }: { displayName: string }) {
  const h = parisHour();
  const { label, emoji } = greetingForHour(h);

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-6 lg:space-y-0">
      {/* Carte bienvenue + Zeus */}
      <section className="rounded-2xl border border-[color:var(--primary)]/15 bg-[var(--card)] p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] dark:border-white/10 lg:p-8">
        <h2 className="text-balance text-center text-xl font-bold text-[var(--foreground)] md:text-2xl lg:text-left">
          {label} {displayName} {emoji}
        </h2>
        <p className="mt-2 text-center text-sm text-[var(--muted-foreground)] lg:text-left">
          Comment puis-je vous aider aujourd&apos;hui ?
        </p>
        <div className="mx-auto mt-6 flex w-44 justify-center lg:mx-0 lg:w-52">
          <div className="relative aspect-square w-full overflow-hidden rounded-full ring-2 ring-[color:var(--primary)]/25 shadow-lg">
            <Image
              src={ZEUS_AVATAR}
              alt="Zeus, votre assistant IA"
              width={360}
              height={360}
              className="h-full w-full object-cover object-[center_18%]"
              sizes="176px"
              priority
            />
          </div>
        </div>
        <Link
          href="/devis/nouveau?tab=voice"
          className="mt-8 flex min-h-12 w-full items-center justify-center rounded-xl bg-[color:var(--primary)] px-4 text-center text-base font-semibold text-white shadow-md transition hover:opacity-95 active:opacity-90 lg:max-w-sm"
        >
          Créer un devis vocal
        </Link>
      </section>

      <AccueilPromoCarousel />
    </div>
  );
}
