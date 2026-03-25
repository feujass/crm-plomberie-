const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _supabase;

const getSupabase = () => {
  if (!_supabase) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
    }
    _supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _supabase;
};

const ensureSingleUser = async () => {
  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", "CRMplomberie")
    .maybeSingle();
  if (existing) return existing.id;
  const passwordHash = await bcrypt.hash("911schepor", 10);
  const { data: created, error } = await supabase
    .from("users")
    .insert({ name: "CRM Plomberie", email: "CRMplomberie", password_hash: passwordHash })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
};

const cleanupDemoDataOnce = async (userId) => {
  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from("meta")
    .select("value")
    .eq("key", "cleaned_demo")
    .maybeSingle();
  if (existing) return;
  await supabase.from("quotes").delete().eq("user_id", userId);
  await supabase.from("projects").delete().eq("user_id", userId);
  await supabase.from("notifications").delete().eq("user_id", userId);
  await supabase.from("clients").delete().eq("user_id", userId);
  await supabase.from("meta").upsert({ key: "cleaned_demo", value: "true" });
};

const resetUserData = async (userId) => {
  const supabase = getSupabase();
  await supabase.from("quotes").delete().eq("user_id", userId);
  await supabase.from("projects").delete().eq("user_id", userId);
  await supabase.from("notifications").delete().eq("user_id", userId);
  await supabase.from("clients").delete().eq("user_id", userId);
};

module.exports = {
  getSupabase,
  ensureSingleUser,
  cleanupDemoDataOnce,
  resetUserData,
};
