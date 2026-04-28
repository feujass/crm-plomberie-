import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppHeader } from "../components/AppHeader";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { colors } from "../theme/colors";

type Ouvrage = {
  id: string;
  nom: string;
  description: string | null;
  type: string;
  prix_ht: number;
  unite: string;
  tva: number;
};

function typeIcon(type: string) {
  if (type === "fourniture") return "📦";
  if (type === "main_oeuvre") return "🔨";
  return "📋";
}

export function OuvragesScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Ouvrage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("ouvrages")
      .select("id, nom, description, type, prix_ht, unite, tva")
      .eq("user_id", user.id)
      .order("nom", { ascending: true });
    if (error) setRows([]);
    else setRows((data ?? []) as Ouvrage[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.root}>
      <AppHeader />
      <View style={styles.body}>
        <Text style={styles.title}>Bibliothèque personnelle</Text>
        <Text style={styles.sub}>Tous vos ouvrages, réunis et prêts à être utilisés dans vos devis.</Text>

        <View style={styles.actions}>
          <Pressable style={styles.btnPrimary} onPress={() => Alert.alert("Bientôt", "Création d’ouvrage depuis l’app.")}>
            <Text style={styles.btnPrimaryTxt}>+ Ajouter</Text>
          </Pressable>
          <Pressable style={styles.btnOutline} onPress={() => Alert.alert("Bientôt", "Import depuis l’app web pour l’instant.")}>
            <Text style={styles.btnOutlineTxt}>Importer</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Commencez avec des exemples</Text>
        <Text style={styles.sectionSub}>
          Trois types : main d’œuvre, fourniture, ouvrage. Ajoutez les vôtres depuis le web ou ici (bientôt).
        </Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            contentContainerStyle={rows.length === 0 ? styles.emptyWrap : { paddingBottom: 24 }}
            ListEmptyComponent={<Text style={styles.empty}>Aucun ouvrage — créez-en sur le web ou attendez l’éditeur mobile.</Text>}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{item.nom}</Text>
                {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
                <View style={styles.priceRow}>
                  <Text style={styles.price}>
                    {Number(item.prix_ht).toFixed(2)} € / {item.unite}
                  </Text>
                  <Text style={styles.badge}>{typeIcon(item.type)}</Text>
                </View>
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
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  sub: { fontSize: 14, color: colors.textMuted, marginTop: 8, marginBottom: 16 },
  actions: { flexDirection: "row", gap: 10, marginBottom: 20 },
  btnPrimary: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnPrimaryTxt: { color: colors.textOnPrimary, fontWeight: "800" },
  btnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnOutlineTxt: { fontWeight: "700", color: colors.text },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  sectionSub: { fontSize: 13, color: colors.textMuted, marginTop: 6, marginBottom: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  cardDesc: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  priceRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 12,
  },
  price: { fontWeight: "800", color: colors.primaryDark, fontSize: 15 },
  badge: { fontSize: 20 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 20 },
  emptyWrap: { flexGrow: 1 },
});
