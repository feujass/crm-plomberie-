import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/theme';
import { Platform, View, StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          tabBarTestID: 'nav-accueil',
        }}
      />
      <Tabs.Screen
        name="devis"
        options={{
          title: 'Devis',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
          tabBarTestID: 'nav-devis',
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
          tabBarTestID: 'nav-clients',
        }}
      />
      <Tabs.Screen
        name="catalogue"
        options={{
          title: 'Catalogue',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
          tabBarTestID: 'nav-catalogue',
        }}
      />
      <Tabs.Screen
        name="factures"
        options={{
          title: 'Factures',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />,
          tabBarTestID: 'nav-factures',
        }}
      />
    </Tabs>
  );
}
