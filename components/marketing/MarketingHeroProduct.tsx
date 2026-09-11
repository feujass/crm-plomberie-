import { MarketingPreviewFrame } from "@/components/marketing/MarketingPreviewFrame";
import { DEMO_TRANSCRIPT } from "@/components/marketing/marketing-data";
import { Mic } from "lucide-react";
import Image from "next/image";

const ZEUS_AVATAR = "/zeus-avatar.png";

/** Visuel produit compact pour le hero landing. */
export function MarketingHeroProduct() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <MarketingPreviewFrame title="flowo.agency/devis/nouveau">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative size-10 shrink-0 overflow-hidden rounded-full ring-2 ring-[color:var(--primary)]/25">
              <Image src={ZEUS_AVATAR} alt="" width={40} height={40} className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Zeus écoute…</p>
              <p className="text-xs text-slate-500">Mode vocal · en direct</p>
            </div>
          </div>
          <div className="flex items-end justify-center gap-1 rounded-xl bg-[color:var(--primary)]/[0.06] px-4 py-5">
            {[18, 32, 22, 40, 28, 36, 20, 34].map((h, i) => (
              <span
                key={i}
                className="w-1.5 animate-pulse rounded-full bg-[color:var(--primary)]/70"
                style={{ height: h, animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {DEMO_TRANSCRIPT}
          </p>
          <div className="flex items-center justify-center gap-2 rounded-full bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-white">
            <Mic className="size-4" aria-hidden />
            Devis généré en 28 s
          </div>
        </div>
      </MarketingPreviewFrame>
    </div>
  );
}
