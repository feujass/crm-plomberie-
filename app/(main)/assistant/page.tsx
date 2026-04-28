import { AssistantPageClient } from "@/components/assistant/AssistantPageClient";
import { backendFetch } from "@/lib/backend/server";
import type { BackendMeResponse } from "@/types/backend";

export default async function AssistantPage() {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  return <AssistantPageClient initialMe={me} />;
}
