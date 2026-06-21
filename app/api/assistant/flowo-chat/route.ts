import { backendFetch } from "@/lib/backend/server";
import { buildAssistantChatPrompt } from "@/lib/llm/artisanSystemPrompt";
import { completeFlowoChatLlm, type FlowoChatMessage } from "@/lib/llm/flowoChatCompletion";
import type { BackendMeResponse } from "@/types/backend";
import { NextResponse } from "next/server";

/** Chat assistant pour session web (cookie JWT FastAPI), sans Supabase. */
export async function POST(req: Request) {
  let me: BackendMeResponse;
  try {
    me = (await backendFetch("/api/auth/me")) as BackendMeResponse;
  } catch {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }

  const body = (await req.json()) as { messages?: FlowoChatMessage[] };
  if (!body.messages?.length) return NextResponse.json({ message: "messages requis" }, { status: 400 });

  const profile = me.profile ?? {};
  const name = profile.assistant_name || "Zeus";
  const system = buildAssistantChatPrompt(profile, name);

  try {
    const result = await completeFlowoChatLlm(system, body.messages);
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }
    return NextResponse.json({ content: result.content });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur LLM";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
