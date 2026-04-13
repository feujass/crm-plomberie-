import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, StatusColors, StatusLabels } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api';

const STATUTS = ['', 'brouillon', 'envoye', 'accepte', 'refuse'];
const STATUT_LABELS = ['Tous', 'Brouillon', 'Envoyé', 'Accepté', 'Refusé'];

export default function DevisListScreen() {
  const router = useRouter();
  const [devis, setDevis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(0);

  const loadDevis = useCallback(async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (STATUTS[activeFilter]) params.statut = STATUTS[activeFilter];
      const { data } = await api.get('/devis', { params });
      setDevis(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search, activeFilter]);

  useEffect(() => { loadDevis(); }, [loadDevis]);

  const renderDevis = ({ item }: { item: any }) => {
    const sc = StatusColors[item.statut] || StatusColors.brouillon;
    return (
      <TouchableOpacity testID={`devis-item-${item.id}`} style={styles.card} onPress={() => router.push(`/devis/${item.id}`)}>
        <View style={styles.cardTop}>
          <Text style={styles.cardNum}>{item.numero}</Text>
          <View style={[styles.badge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.badgeText, { color: sc.text }]}>{StatusLabels[item.statut] || item.statut}</Text>
          </View>
        </View>
        <Text style={styles.cardClient}>{item.client_nom || 'Sans client'}</Text>
        <View style={styles.cardBottom}>
          <Text style={styles.cardDate}>{item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR') : ''}</Text>
          <Text style={styles.cardAmount}>{(item.total_ttc || 0).toLocaleString('fr-FR')}€ TTC</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Devis</Text>
        <TouchableOpacity testID="create-devis-btn" style={styles.addBtn} onPress={() => router.push('/devis/create')}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} />
        <TextInput testID="devis-search-input" style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Rechercher..." placeholderTextColor={Colors.textSecondary} />
      </View>

      <FlatList
        horizontal
        data={STATUT_LABELS}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={[styles.filterChip, activeFilter === index && styles.filterChipActive]} onPress={() => setActiveFilter(index)}>
            <Text style={[styles.filterText, activeFilter === index && styles.filterTextActive]}>{item}</Text>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={devis}
          keyExtractor={(item) => item.id}
          renderItem={renderDevis}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDevis(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>Aucun devis</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/devis/create')}>
                <Text style={styles.emptyBtnText}>Créer votre premier devis</Text>
              </TouchableOpacity>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  title: { fontSize: 28, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, margin: Spacing.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 15, color: Colors.textPrimary },
  filterRow: { paddingHorizontal: Spacing.md, gap: 8, paddingBottom: Spacing.sm },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#FFF' },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  card: { backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardNum: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardClient: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  cardDate: { fontSize: 13, color: Colors.textSecondary },
  cardAmount: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, marginTop: 12 },
  emptyBtn: { marginTop: 16, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  emptyBtnText: { color: '#FFF', fontWeight: '700' },
});
