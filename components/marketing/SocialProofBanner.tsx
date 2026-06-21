export function SocialProofBanner() {
  return (
    <section className="w-full border-y border-border bg-muted/40 px-6 py-4">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-4 text-center text-sm text-muted-foreground sm:flex-row sm:gap-10">
        <span>⭐ Beta-testé par des plombiers en région lyonnaise</span>
        <span className="hidden sm:block">·</span>
        <span>✅ Sans engagement · Résiliable à tout moment</span>
        <span className="hidden sm:block">·</span>
        <span>🔒 Données hébergées en France</span>
      </div>
    </section>
  );
}
