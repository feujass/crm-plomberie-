import { InternalDevClient } from "@/app/dev/internal/InternalDevClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dev — Trafic interne",
  robots: { index: false, follow: false },
};

export default function InternalDevPage() {
  return <InternalDevClient />;
}
