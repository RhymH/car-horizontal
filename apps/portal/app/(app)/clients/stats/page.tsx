import { redirect } from "next/navigation";

// Les statistiques prospects ont leur propre section : /prospects.
// On garde cette route en redirection pour les anciens liens/marque-pages.
export default function LeadStatsRedirect() {
  redirect("/prospects");
}
