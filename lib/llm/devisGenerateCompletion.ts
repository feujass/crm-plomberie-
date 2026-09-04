import Anthropic from "@anthropic-ai/sdk";

import {
  ANTHROPIC_LLM_NOT_CONFIGURED,
  anthropicApiKey,
  anthropicMaxTokens,
  anthropicModel,
  formatAnthropicError,
} from "@/lib/llm/anthropicConfig";
import { parseLlmJson } from "@/lib/llm/parseLlmJson";

const JSON_ONLY_SUFFIX =
  "\n\nRéponds UNIQUEMENT avec un objet JSON valide, sans markdown ni texte autour.";

type DevisGenerateLlmOk = { ok: true; parsed: unknown };
type DevisGenerateLlmErr = { ok: false; message: string; status: number; code?: string };
export type DevisGenerateLlmResult = DevisGenerateLlmOk | DevisGenerateLlmErr;

type LlmOptions = { model?: string; maxTokens?: number; timeoutMs?: number };

/** Génère un devis structuré (JSON) via Claude à partir d'une description texte ou vocale. */
export async function completeDevisGenerateLlm(
  systemPrompt: string,
  userText: string,
  options?: LlmOptions,
): Promise<DevisGenerateLlmResult> {
  const apiKey = anthropicApiKey();
  if (!apiKey) {
    return {
      ok: false,
      message: ANTHROPIC_LLM_NOT_CONFIGURED,
      status: 501,
      code: "llm_not_configured",
    };
  }

  const system = systemPrompt + JSON_ONLY_SUFFIX;
  const client = new Anthropic({ apiKey });
  const model = options?.model ?? anthropicModel();
  const max_tokens = options?.maxTokens ?? anthropicMaxTokens();
  const timeoutMs = options?.timeoutMs ?? 30_000;

  let res;
  try {
    res = await client.messages.create(
      {
        model,
        max_tokens,
        system,
        messages: [{ role: "user", content: userText }],
      },
      { timeout: timeoutMs },
    );
  } catch (e) {
    const msg = formatAnthropicError(e);
    if (/timeout|timed out/i.test(msg)) {
      return { ok: false, message: "Zeus met trop de temps à répondre. Réessayez.", status: 504, code: "timeout" };
    }
    return { ok: false, message: msg, status: 502 };
  }

  const block = res.content[0];
  const raw =
    block?.type === "text" && "text" in block ? (block as { type: "text"; text: string }).text : "";
  if (!raw.trim()) {
    return { ok: false, message: "Réponse vide", status: 500 };
  }

  try {
    return { ok: true, parsed: parseLlmJson(raw) };
  } catch {
    return { ok: false, message: "JSON invalide", status: 500 };
  }
}
