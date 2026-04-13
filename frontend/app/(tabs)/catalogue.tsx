import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api';

const TYPES = ['', 'main_oeuvre', 'fourniture', 'ouvrage'];
const TYPE_LABELS = ['Tous', 'Main d\'oeuvre', 'Fourniture', 'Ouvrage'];

export default function CatalogueScreen() {
  const router = useRouter();
  const [ouvrages, setOuvrages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(0);

  const loadOuvrages = useCallback(async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (TYPES[activeFilter]) params.type = TYPES[activeFilter];
      const { data } = await api.get('/ouvrages', { params });
      setOuvrages(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search, activeFilter]);

  useEffect(() => { loadOuvrages(); }, [loadOuvrages]);

  const typeIcons: Record<string, string> = { main_oeuvre: 'construct', fourniture: 'cube', ouvrage: 'build' };

  const renderOuvrage = ({ item }: { item: any }) => (
    <TouchableOpacity testID={`ouvrage-item-${item.id}`} style={styles.card} onPress={() => router.push(`/catalogue/create?edit=${item.id}`)}>
      <View style={[styles.iconBox, { backgroundColor: Colors.primary + '18' }]}>
        <Ionicons name={(typeIcons[item.type] || 'build') as any} size={20} color={Colors.primary} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.nom}</Text>
        <Text style={styles.cardDesc} numberOfLines={1}>{item.description || 'Sans description'}</Text>
      </View>
      <View style={styles.priceCol}>
        <Text style={styles.price}>{(item.prix_ht || 0).toLocaleString('fr-FR')}€</Text>
        <Text style={styles.unit}>/{item.unite || 'u'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Catalogue</Text>
        <TouchableOpacity testID="create-ouvrage-btn" style={styles.addBtn} onPress={() => router.push('/catalogue/create')}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} />
        <TextInput testID="catalogue-search-input" style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Rechercher un ouvrage..." placeholderTextColor={Colors.textSecondary} />
      </View>

      <FlatList
        horizontal
        data={TYPE_LABELS}
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
          data={ouvrages}
          keyExtractor={(item) => item.id}
          renderItem={renderOuvrage}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOuvrages(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="grid-outline" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>Aucun ouvrage dans votre catalogue</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/catalogue/create')}>
                <Text style={styles.emptyBtnText}>Ajouter un ouvrage</Text>
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
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cardDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  priceCol: { alignItems: 'flex-end' },
  price: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  unit: { fontSize: 12, color: Colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, marginTop: 12, textAlign: 'center' },
  emptyBtn: { marginTop: 16, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  emptyBtnText: { color: '#FFF', fontWeight: '700' },
});
