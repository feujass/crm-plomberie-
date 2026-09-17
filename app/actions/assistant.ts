"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createAssistantSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data, error } = await supabase.from("ai_chat_sessions").insert({ user_id: user.id, title: "Nouvelle conversation" }).select("id").single();

  if (error || !data) throw error;
  revalidatePath("/assistant");
  return data.id as string;
}

export async function persistAssistantMessages(sessionId: string, userContent: string, assistantContent: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  await supabase.from("ai_chat_messages").insert([
    { session_id: sessionId, role: "user", content: userContent },
    { session_id: sessionId, role: "assistant", content: assistantContent },
  ]);

  await supabase.from("ai_chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", sessionId).eq("user_id", user.id);

  revalidatePath("/assistant");
}
