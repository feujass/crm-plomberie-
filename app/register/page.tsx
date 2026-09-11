import { RegisterClient } from "@/app/register/RegisterClient";
import { pageMetadata } from "@/lib/seo/site-metadata";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Créer un compte gratuit",
  description:
    "Inscris-toi en 20 secondes — e-mail et mot de passe seulement. Essai Pro+ gratuit, sans carte bancaire.",
  path: "/register",
});

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-4 text-sm text-slate-500">
          Chargement…
        </div>
      }
    >
      <RegisterClient />
    </Suspense>
  );
}
