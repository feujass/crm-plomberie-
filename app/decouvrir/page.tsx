import { redirect } from "next/navigation";

/** Alias public vers la page de découverte avec aperçus. */
export default function DecouvrirPage() {
  redirect("/#apercu");
}
