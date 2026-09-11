import { requireFeature } from "@/lib/plans/require-feature";

export default async function RentabiliteLayout({ children }: { children: React.ReactNode }) {
  await requireFeature("rentabilite");
  return children;
}
