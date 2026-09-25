import { AdminAffiliationClient } from "@/components/affiliate/AdminAffiliationClient";
import { isAffiliateAdmin } from "@/lib/affiliate/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Admin affiliation — Flowo" };

export default async function AdminAffiliationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/affiliation");
  if (!isAffiliateAdmin(user.email)) redirect("/compte");

  return <AdminAffiliationClient />;
}
