import { TESTIMONIALS } from "@/components/marketing/testimonials-data";
import { cx } from "@/lib/utils";

function InitialsAvatar({ name }: { name: string }) {
  const parts = name.replace(".", "").split(" ").filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)]/15 text-lg font-bold text-[color:var(--primary)]"
      aria-hidden
    >
      {initials || "?"}
    </div>
  );
}

export function TestimonialsSection() {
  const items = TESTIMONIALS;
  const single = items.length === 1;

  const reviewsJsonLd = {
    "@context": "https://schema.org",
    "@graph": items.map((t) => ({
      "@type": "Review",
      author: { "@type": "Person", name: t.displayName },
      reviewBody: t.quote,
      itemReviewed: {
        "@type": "SoftwareApplication",
        name: "Flowo",
        applicationCategory: "BusinessApplication",
      },
    })),
  };

  return (
    <section className="border-y border-slate-200 bg-white px-4 py-14 dark:border-slate-800 dark:bg-slate-950 md:py-16 lg:px-8 lg:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsJsonLd) }} />
      <div className="mx-auto max-w-4xl lg:max-w-7xl">
        <h2 className="text-center text-2xl font-bold md:text-3xl">Ils utilisent Flowo</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-600 dark:text-slate-400">
          Utilisé par des plombiers à Lyon, Villeurbanne et Vénissieux · phase beta
        </p>

        <div className={cx("mt-10", single ? "mx-auto max-w-2xl" : "grid gap-6 md:grid-cols-2 lg:grid-cols-3")}>
          {items.map((t) => (
            <figure
              key={t.id}
              className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50/80 p-6 text-center dark:border-slate-700 dark:bg-slate-900/60"
            >
              <InitialsAvatar name={t.displayName} />
              <blockquote className="mt-4 text-base leading-relaxed text-slate-700 dark:text-slate-300">
                « {t.quote} »
              </blockquote>
              {t.highlight ? (
                <p className="mt-3 text-sm font-bold text-[color:var(--primary)]">{t.highlight}</p>
              ) : null}
              <figcaption className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{t.displayName}</span>
                {", "}
                {t.role}, {t.city}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
