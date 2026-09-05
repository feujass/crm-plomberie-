import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppHeader } from "../components/AppHeader";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { colors } from "../theme/colors";

type DevisRow = {
  id: string;
  numero: string;
  statut: string;
  total_ttc: number;
  date_creation: string;
};

const SEGMENTS = [
  { key: "draft" as const, label: "Brouillon", statuts: ["brouillon"] },
  { key: "progress" as const, label: "En cours", statuts: ["envoye"] },
  {
    key: "done" as const,
    label: "Terminé",
    statuts: ["accepte", "refuse", "expire", "archive"],
  },
];

export function DevisScreen() {
  const { user } = useAuth();
  const [segment, setSegment] = useState<(typeof SEGMENTS)[number]["key"]>("draft");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<DevisRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const seg = SEGMENTS.find((s) => s.key === segment)!;
    let query = supabase
      .from("devis")
      .select("id, numero, statut, total_ttc, date_creation")
      .eq("user_id", user.id)
      .in("statut", seg.statuts)
      .order("date_creation", { ascending: false });

    const { data, error } = await query;
    if (error) {
      setRows([]);
      setLoading(false);
      return;
    }
    let list = (data ?? []) as DevisRow[];
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter((d) => d.numero.toLowerCase().includes(t));
    }
    setRows(list);
    setLoading(false);
  }, [user?.id, segment, q]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.root}>
      <AppHeader />
      <View style={styles.body}>
        <Text style={styles.title}>Suivi de vos devis</Text>
        <TextInput
          style={styles.search}
          placeholder="Rechercher…"
          placeholderTextColor={colors.textMuted}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => void load()}
        />
        <View style={styles.segWrap}>
          {SEGMENTS.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => setSegment(s.key)}
              style={[styles.segBtn, segment === s.key && styles.segBtnActive]}
            >
              <Text style={[styles.segTxt, segment === s.key && styles.segTxtActive]}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            contentContainerStyle={rows.length === 0 ? styles.emptyWrap : undefined}
            ListEmptyComponent={<Text style={styles.empty}>Aucun devis</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.rowNum}>{item.numero}</Text>
                <Text style={styles.rowMeta}>{item.statut}</Text>
                <Text style={styles.rowPrice}>{Number(item.total_ttc).toFixed(2)} € TTC</Text>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceMuted },
  body: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: "800", color: colors.primaryDark, marginBottom: 12 },
  search: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  segWrap: { flexDirection: "row", borderRadius: 14, borderWidth: 1, borderColor: colors.primary, overflow: "hidden", marginBottom: 16 },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: "center", backgroundColor: colors.surface },
  segBtnActive: { backgroundColor: colors.accentMint },
  segTxt: { fontSize: 13, fontWeight: "600", color: colors.primary },
  segTxtActive: { color: colors.primaryDark },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowNum: { fontWeight: "800", fontSize: 16, color: colors.text },
  rowMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4, textTransform: "capitalize" },
  rowPrice: { fontSize: 15, fontWeight: "700", color: colors.primaryDark, marginTop: 6 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40, fontSize: 16 },
  emptyWrap: { flexGrow: 1 },
});
