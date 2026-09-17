import { AssistantPageClient } from "@/components/assistant/AssistantPageClient";
import { ASSISTANT_DISPLAY_NAME } from "@/lib/assistant-branding";
import { backendFetch } from "@/lib/backend/server";
import type { BackendMeResponse } from "@/types/backend";

export const metadata = { title: `${ASSISTANT_DISPLAY_NAME} — Assistant IA` };

export default async function AssistantPage() {
  const me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  return <AssistantPageClient initialMe={me} />;
}
