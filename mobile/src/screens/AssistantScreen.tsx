import type { RouteProp } from "@react-navigation/native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppHeader } from "../components/AppHeader";
import { useAuth } from "../context/AuthContext";
import { getApiBaseUrl } from "../lib/constants";
import { supabase } from "../lib/supabase";
import type { MainTabParamList } from "../navigation/MainTabs";
import { colors } from "../theme/colors";

type Msg = { role: "user" | "assistant"; content: string };

const STRUCTURE_OPTIONS: { value: string; label: string }[] = [
  { value: "libre", label: "Selon le devis" },
  { value: "piece", label: "Toujours par pièce" },
  { value: "type_travaux", label: "Toujours par corps d’état" },
];

export function AssistantScreen() {
  const route = useRoute<RouteProp<MainTabParamList, "Assistant">>();
  const navigation = useNavigation();
  const { user, profile, session, refreshProfile } = useAuth();
  const [mode, setMode] = useState<"chat" | "settings">("chat");

  useFocusEffect(
    useCallback(() => {
      const p = route.params as { openSettings?: boolean } | undefined;
      if (p?.openSettings) {
        setMode("settings");
        navigation.setParams({ openSettings: false } as never);
      }
    }, [route.params, navigation])
  );

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [assistantName, setAssistantName] = useState("");
  const [tva, setTva] = useState("10");
  const [pays, setPays] = useState("FR");
  const [sep, setSep] = useState(false);
  const [library, setLibrary] = useState(true);
  const [structure, setStructure] = useState("libre");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setAssistantName(profile.assistant_name ?? "Rita");
    setTva(String(profile.tva_defaut ?? 10));
    setPays(profile.pays ?? "FR");
    setSep(Boolean(profile.sep_fourniture_pose));
    setLibrary(profile.use_personal_library !== false);
    setStructure(profile.structure_devis ?? "libre");
  }, [profile]);

  async function sendChat() {
    const text = input.trim();
    if (!text || !session?.access_token) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setSending(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/assistant/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const json = (await res.json()) as { content?: string; message?: string };
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: json.message ?? "Erreur" }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: json.content ?? "" }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Erreur réseau. Vérifiez EXPO_PUBLIC_SITE_URL (URL du Next)." }]);
    }
    setSending(false);
  }

  async function saveSettings() {
    if (!user?.id) return;
    setSaving(true);
    setSaveMsg(null);
    const tvaNum = parseFloat(tva.replace(",", "."));
    const { error } = await supabase
      .from("profiles")
      .update({
        assistant_name: assistantName.trim() || "Rita",
        tva_defaut: Number.isFinite(tvaNum) ? tvaNum : 10,
        pays: pays.trim() || "FR",
        sep_fourniture_pose: sep,
        use_personal_library: library,
        structure_devis: structure,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) setSaveMsg(error.message);
    else {
      setSaveMsg("Enregistré");
      await refreshProfile();
    }
  }

  const agent = profile?.assistant_name ?? "Rita";
  const summaryParts = [
    `${agent} vous appelle ${[profile?.prenom, profile?.nom].filter(Boolean).join(" ") || "…"}`,
    `TVA ${profile?.tva_defaut ?? 10} %`,
    profile?.sep_fourniture_pose ? "sépare fourniture et pose" : "ne sépare pas fourniture et pose",
    STRUCTURE_OPTIONS.find((o) => o.value === (profile?.structure_devis ?? "libre"))?.label ?? "structure libre",
    profile?.use_personal_library !== false ? "bibliothèque personnelle activée" : "bibliothèque désactivée",
  ];

  return (
    <View style={styles.root}>
      <AppHeader />
      <View style={styles.toggleRow}>
        <Pressable style={[styles.toggleBtn, mode === "chat" && styles.toggleActive]} onPress={() => setMode("chat")}>
          <Text style={[styles.toggleTxt, mode === "chat" && styles.toggleTxtActive]}>Discussion</Text>
        </Pressable>
        <Pressable style={[styles.toggleBtn, mode === "settings" && styles.toggleActive]} onPress={() => setMode("settings")}>
          <Text style={[styles.toggleTxt, mode === "settings" && styles.toggleTxtActive]}>Réglages</Text>
        </Pressable>
      </View>

      {mode === "chat" ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.hero}>
            <Text style={styles.heroName}>{agent}</Text>
            <Text style={styles.heroSub}>Assistant Flowo — posez vos questions sur les devis et le métier.</Text>
          </View>
          <ScrollView style={styles.chatScroll} contentContainerStyle={styles.chatContent}>
            {messages.map((m, i) => (
              <View key={i} style={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubbleBot]}>
                <Text style={[styles.bubbleTxt, m.role === "user" && styles.bubbleTxtUser]}>{m.content}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Votre message…"
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
            />
            <Pressable style={styles.sendBtn} onPress={() => void sendChat()} disabled={sending}>
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendTxt}>Envoyer</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView contentContainerStyle={styles.settingsScroll}>
          <Text style={styles.kicker}>VOTRE ASSISTANT</Text>
          <Text style={styles.settingsTitle}>Personnalisez {agent}</Text>

          <View style={styles.summaryBox}>
            <Text style={styles.kicker}>RÉSUMÉ</Text>
            <Text style={styles.summaryTxt}>{summaryParts.join(" · ")}.</Text>
            <View style={styles.autoBadge}>
              <Text style={styles.autoBadgeTxt}>SAUVEGARDE MANUELLE</Text>
            </View>
          </View>

          <Text style={styles.label}>Comment doit-il vous appeler ?</Text>
          <Text style={styles.hint}>Nom utilisé dans le chat et sur les devis.</Text>
          <TextInput style={styles.field} value={assistantName} onChangeText={setAssistantName} />

          <Text style={styles.label}>TVA par défaut (%)</Text>
          <TextInput style={styles.field} keyboardType="decimal-pad" value={tva} onChangeText={setTva} />

          <Text style={styles.label}>Pays</Text>
          <TextInput style={styles.field} value={pays} onChangeText={setPays} autoCapitalize="characters" maxLength={2} />

          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.label}>Séparer fourniture et pose</Text>
              <Text style={styles.hint}>Deux lignes distinctes sur les devis.</Text>
            </View>
            <Switch value={sep} onValueChange={setSep} trackColor={{ true: colors.primaryLight }} />
          </View>

          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.label}>Bibliothèque personnelle</Text>
              <Text style={styles.hint}>Utiliser vos ouvrages enregistrés.</Text>
            </View>
            <Switch value={library} onValueChange={setLibrary} trackColor={{ true: colors.primaryLight }} />
          </View>

          <Text style={styles.label}>Structure des lignes du devis</Text>
          {STRUCTURE_OPTIONS.map((o) => (
            <Pressable
              key={o.value}
              style={[styles.choice, structure === o.value && styles.choiceOn]}
              onPress={() => setStructure(o.value)}
            >
              <Text style={[styles.choiceTxt, structure === o.value && styles.choiceTxtOn]}>{o.label}</Text>
            </Pressable>
          ))}

          {saveMsg ? <Text style={styles.saveMsg}>{saveMsg}</Text> : null}
          <Pressable style={styles.saveBtn} onPress={() => void saveSettings()} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnTxt}>Enregistrer</Text>}
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceMuted },
  flex: { flex: 1 },
  toggleRow: { flexDirection: "row", marginHorizontal: 16, marginTop: 8, gap: 8 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  toggleActive: { backgroundColor: colors.accentMint, borderColor: colors.primary },
  toggleTxt: { fontWeight: "600", color: colors.textMuted },
  toggleTxtActive: { color: colors.primaryDark },
  hero: { padding: 16, backgroundColor: colors.accentMint, marginHorizontal: 16, marginTop: 12, borderRadius: 16 },
  heroName: { fontSize: 20, fontWeight: "900", color: colors.primaryDark },
  heroSub: { marginTop: 6, fontSize: 14, color: colors.text },
  chatScroll: { flex: 1, marginTop: 8 },
  chatContent: { padding: 16, paddingBottom: 24 },
  bubble: { maxWidth: "88%", padding: 12, borderRadius: 14, marginBottom: 10 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: colors.primary },
  bubbleBot: { alignSelf: "flex-start", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  bubbleTxt: { fontSize: 15, color: colors.text },
  bubbleTxtUser: { color: colors.textOnPrimary },
  inputRow: { flexDirection: "row", padding: 12, gap: 8, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
  },
  sendBtn: { backgroundColor: colors.primaryDark, borderRadius: 12, paddingHorizontal: 16, justifyContent: "center" },
  sendTxt: { color: colors.textOnPrimary, fontWeight: "800" },
  settingsScroll: { padding: 16, paddingBottom: 40 },
  kicker: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5 },
  settingsTitle: { fontSize: 20, fontWeight: "900", color: colors.text, marginTop: 6, marginBottom: 16 },
  summaryBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTxt: { fontSize: 14, color: colors.text, marginTop: 8, lineHeight: 20 },
  autoBadge: {
    alignSelf: "flex-start",
    marginTop: 10,
    backgroundColor: colors.accentMint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  autoBadgeTxt: { fontSize: 10, fontWeight: "800", color: colors.primaryDark },
  label: { fontSize: 15, fontWeight: "800", color: colors.text, marginTop: 12 },
  hint: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 8 },
  field: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.surface,
  },
  rowBetween: { flexDirection: "row", alignItems: "center", marginTop: 16 },
  choice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    backgroundColor: colors.surface,
  },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.accentMint },
  choiceTxt: { fontSize: 15, fontWeight: "600", color: colors.text },
  choiceTxtOn: { color: colors.primaryDark },
  saveMsg: { marginTop: 16, color: colors.primaryDark, fontWeight: "600" },
  saveBtn: {
    marginTop: 20,
    backgroundColor: colors.primaryDark,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnTxt: { color: colors.textOnPrimary, fontWeight: "800", fontSize: 16 },
});
