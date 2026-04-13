import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api';

export default function ClientsScreen() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadClients = useCallback(async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      const { data } = await api.get('/clients', { params });
      setClients(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search]);

  useEffect(() => { loadClients(); }, [loadClients]);

  const renderClient = ({ item }: { item: any }) => (
    <TouchableOpacity testID={`client-item-${item.id}`} style={styles.card} onPress={() => router.push(`/clients/${item.id}`)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.nom || '?')[0].toUpperCase()}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.nom} {item.prenom || ''}</Text>
        <Text style={styles.cardSub}>{item.email || item.tel || 'Aucun contact'}</Text>
      </View>
      <View style={[styles.typeBadge, item.type === 'professionnel' ? styles.typePro : styles.typeParticulier]}>
        <Text style={styles.typeText}>{item.type === 'professionnel' ? 'Pro' : 'Part.'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Clients</Text>
        <TouchableOpacity testID="create-client-btn" style={styles.addBtn} onPress={() => router.push('/clients/create')}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} />
        <TextInput testID="clients-search-input" style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Rechercher un client..." placeholderTextColor={Colors.textSecondary} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => item.id}
          renderItem={renderClient}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadClients(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>Aucun client</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/clients/create')}>
                <Text style={styles.emptyBtnText}>Ajouter un client</Text>
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
  list: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '18', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  cardSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typePro: { backgroundColor: Colors.info + '18' },
  typeParticulier: { backgroundColor: Colors.draft + '18' },
  typeText: { fontSize: 11, fontWeight: '700', color: Colors.textPrimary },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, marginTop: 12 },
  emptyBtn: { marginTop: 16, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  emptyBtnText: { color: '#FFF', fontWeight: '700' },
});
