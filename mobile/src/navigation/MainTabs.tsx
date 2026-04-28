import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { StyleSheet, Text } from "react-native";
import { AssistantScreen } from "../screens/AssistantScreen";
import { DevisScreen } from "../screens/DevisScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { OuvragesScreen } from "../screens/OuvragesScreen";
import { colors } from "../theme/colors";

export type MainTabParamList = {
  Accueil: undefined;
  Devis: undefined;
  Ouvrages: undefined;
  Assistant: { openSettings?: boolean } | undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function tabLabel(focused: boolean, label: string) {
  return <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>;
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.textOnPrimary,
        tabBarInactiveTintColor: "rgba(255,255,255,0.65)",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="Accueil"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <Text style={styles.icon}>{focused ? "🏠" : "🏡"}</Text>,
          tabBarLabel: ({ focused }) => tabLabel(focused, "Accueil"),
        }}
      />
      <Tab.Screen
        name="Devis"
        component={DevisScreen}
        options={{
          tabBarIcon: ({ focused }) => <Text style={styles.icon}>{focused ? "🧾" : "📄"}</Text>,
          tabBarLabel: ({ focused }) => tabLabel(focused, "Devis"),
        }}
      />
      <Tab.Screen
        name="Ouvrages"
        component={OuvragesScreen}
        options={{
          tabBarIcon: ({ focused }) => <Text style={styles.icon}>{focused ? "📚" : "📖"}</Text>,
          tabBarLabel: ({ focused }) => tabLabel(focused, "Ouvrages"),
        }}
      />
      <Tab.Screen
        name="Assistant"
        component={AssistantScreen}
        options={{
          tabBarIcon: ({ focused }) => <Text style={styles.icon}>{focused ? "✨" : "💬"}</Text>,
          tabBarLabel: ({ focused }) => tabLabel(focused, "Assistant"),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.primaryDark,
    borderTopColor: "rgba(255,255,255,0.12)",
    paddingTop: 6,
    height: 62,
  },
  tabLabel: { color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: "600" },
  tabLabelFocused: { color: colors.textOnPrimary },
  icon: { fontSize: 22, marginBottom: -2 },
});
