import * as Linking from "expo-linking";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";

const SUPPORT_EMAIL = "support@plombicrm.local";

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuth();
  const initial =
    (profile?.prenom?.[0] ?? profile?.nom?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.logo}>F</Text>
      <Pressable style={styles.support} onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
        <Text style={styles.supportIcon}>?</Text>
        <Text style={styles.supportTxt}>Support</Text>
      </Pressable>
      <View style={styles.avatar}>
        <Text style={styles.avatarTxt}>{initial}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.headerBg,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    textAlign: "center",
    lineHeight: 40,
    fontSize: 22,
    fontWeight: "900",
    color: colors.textOnPrimary,
    overflow: "hidden",
  },
  support: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  supportIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.15)",
    textAlign: "center",
    lineHeight: 22,
    color: colors.textOnPrimary,
    fontWeight: "700",
    overflow: "hidden",
  },
  supportTxt: { color: colors.textOnPrimary, fontWeight: "600", fontSize: 14 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontSize: 16, fontWeight: "800", color: colors.primaryDark },
});
