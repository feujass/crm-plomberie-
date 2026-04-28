import { redirect } from "next/navigation";

/** Ancienne route : tout est regroupé sous /compte (hub type Renato). */
export default function ParametresPage() {
  redirect("/compte");
}
