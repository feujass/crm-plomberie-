import { RegisterClient } from "@/app/register/RegisterClient";
import { Suspense } from "react";

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
