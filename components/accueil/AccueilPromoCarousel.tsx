"use client";

import { Bell, CalendarDays, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { getWhatsAppBusinessDigits } from "@/lib/whatsapp-public";
import { cx } from "@/lib/utils";

/** Défilement automatique du carrousel (ms) — volontairement long pour ne pas distraire à la lecture. */
const AUTO_MS = 20_000;

/** Texte passé dans le paramètre `text` du lien wa.me — déclenche la réponse du bot WhatsApp Business. */
const WHATSAPP_INTRO_MESSAGE = "Bonjour, je souhaite faire mes devis depuis WhatsApp";

const slideClass =
  "flex w-full min-h-[21rem] shrink-0 snap-center flex-col rounded-2xl border border-[color:var(--primary)]/15 bg-[var(--card)] p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] dark:border-white/10 lg:min-h-[24rem] lg:p-7";

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

function WhatsAppSlide({ slideRef }: { slideRef: RefObject<HTMLElement | null> }) {
  const business = getWhatsAppBusinessDigits();
  const waHref = business
    ? `https://wa.me/${business}?text=${encodeURIComponent(WHATSAPP_INTRO_MESSAGE)}`
    : null;

  return (
    <section
      ref={slideRef}
      className={slideClass}
      aria-labelledby="accueil-wa-title"
    >
      <h3 id="accueil-wa-title" className="text-center text-lg font-bold text-[var(--foreground)]">
        Rédigez vos devis depuis
      </h3>
      <div className="mt-4 flex flex-col items-center gap-1">
        <WhatsAppGlyph className="size-14 text-[#25D366]" aria-hidden />
        <span className="text-xl font-semibold text-[#25D366]">WhatsApp</span>
      </div>

      {!business ? (
        <div className="mt-6 space-y-3 text-center">
          <p className="inline-flex rounded-full border border-[color:var(--primary)]/25 bg-[color:var(--primary)]/5 px-3 py-1 text-xs font-semibold text-[color:var(--primary)]">
            Bientôt disponible
          </p>
          <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
            Rédigez vos devis depuis WhatsApp avec l&apos;assistant Flowo — cette fonctionnalité sera activée dans une{" "}
            <strong className="font-semibold text-[var(--foreground)]">prochaine mise à jour</strong>.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <p className="text-center text-sm text-[var(--muted-foreground)]">
            Ouvre une discussion avec l&apos;assistant Flowo sur WhatsApp. Le message ci-dessous est déjà prêt à
            l&apos;envoi pour que le bot vous réponde (menus, boutons, etc.).
          </p>
          <blockquote className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2.5 text-center text-sm italic text-[var(--foreground)]">
            «&nbsp;{WHATSAPP_INTRO_MESSAGE}&nbsp;»
          </blockquote>
          <a
            href={waHref ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-[color:var(--primary)] bg-[var(--card)] px-4 text-center text-base font-semibold text-[color:var(--primary)] shadow-sm transition hover:bg-[color:var(--primary)]/5 active:opacity-90"
          >
            Ouvrir la conversation
          </a>
        </div>
      )}
    </section>
  );
}

function ZeusContactSlide({ slideRef }: { slideRef: RefObject<HTMLElement | null> }) {
  return (
    <section ref={slideRef} className={cx(slideClass, "items-center justify-center text-center")}>
      <div className="flex w-full max-w-xs flex-col items-center">
        <Bell className="size-8 shrink-0 text-[color:var(--primary)]" aria-hidden />
        <h3 className="mt-3 font-bold text-[var(--foreground)]">Restez en contact avec Zeus !</h3>
        <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">en activant les notifications</p>
        <ul className="mt-5 w-full space-y-4 text-sm text-[var(--foreground)]">
          <li className="flex items-start justify-center gap-3 text-left">
            <Zap className="mt-0.5 size-5 shrink-0 text-[color:var(--primary)]" aria-hidden />
            <span>On vous prévient dès que le devis est prêt</span>
          </li>
          <li className="flex items-start justify-center gap-3 text-left">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-[color:var(--primary)]" aria-hidden />
            <span>On vous fait penser à relancer vos clients</span>
          </li>
        </ul>
      </div>
    </section>
  );
}

export function AccueilPromoCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slide0Ref = useRef<HTMLElement>(null);
  const slide1Ref = useRef<HTMLElement>(null);
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeDot, setActiveDot] = useState(0);

  const scrollToSlide = useCallback((i: 0 | 1) => {
    const sc = scrollerRef.current;
    const el = i === 0 ? slide0Ref.current : slide1Ref.current;
    indexRef.current = i;
    setActiveDot(i);
    if (!sc || !el) return;
    const targetLeft =
      el.offsetLeft - Math.max(0, Math.floor((sc.clientWidth - el.offsetWidth) / 2));
    sc.scrollTo({ left: targetLeft, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;

    const armInterval = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        const next: 0 | 1 = indexRef.current === 0 ? 1 : 0;
        scrollToSlide(next);
      }, AUTO_MS);
    };

    armInterval();

    let debounce: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const max = sc.scrollWidth - sc.clientWidth;
        if (max > 0) {
          const i: 0 | 1 = sc.scrollLeft > max * 0.45 ? 1 : 0;
          indexRef.current = i;
          setActiveDot(i);
        }
        armInterval();
      }, 160);
    };

    sc.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimeout(debounce);
      sc.removeEventListener("scroll", onScroll);
    };
  }, [scrollToSlide]);

  return (
    <div className="w-full">
      <div
        ref={scrollerRef}
        role="region"
        aria-roledescription="carrousel"
        aria-label="Conseils Flowo : notifications et WhatsApp"
        className={cx(
          "flex w-full max-w-full snap-x snap-mandatory gap-0 overflow-x-auto scroll-smooth overscroll-x-contain pb-1",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        <ZeusContactSlide slideRef={slide0Ref} />
        <WhatsAppSlide slideRef={slide1Ref} />
      </div>
      <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
        <span
          className={cx(
            "h-1.5 w-1.5 rounded-full transition-colors",
            activeDot === 0 ? "bg-[color:var(--primary)]" : "bg-[var(--muted-foreground)]/35",
          )}
        />
        <span
          className={cx(
            "h-1.5 w-1.5 rounded-full transition-colors",
            activeDot === 1 ? "bg-[color:var(--primary)]" : "bg-[var(--muted-foreground)]/35",
          )}
        />
      </div>
    </div>
  );
}
