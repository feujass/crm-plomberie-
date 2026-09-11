import Anthropic from "@anthropic-ai/sdk";

import { anthropicApiKey, anthropicMaxTokens, anthropicModel, formatAnthropicError } from "@/lib/llm/anthropicConfig";

export type FlowoChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type LlmOk = { ok: true; content: string };
type LlmErr = { ok: false; message: string; status: number };
export type FlowoLlmResult = LlmOk | LlmErr;

function buildSystemAndDialogue(
  systemPrompt: string,
  messages: FlowoChatMessage[],
): { system: string; dialogue: { role: "user" | "assistant"; content: string }[] } {
  const systemChunks: string[] = [];
  if (systemPrompt.trim()) systemChunks.push(systemPrompt.trim());
  const dialogue: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of messages) {
    if (m.role === "system") {
      if (m.content.trim()) systemChunks.push(m.content.trim());
    } else {
      dialogue.push({ role: m.role, content: m.content });
    }
  }
  return {
    system: systemChunks.join("\n\n"),
    dialogue,
  };
}

/** Anthropic exige une alternance user/assistant et commence en général par l’utilisateur. */
function toAnthropicMessages(
  dialogue: { role: "user" | "assistant"; content: string }[],
): Anthropic.Messages.MessageParam[] {
  const out: Anthropic.Messages.MessageParam[] = [];
  for (const m of dialogue) {
    out.push({ role: m.role, content: m.content });
  }
  if (out.length === 0) return out;
  if (out[0].role === "assistant") {
    out.unshift({ role: "user", content: "…" });
  }
  return out;
}

/** Complétion chat Zeus via Claude (Anthropic Messages API). */
export async function completeFlowoChatLlm(
  systemPrompt: string,
  messages: FlowoChatMessage[],
): Promise<FlowoLlmResult> {
  const apiKey = anthropicApiKey();
  if (!apiKey) {
    return { ok: false, message: "ANTHROPIC_API_KEY manquant", status: 500 };
  }

  const { system, dialogue } = buildSystemAndDialogue(systemPrompt, messages);
  const anthropicMessages = toAnthropicMessages(dialogue);
  if (anthropicMessages.length === 0) {
    return { ok: false, message: "messages requis", status: 400 };
  }

  const client = new Anthropic({ apiKey });

  let res;
  try {
    res = await client.messages.create({
      model: anthropicModel(),
      max_tokens: anthropicMaxTokens(),
      system: system || undefined,
      messages: anthropicMessages,
    });
  } catch (e) {
    return { ok: false, message: formatAnthropicError(e), status: 502 };
  }

  const block = res.content[0];
  const text =
    block?.type === "text" && "text" in block ? (block as { type: "text"; text: string }).text : "";
  return { ok: true, content: text };
}
