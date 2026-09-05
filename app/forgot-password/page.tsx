import { ForgotPasswordForm } from "@/components/login/ForgotPasswordForm";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const sp = await searchParams;
  const context = sp.from === "partenaire" ? "partenaire" : "crm";
  return <ForgotPasswordForm context={context} />;
}
