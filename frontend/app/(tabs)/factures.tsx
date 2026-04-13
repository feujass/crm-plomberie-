import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, StatusColors, StatusLabels } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api';

export default function FacturesScreen() {
  const router = useRouter();
  const [factures, setFactures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFactures = useCallback(async () => {
    try {
      const { data } = await api.get('/factures');
      setFactures(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadFactures(); }, [loadFactures]);

  const renderFacture = ({ item }: { item: any }) => {
    const sc = StatusColors[item.statut] || StatusColors.emise;
    return (
      <TouchableOpacity testID={`facture-item-${item.id}`} style={styles.card} onPress={() => router.push(`/factures/${item.id}`)}>
        <View style={styles.cardTop}>
          <Text style={styles.cardNum}>{item.numero}</Text>
          <View style={[styles.badge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.badgeText, { color: sc.text }]}>{StatusLabels[item.statut] || item.statut}</Text>
          </View>
        </View>
        <Text style={styles.cardClient}>{item.client_nom || 'Sans client'}</Text>
        <View style={styles.cardBottom}>
          <Text style={styles.cardDate}>{item.date_emission ? new Date(item.date_emission).toLocaleDateString('fr-FR') : ''}</Text>
          <Text style={styles.cardAmount}>{(item.total_ttc || 0).toLocaleString('fr-FR')}€</Text>
        </View>
        {item.montant_paye > 0 && (
          <View style={styles.paidRow}>
            <Text style={styles.paidText}>Payé: {item.montant_paye.toLocaleString('fr-FR')}€</Text>
            <Text style={styles.dueText}>Reste: {((item.total_ttc || 0) - (item.montant_paye || 0)).toLocaleString('fr-FR')}€</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Factures</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={factures}
          keyExtractor={(item) => item.id}
          renderItem={renderFacture}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFactures(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>Aucune facture</Text>
              <Text style={styles.emptyHint}>Les factures sont créées à partir des devis acceptés</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  title: { fontSize: 28, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },
  list: { padding: Spacing.md, paddingBottom: 100 },
  card: { backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardNum: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardClient: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  cardDate: { fontSize: 13, color: Colors.textSecondary },
  cardAmount: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  paidRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  paidText: { fontSize: 13, color: Colors.success, fontWeight: '600' },
  dueText: { fontSize: 13, color: Colors.error, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, marginTop: 12 },
  emptyHint: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
});
