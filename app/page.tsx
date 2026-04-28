import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const token = (await cookies()).get("access_token")?.value;
  if (token) {
    redirect("/accueil");
  }
  redirect("/login");
}
