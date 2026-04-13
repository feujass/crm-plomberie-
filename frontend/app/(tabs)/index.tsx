import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, StatusColors, StatusLabels } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/api';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/stats');
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const onRefresh = () => { setRefreshing(true); loadStats(); };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  const kpis = [
    { icon: 'document-text', label: 'Devis du mois', value: stats?.devis_du_mois || 0, color: Colors.info },
    { icon: 'checkmark-circle', label: 'Taux acceptation', value: `${stats?.taux_acceptation || 0}%`, color: Colors.success },
    { icon: 'cash', label: 'CA du mois', value: `${(stats?.ca_mois || 0).toLocaleString()}€`, color: Colors.primary },
    { icon: 'time', label: 'En attente', value: `${(stats?.montant_attente || 0).toLocaleString()}€`, color: Colors.warning },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Bonjour {user?.prenom || user?.nom || ''}</Text>
            <Text style={styles.companyHint}>PlombiCRM</Text>
          </View>
          <TouchableOpacity testID="logout-button" onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* CTA */}
        <TouchableOpacity testID="create-devis-cta" style={styles.ctaButton} onPress={() => router.push('/devis/create')} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={24} color="#FFF" />
          <Text style={styles.ctaText}>Créer un devis</Text>
        </TouchableOpacity>

        {/* KPIs */}
        <View style={styles.kpiGrid}>
          {kpis.map((kpi, i) => (
            <View key={i} style={styles.kpiCard} testID={`kpi-${i}`}>
              <View style={[styles.kpiIcon, { backgroundColor: kpi.color + '18' }]}>
                <Ionicons name={kpi.icon as any} size={20} color={kpi.color} />
              </View>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent Devis */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Derniers devis</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/devis')}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          {(stats?.recent_devis || []).length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={32} color={Colors.border} />
              <Text style={styles.emptyText}>Aucun devis pour le moment</Text>
            </View>
          ) : (
            (stats?.recent_devis || []).map((d: any, i: number) => {
              const sc = StatusColors[d.statut] || StatusColors.brouillon;
              return (
                <TouchableOpacity key={d.id || i} style={styles.devisCard} onPress={() => router.push(`/devis/${d.id}`)}>
                  <View style={styles.devisCardLeft}>
                    <Text style={styles.devisNum}>{d.numero}</Text>
                    <Text style={styles.devisClient}>{d.client_nom || 'Sans client'}</Text>
                  </View>
                  <View style={styles.devisCardRight}>
                    <Text style={styles.devisMontant}>{(d.total_ttc || 0).toLocaleString()}€</Text>
                    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.badgeText, { color: sc.text }]}>{StatusLabels[d.statut] || d.statut}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Relances */}
        {(stats?.relances || []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Relances à faire</Text>
            {stats.relances.map((d: any, i: number) => (
              <View key={i} style={styles.relanceCard}>
                <Ionicons name="notifications" size={18} color={Colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.relanceName}>{d.client_nom || d.numero}</Text>
                  <Text style={styles.relanceDetail}>{(d.total_ttc || 0).toLocaleString()}€ - Envoyé</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Quick stats */}
        <View style={styles.section}>
          <View style={styles.quickStatRow}>
            <Ionicons name="people" size={18} color={Colors.info} />
            <Text style={styles.quickStatText}>{stats?.client_count || 0} clients</Text>
          </View>
          <View style={styles.quickStatRow}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.quickStatText}>{(stats?.montant_impaye || 0).toLocaleString()}€ impayés</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  scroll: { padding: Spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  greeting: { fontSize: 24, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },
  companyHint: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  logoutBtn: { padding: 8 },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: 14,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
    marginBottom: Spacing.lg,
  },
  ctaText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  kpiCard: {
    width: '48%', flexGrow: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  kpiIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  kpiValue: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },
  kpiLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' },
  section: { marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  seeAll: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  emptyCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  emptyText: { color: Colors.textSecondary, marginTop: 8, fontSize: 14 },
  devisCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  devisCardLeft: {},
  devisNum: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  devisClient: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  devisCardRight: { alignItems: 'flex-end' },
  devisMontant: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  relanceCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFBEB', borderRadius: 10, padding: Spacing.md, marginTop: 6, borderWidth: 1, borderColor: '#FDE68A' },
  relanceName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  relanceDetail: { fontSize: 13, color: Colors.textSecondary },
  quickStatRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  quickStatText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
});
