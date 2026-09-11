import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ token: string }> };

/** Legacy Supabase URL — redirige vers la page publique Mongo `/f/[token]`. */
export default async function LegacyPublicFacturePage({ params }: PageProps) {
  const { token } = await params;
  redirect(`/f/${encodeURIComponent(token)}`);
}
