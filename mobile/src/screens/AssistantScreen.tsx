import type { RouteProp } from "@react-navigation/native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
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

const ZEUS_AVATAR = require("../../assets/zeus-avatar.png");

const DEFAULT_ASSISTANT = "Zeus";

const TVA_OPTIONS = [
  { value: 2.1, label: "2,1 %" },
  { value: 5.5, label: "5,5 %" },
  { value: 10, label: "10 %" },
  { value: 20, label: "20 %" },
];

const PAYS_OPTIONS: { code: string; label: string; flag: string }[] = [
  { code: "FR", label: "France", flag: "🇫🇷" },
  { code: "BE", label: "Belgique", flag: "🇧🇪" },
  { code: "CH", label: "Suisse", flag: "🇨🇭" },
  { code: "LU", label: "Luxembourg", flag: "🇱🇺" },
  { code: "DE", label: "Allemagne", flag: "🇩🇪" },
  { code: "ES", label: "Espagne", flag: "🇪🇸" },
];

const STRUCTURE_OPTIONS: { value: string; label: string }[] = [
  { value: "libre", label: "Selon le devis" },
  { value: "piece", label: "Toujours par pièce" },
  { value: "type_travaux", label: "Toujours par corps d’état" },
];

type Msg = { role: "user" | "assistant"; content: string };

function formatTva(t: string) {
  const n = parseFloat(t.replace(",", "."));
  if (!Number.isFinite(n)) return t;
  if (n === 2.1) return "2,1 %";
  if (n === 5.5) return "5,5 %";
  return `${n} %`;
}

function normalizeTvaToOption(raw: string): string {
  const n = parseFloat(String(raw).replace(",", "."));
  const match = TVA_OPTIONS.find((o) => Math.abs(o.value - n) < 0.01);
  return String(match ? match.value : 10);
}

export function AssistantScreen() {
  const route = useRoute<RouteProp<MainTabParamList, "Assistant">>();
  const navigation = useNavigation();
  const { user, profile, session, refreshProfile } = useAuth();

  const [prenom, setPrenom] = useState("");
  const [tva, setTva] = useState("10");
  const [pays, setPays] = useState("FR");
  const [sep, setSep] = useState(false);
  const [library, setLibrary] = useState(true);
  const [structure, setStructure] = useState("libre");

  const [tvaMenuOpen, setTvaMenuOpen] = useState(false);
  const [paysMenuOpen, setPaysMenuOpen] = useState(false);
  const [view, setView] = useState<"reglages" | "discuter">("reglages");
  const [autoSave, setAutoSave] = useState<"synced" | "saving" | "error">("synced");

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [formReady, setFormReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const p = route.params as { openSettings?: boolean } | undefined;
      if (p?.openSettings) {
        navigation.setParams({ openSettings: false } as never);
      }
    }, [route.params, navigation])
  );

  const lastHydratedId = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || !user) {
      lastHydratedId.current = null;
      setFormReady(false);
      return;
    }
    if (lastHydratedId.current === user.id) return;
    lastHydratedId.current = user.id;
    setPrenom(profile.prenom ?? "");
    setTva(normalizeTvaToOption(String(profile.tva_defaut ?? 10)));
    setPays(profile.pays ?? "FR");
    setSep(Boolean(profile.sep_fourniture_pose));
    setLibrary(profile.use_personal_library !== false);
    setStructure(profile.structure_devis ?? "libre");
    setFormReady(true);
  }, [profile, user]);

  const isDirty = useMemo(() => {
    if (!formReady || !profile) return false;
    const tvaN = parseFloat(tva.replace(",", "."));
    const tvaP = profile.tva_defaut ?? 10;
    return (
      (prenom || "") !== (profile.prenom ?? "") ||
      (Number.isFinite(tvaN) ? Math.abs(tvaN - tvaP) > 0.001 : true) ||
      (pays || "FR") !== (profile.pays ?? "FR") ||
      Boolean(profile.sep_fourniture_pose) !== sep ||
      (profile.use_personal_library !== false) !== library ||
      (profile.structure_devis ?? "libre") !== structure
    );
  }, [formReady, profile, prenom, tva, pays, sep, library, structure]);

  useEffect(() => {
    if (!user?.id || !profile) return;
    if (!isDirty) {
      setAutoSave("synced");
      return;
    }
    setAutoSave("saving");
    const id = setTimeout(() => {
      void (async () => {
        const tvaNum = parseFloat(tva.replace(",", "."));
        const { error } = await supabase
          .from("profiles")
          .update({
            prenom: prenom.trim() || null,
            assistant_name: profile.assistant_name?.trim() || DEFAULT_ASSISTANT,
            tva_defaut: Number.isFinite(tvaNum) ? tvaNum : 10,
            pays: pays.trim() || "FR",
            sep_fourniture_pose: sep,
            use_personal_library: library,
            structure_devis: structure,
          })
          .eq("id", user.id);
        if (error) {
          setAutoSave("error");
        } else {
          setAutoSave("synced");
          await refreshProfile();
        }
      })();
    }, 800);
    return () => clearTimeout(id);
  }, [user?.id, profile, isDirty, prenom, tva, pays, sep, library, structure, refreshProfile]);

  const displayName = profile?.assistant_name?.trim() || DEFAULT_ASSISTANT;

  const summaryLine = useMemo(() => {
    const call = prenom.trim() || "…";
    const t = formatTva(tva);
    const struct = STRUCTURE_OPTIONS.find((o) => o.value === structure)?.label ?? "—";
    const pay = PAYS_OPTIONS.find((c) => c.code === pays)?.label ?? pays;
    return `${displayName} vous appelle ${call}. TVA par défaut ${t}, pays ${pay}. Lignes de devis : ${struct}. ${
      sep ? "Fourniture et pose séparées" : "Fourniture et pose regroupées"
    }. ${library ? "Bibliothèque personnelle activée" : "Bibliothèque personnelle désactivée"}.`;
  }, [displayName, prenom, tva, pays, structure, sep, library]);

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
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Erreur réseau. Vérifiez EXPO_PUBLIC_SITE_URL (URL du Next)." },
      ]);
    }
    setSending(false);
  }

  const tvaLabel = TVA_OPTIONS.find((o) => String(o.value) === tva)?.label ?? formatTva(tva);
  const paysOpt = PAYS_OPTIONS.find((c) => c.code === pays) ?? PAYS_OPTIONS[0]!;

  return (
    <View style={styles.root}>
      <AppHeader />
      <View style={styles.segmentRow}>
        <Pressable
          style={[styles.segmentBtn, view === "reglages" && styles.segmentBtnActive]}
          onPress={() => setView("reglages")}
        >
          <Text style={[styles.segmentTxt, view === "reglages" && styles.segmentTxtActive]}>Réglages</Text>
        </Pressable>
        <Pressable
          style={[styles.segmentBtn, view === "discuter" && styles.segmentBtnActive]}
          onPress={() => setView("discuter")}
        >
          <Text style={[styles.segmentTxt, view === "discuter" && styles.segmentTxtActive]}>Discuter</Text>
        </Pressable>
      </View>

      {view === "reglages" ? (
        <ScrollView contentContainerStyle={styles.mainScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.contentCard, styles.cardPad]}>
            <View style={styles.settingsKickerRow}>
              <Text style={styles.kicker}>Personnalisation</Text>
              <Pressable
                onPress={() =>
                  Alert.alert(
                    "Assistant",
                    "Ajustez nom, TVA et structure des devis, puis discutez avec Zeus sur la plomberie et vos devis. La sauvegarde est automatique."
                  )
                }
                hitSlop={12}
              >
                <Text style={styles.infoMark} accessibilityLabel="Infos">
                  ⓘ
                </Text>
              </Pressable>
            </View>

            <Text style={styles.settingsTitle}>Personnalisez {displayName} pour qu’il travaille comme vous</Text>

            <View style={styles.summaryBox}>
              <Text style={styles.kicker}>RÉSUMÉ DES RÉGLAGES</Text>
              <Text style={styles.summaryTxt}>{summaryLine}</Text>
              <View style={styles.autoBadge}>
                {autoSave === "saving" ? (
                  <ActivityIndicator size="small" color={colors.primaryDark} />
                ) : (
                  <Text style={styles.autoBadgeCheck}>✓</Text>
                )}
                <Text style={styles.autoBadgeTxt}>
                  {autoSave === "error" ? "ERREUR DE SAUVEGARDE" : autoSave === "saving" ? "SAUVEGARDE…" : "SAUVEGARDE AUTO"}
                </Text>
              </View>
            </View>

          <Text style={styles.label}>Comment {displayName} doit-il vous appeler ?</Text>
          <Text style={styles.hint}>Prénom ou nom d’usage pour vous saluer sur les devis et dans le chat.</Text>
          <TextInput
            style={styles.field}
            value={prenom}
            onChangeText={setPrenom}
            placeholder="Ex. Julien"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Quelle est votre TVA par défaut ?</Text>
          <Text style={styles.hint}>Taux de TVA appliqué par défaut aux nouvelles lignes (France).</Text>
          <Pressable style={styles.dropdown} onPress={() => setTvaMenuOpen(true)}>
            <Text style={styles.ddFlag}>🇫🇷</Text>
            <Text style={styles.ddValue}>{tvaLabel}</Text>
            <Text style={styles.ddChev}>▾</Text>
          </Pressable>

          <Text style={styles.label}>Pays</Text>
          <Text style={styles.hint}>Influence l’ordre d’affichage et le format des montants (taux TVA inchangé si vous ajustez manuellement).</Text>
          <Pressable style={styles.dropdown} onPress={() => setPaysMenuOpen(true)}>
            <Text style={styles.ddFlag}>{paysOpt.flag}</Text>
            <Text style={styles.ddValue}>{paysOpt.label}</Text>
            <Text style={styles.ddChev}>▾</Text>
          </Pressable>

          <LabeledSwitch
            label="Séparer fourniture et pose"
            sub="Deux lignes distinctes sur les devis lorsque c’est cohérent avec votre devis."
            value={sep}
            onValueChange={setSep}
          />
          <LabeledSwitch
            label="Bibliothèque personnelle"
            sub="Suggère vos ouvrages enregistrés lors de la rédaction."
            value={library}
            onValueChange={setLibrary}
          />

          <Text style={[styles.label, { marginTop: 8 }]}>Comment structurer les lignes du devis ?</Text>
          {STRUCTURE_OPTIONS.map((o) => (
            <Pressable
              key={o.value}
              style={[styles.choice, structure === o.value && styles.choiceOn]}
              onPress={() => setStructure(o.value)}
            >
              <Text style={[styles.choiceTxt, structure === o.value && styles.choiceTxtOn]}>
                {o.label}
              </Text>
            </Pressable>
          ))}

          <View style={styles.zeusCard}>
            <View style={styles.zeusGradient}>
              <Image source={ZEUS_AVATAR} style={styles.zeusImage} resizeMode="cover" accessibilityLabel="Zeus, assistant IA" />
            </View>
            <Text style={styles.zeusName}>{displayName}</Text>
            <Text style={styles.zeusSub}>Assistant Flowo</Text>
            <Pressable style={styles.openChatCta} onPress={() => setView("discuter")}>
              <Text style={styles.openChatCtaTxt}>Discuter avec {displayName}</Text>
            </Pressable>
          </View>
        </View>
        </ScrollView>
      ) : (
        <KeyboardAvoidingView style={styles.chatPane} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}>
          <View style={styles.chatHeroBar}>
            <Image source={ZEUS_AVATAR} style={styles.chatHeroThumb} />
            <View>
              <Text style={styles.zeusNameSmall}>{displayName}</Text>
              <Text style={styles.zeusSubSmall}>En ligne</Text>
            </View>
          </View>
          <ScrollView style={styles.chatList} contentContainerStyle={styles.chatListContent} keyboardShouldPersistTaps="handled">
            {messages.length === 0 ? (
              <Text style={styles.chatEmpty}>
                Écrivez un message pour commencer. Idées : structure d’un devis, formulation client, TVA, bonnes pratiques.
              </Text>
            ) : null}
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
      )}

      <Modal visible={tvaMenuOpen} animationType="fade" transparent onRequestClose={() => setTvaMenuOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setTvaMenuOpen(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>TVA par défaut</Text>
            {TVA_OPTIONS.map((o) => (
              <Pressable
                key={o.value}
                style={[styles.modalRow, String(o.value) === tva && styles.modalRowOn]}
                onPress={() => {
                  setTva(String(o.value));
                  setTvaMenuOpen(false);
                }}
              >
                <Text style={styles.ddFlag}>🇫🇷</Text>
                <Text style={styles.modalRowTxt}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={paysMenuOpen} animationType="fade" transparent onRequestClose={() => setPaysMenuOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPaysMenuOpen(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Pays</Text>
            {PAYS_OPTIONS.map((o) => (
              <Pressable
                key={o.code}
                style={[styles.modalRow, pays === o.code && styles.modalRowOn]}
                onPress={() => {
                  setPays(o.code);
                  setPaysMenuOpen(false);
                }}
              >
                <Text style={styles.ddFlag}>{o.flag}</Text>
                <Text style={styles.modalRowTxt}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

    </View>
  );
}

function LabeledSwitch({
  label,
  sub,
  value,
  onValueChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleBlock}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hint}>{sub}</Text>
      <View style={styles.nouiRow}>
        <Text style={[styles.noui, !value && styles.nouiActive]}>Non</Text>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={colors.surface}
        />
        <Text style={[styles.noui, value && styles.nouiActive]}>Oui</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceMuted },
  segmentRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    ...Platform.select({ ios: { shadowColor: "#0f172a", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 } }),
  },
  segmentBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentTxt: { fontSize: 14, fontWeight: "700", color: colors.textMuted },
  segmentTxtActive: { color: colors.textOnPrimary },
  mainScroll: { padding: 16, paddingBottom: 40 },
  contentCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    ...Platform.select({ ios: { shadowColor: "#0f172a", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 } }),
  },
  cardPad: { padding: 16 },
  settingsKickerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kicker: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.6 },
  infoMark: { fontSize: 18, color: colors.textMuted },
  settingsTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 8, lineHeight: 24 },
  summaryBox: {
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  summaryTxt: { fontSize: 14, color: colors.text, marginTop: 8, lineHeight: 20 },
  autoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(22, 101, 52, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  autoBadgeCheck: { fontSize: 12, color: colors.primaryDark, fontWeight: "800" },
  autoBadgeTxt: { fontSize: 10, fontWeight: "800", color: colors.primaryDark, letterSpacing: 0.3 },
  label: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 12 },
  hint: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 8 },
  field: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.surface,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    backgroundColor: colors.surface,
    gap: 10,
  },
  ddFlag: { fontSize: 20 },
  ddValue: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
  ddChev: { fontSize: 16, color: colors.textMuted },
  toggleBlock: { marginTop: 16 },
  nouiRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 6,
  },
  noui: { fontSize: 15, color: colors.textMuted, fontWeight: "600", minWidth: 32, textAlign: "center" },
  nouiActive: { color: colors.primaryDark, fontWeight: "800" },
  choice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    backgroundColor: colors.surface,
  },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  choiceTxt: { fontSize: 15, fontWeight: "600", color: colors.text },
  choiceTxtOn: { color: colors.textOnPrimary, fontWeight: "700" },
  zeusCard: {
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  zeusGradient: { backgroundColor: "#f1f5f9" },
  zeusImage: { width: "100%", height: 200, backgroundColor: colors.accentMint },
  zeusName: { fontSize: 22, fontWeight: "900", color: colors.primaryDark, paddingHorizontal: 16, marginTop: 12 },
  zeusSub: { fontSize: 14, color: colors.textMuted, paddingHorizontal: 16, marginTop: 4, marginBottom: 10 },
  openChatCta: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  openChatCtaTxt: { fontSize: 16, fontWeight: "800", color: colors.textOnPrimary },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    paddingBottom: 36,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12, color: colors.text },
  modalRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, borderRadius: 12, paddingHorizontal: 8 },
  modalRowOn: { backgroundColor: "rgba(22, 101, 52, 0.1)" },
  modalRowTxt: { fontSize: 16, fontWeight: "600", color: colors.text },
  chatPane: { flex: 1, backgroundColor: colors.surfaceMuted },
  chatHeroBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: colors.surface,
  },
  chatHeroThumb: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.accentMint },
  chatEmpty: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    color: colors.text,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
  },
  zeusNameSmall: { fontSize: 18, fontWeight: "800", color: colors.primaryDark },
  zeusSubSmall: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  chatList: { flex: 1 },
  chatListContent: { padding: 16, paddingBottom: 8 },
  bubble: { maxWidth: "90%", padding: 12, borderRadius: 16, marginBottom: 10, alignSelf: "flex-start" },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: colors.primary },
  bubbleBot: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  bubbleTxt: { fontSize: 15, color: colors.text },
  bubbleTxtUser: { color: colors.textOnPrimary },
  inputRow: { flexDirection: "row", padding: 12, gap: 8, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
  },
  sendBtn: { backgroundColor: colors.primaryDark, borderRadius: 999, paddingHorizontal: 18, justifyContent: "center" },
  sendTxt: { color: colors.textOnPrimary, fontWeight: "800" },
});
