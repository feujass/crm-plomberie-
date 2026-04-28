import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import { useAuth } from "../context/AuthContext";
import type { MainTabParamList } from "../navigation/MainTabs";
import { colors } from "../theme/colors";

type Nav = BottomTabNavigationProp<MainTabParamList, "Accueil">;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, user } = useAuth();
  const name = [profile?.prenom, profile?.nom].filter(Boolean).join(" ") || user?.email?.split("@")[0] || "vous";
  const steps = profile?.onboarding_steps_completed ?? 0;

  return (
    <View style={styles.root}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.progressCard}>
          <View style={styles.progressCircle}>
            <Text style={styles.progressNum}>
              {steps}/3
            </Text>
          </View>
          <View style={styles.progressBody}>
            <Text style={styles.progressTitle}>Prochaines étapes</Text>
            <Text style={styles.progressSub}>Complétez votre configuration</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </View>

        <Text style={styles.greet}>
          Bonjour {name}
        </Text>
        <Text style={styles.greetSub}>Comment puis-je vous aider aujourd’hui ?</Text>

        <Pressable style={styles.ctaMain} onPress={() => navigation.navigate("Devis")}>
          <Text style={styles.ctaMainTxt}>Démarrer un devis</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Restez informé</Text>
          <Text style={styles.cardSub}>Activez les notifications pour les relances et devis prêts (bientôt).</Text>
          <Pressable style={styles.ctaSecondary}>
            <Text style={styles.ctaSecondaryTxt}>Activer plus tard</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personnaliser l’assistant</Text>
          <Text style={styles.cardSub}>TVA, structure des devis, bibliothèque d’ouvrages…</Text>
          <Pressable style={styles.ctaSecondary} onPress={() => navigation.navigate("Assistant", { openSettings: true })}>
            <Text style={styles.ctaSecondaryTxt}>Personnaliser</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceMuted },
  scroll: { padding: 16, paddingBottom: 32 },
  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentMint,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.accentMintBorder,
  },
  progressCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  progressNum: { fontWeight: "800", color: colors.primaryDark, fontSize: 14 },
  progressBody: { flex: 1 },
  progressTitle: { fontWeight: "700", fontSize: 16, color: colors.text },
  progressSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  chev: { fontSize: 22, color: colors.primary, fontWeight: "300" },
  greet: { fontSize: 22, fontWeight: "800", color: colors.text },
  greetSub: { fontSize: 15, color: colors.textMuted, marginTop: 6, marginBottom: 20 },
  ctaMain: {
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  ctaMainTxt: { color: colors.textOnPrimary, fontSize: 17, fontWeight: "800" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  cardSub: { fontSize: 14, color: colors.textMuted, marginTop: 8, marginBottom: 14 },
  ctaSecondary: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  ctaSecondaryTxt: { color: colors.textOnPrimary, fontWeight: "700" },
});
